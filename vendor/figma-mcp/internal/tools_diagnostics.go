package internal

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// registerDiagnosticsTools wires Category H — agent-friendly observability.
//
//   - health_check        — verify plugin connection, fonts, styles
//   - get_recent_errors   — last N internal errors (style binding fails, etc.)
//   - explain_node        — plain-English description of a node and its purpose
func registerDiagnosticsTools(s *server.MCPServer, node *Node) {

	s.AddTool(mcp.NewTool("health_check",
		mcp.WithDescription(`Verify the plugin bridge is alive and report what's available right now: current page, font families loaded, style count, variable count.

Run this as the very first call in a session to confirm the plugin is connected and ready, before issuing real work. If the plugin window is closed or the WebSocket is disconnected, this fails fast with a clear error.

Returns {ok, fileName, pageName, fontCount, styleCount, variableCount, version}.`),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		resp, err := node.Send(ctx, "health_check", nil, nil)
		return renderResponse(resp, err)
	})

	s.AddTool(mcp.NewTool("get_recent_errors",
		mcp.WithDescription(`Return the most recent internal errors logged by the plugin (e.g., failed style bindings, missing fonts, malformed variable references). Errors are kept in a small ring buffer (last 50).

Use after a confusing write_html result to see whether something silently failed. The plugin tries to be lenient (skip-on-error) — this tool surfaces what was skipped.

Returns {errors:[{tool, message, timestamp}]}.`),

		mcp.WithNumber("limit", mcp.Description("Max entries (default 20).")),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		params := map[string]interface{}{}
		if l, ok := req.GetArguments()["limit"].(float64); ok {
			params["limit"] = l
		}
		resp, err := node.Send(ctx, "get_recent_errors", nil, params)
		return renderResponse(resp, err)
	})

	s.AddTool(mcp.NewTool("explain_node",
		mcp.WithDescription(`Plain-English description of a node and its purpose, suitable for an agent's reasoning step.

The output mentions: node type, dimensions, the visual role (heading? button? container? image?), key bound styles, immediate parent context. Ideal for "what is this and what should I do with it?" questions.

Returns {nodeId, summary, role, properties}.`),

		mcp.WithString("nodeId", mcp.Required(), mcp.Description("Node to describe.")),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		nodeID, _ := req.GetArguments()["nodeId"].(string)
		nodeID = NormalizeNodeID(nodeID)
		if !ValidNodeID(nodeID) {
			return mcp.NewToolResultError(fmt.Sprintf("nodeId must use colon format, got: %s", nodeID)), nil
		}
		resp, err := node.Send(ctx, "explain_node", []string{nodeID}, nil)
		return renderResponse(resp, err)
	})
}

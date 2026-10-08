package internal

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// registerValidationTools wires Category B — Validation & Preview.
//
// These let the agent verify intent before spending tokens on a real write,
// and explain why a node ended up the size and position it did.
//
//   - validate_html      — dry-run parse, returns the would-be tree + warnings
//   - diff_node_vs_html  — compare an existing node to intended HTML
//   - explain_layout     — narrate why a node is positioned/sized as it is
func registerValidationTools(s *server.MCPServer, node *Node) {

	s.AddTool(mcp.NewTool("validate_html",
		mcp.WithDescription(`Parse an HTML string the same way write_html would, but DO NOT create any Figma nodes. Returns a structural preview (the would-be tree, sizes, font requirements) and a list of warnings (unsupported CSS, ambiguous layouts, missing fonts, etc.).

Use before write_html when:
- You're not sure if your HTML is well-formed
- You want to know which fonts/styles must be loaded
- You want a list of warnings without committing to creating nodes

Returns {tree, warnings, fontsNeeded, stylesReferenced}.`),

		mcp.WithString("html",
			mcp.Required(),
			mcp.Description("HTML string to validate. Same dialect as write_html."),
		),
		mcp.WithString("styleMapping",
			mcp.Description(`Optional styleMapping JSON, used to verify referenced styles exist.`),
		),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()
		html, _ := args["html"].(string)
		if html == "" {
			return mcp.NewToolResultError("html is required"), nil
		}
		params := map[string]interface{}{"html": html}
		if sm, ok := args["styleMapping"].(string); ok && sm != "" {
			params["styleMapping"] = sm
		}
		resp, err := node.Send(ctx, "validate_html", nil, params)
		return renderResponse(resp, err)
	})

	s.AddTool(mcp.NewTool("diff_node_vs_html",
		mcp.WithDescription(`Compare an existing Figma node to a target HTML representation and return the differences.

How it works:
1. Renders the node as HTML (same engine as get_html).
2. Parses the supplied target HTML.
3. Walks both trees in parallel and reports per-node diffs (text changed, fontSize changed, fillColor changed, position changed, etc.).
4. Returns a compact patch list that can be fed straight into update_node_props or patch_html.

Use when an existing slide is "almost right" — diff against your intended HTML to find the minimal set of changes.

Returns {diffs:[{nodeId, field, current, target}], patch:[{nodeId, props}]}.`),

		mcp.WithString("nodeId",
			mcp.Required(),
			mcp.Description("Existing node ID to compare against."),
		),
		mcp.WithString("targetHtml",
			mcp.Required(),
			mcp.Description("HTML representing the target state."),
		),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()
		nodeID, _ := args["nodeId"].(string)
		nodeID = NormalizeNodeID(nodeID)
		if !ValidNodeID(nodeID) {
			return mcp.NewToolResultError(fmt.Sprintf("nodeId must use colon format, got: %s", nodeID)), nil
		}
		html, _ := args["targetHtml"].(string)
		if html == "" {
			return mcp.NewToolResultError("targetHtml is required"), nil
		}
		resp, err := node.Send(ctx, "diff_node_vs_html", []string{nodeID}, map[string]interface{}{
			"targetHtml": html,
		})
		return renderResponse(resp, err)
	})

	s.AddTool(mcp.NewTool("explain_layout",
		mcp.WithDescription(`Explain why a node is sized and positioned the way it is, in plain English.

Walks the node and its parent chain and produces an annotated summary covering:
- Auto-layout vs. absolute positioning
- FILL / HUG / FIXED sizing modes
- Padding and itemSpacing inherited from the auto-layout context
- Constraints relative to the parent
- Bound styles and variables

Useful when a node "looks wrong" and you need to decide whether to change it via update_node_props, change its parent's layout, or restructure entirely.

Returns {nodeId, explanation:string, factors:[{name, value, source}]}.`),

		mcp.WithString("nodeId",
			mcp.Required(),
			mcp.Description("Node to explain."),
		),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()
		nodeID, _ := args["nodeId"].(string)
		nodeID = NormalizeNodeID(nodeID)
		if !ValidNodeID(nodeID) {
			return mcp.NewToolResultError(fmt.Sprintf("nodeId must use colon format, got: %s", nodeID)), nil
		}
		resp, err := node.Send(ctx, "explain_layout", []string{nodeID}, nil)
		return renderResponse(resp, err)
	})
}

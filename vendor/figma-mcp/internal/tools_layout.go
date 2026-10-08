package internal

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// registerLayoutTools wires Category C — Layout Intelligence.
//
//   - auto_layout_from_positions  — convert absolute positions to auto-layout
//   - align_nodes                 — align selected nodes by edge or center
//   - distribute_nodes            — distribute selected nodes evenly
//   - pack_grid                   — auto-pack into N×M grid
func registerLayoutTools(s *server.MCPServer, node *Node) {

	s.AddTool(mcp.NewTool("auto_layout_from_positions",
		mcp.WithDescription(`Detect the layout pattern of a frame's existing absolute children and convert them to a Figma auto-layout.

Heuristic:
- If children are roughly the same Y → horizontal row, layoutMode = HORIZONTAL.
- If children are roughly the same X → vertical column, layoutMode = VERTICAL.
- itemSpacing is inferred from the median gap between siblings.
- paddingTop/paddingLeft are inferred from the first child's offset.

Use after creating slides with absolute positioning to convert them into responsive auto-layout containers.

Returns {nodeId, applied:{layoutMode, itemSpacing, paddingTop, paddingLeft}, childOrder}.`),

		mcp.WithString("nodeId",
			mcp.Required(),
			mcp.Description("Frame whose children should be analyzed and converted."),
		),
		mcp.WithBoolean("dryRun", mcp.Description("If true, return the inferred layout without applying it.")),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()
		nodeID, _ := args["nodeId"].(string)
		nodeID = NormalizeNodeID(nodeID)
		if !ValidNodeID(nodeID) {
			return mcp.NewToolResultError(fmt.Sprintf("nodeId must use colon format, got: %s", nodeID)), nil
		}
		params := map[string]interface{}{}
		if dr, ok := args["dryRun"].(bool); ok {
			params["dryRun"] = dr
		}
		resp, err := node.Send(ctx, "auto_layout_from_positions", []string{nodeID}, params)
		return renderResponse(resp, err)
	})

	s.AddTool(mcp.NewTool("align_nodes",
		mcp.WithDescription(`Align multiple nodes along an axis.

MODES:
  - "left", "right", "center-x"      — horizontal alignment (each node's x adjusted)
  - "top", "bottom", "center-y"      — vertical alignment

The reference is the bounding box of all selected nodes by default; override by passing referenceNodeId.

Example: align 5 cards' top edges to match the topmost card.`),

		mcp.WithString("nodeIds",
			mcp.Required(),
			mcp.Description(`JSON array of node IDs to align. Example: ["1:2","1:3","1:4"]`),
		),
		mcp.WithString("mode",
			mcp.Required(),
			mcp.Description(`One of: left, right, center-x, top, bottom, center-y.`),
		),
		mcp.WithString("referenceNodeId", mcp.Description("Optional anchor node — others align to it. Defaults to bounding box of all nodes.")),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()
		idsStr, _ := args["nodeIds"].(string)
		var ids []string
		if err := json.Unmarshal([]byte(idsStr), &ids); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("nodeIds must be a JSON string array: %v", err)), nil
		}
		if len(ids) < 2 {
			return mcp.NewToolResultError("at least 2 node IDs are required"), nil
		}
		mode, _ := args["mode"].(string)
		valid := map[string]bool{
			"left": true, "right": true, "center-x": true,
			"top": true, "bottom": true, "center-y": true,
		}
		if !valid[mode] {
			return mcp.NewToolResultError(fmt.Sprintf("invalid mode %q", mode)), nil
		}
		params := map[string]interface{}{"mode": mode}
		if ref, ok := args["referenceNodeId"].(string); ok && ref != "" {
			params["referenceNodeId"] = NormalizeNodeID(ref)
		}
		resp, err := node.Send(ctx, "align_nodes", ids, params)
		return renderResponse(resp, err)
	})

	s.AddTool(mcp.NewTool("distribute_nodes",
		mcp.WithDescription(`Distribute nodes evenly along an axis.

MODES:
  - "horizontal-spacing"  — equal horizontal spacing between adjacent nodes
  - "vertical-spacing"    — equal vertical spacing
  - "horizontal-centers"  — equal horizontal distance between centers
  - "vertical-centers"    — equal vertical distance between centers

Sorts nodes by their current position before distributing.`),

		mcp.WithString("nodeIds",
			mcp.Required(),
			mcp.Description(`JSON array of node IDs.`),
		),
		mcp.WithString("mode",
			mcp.Required(),
			mcp.Description("One of: horizontal-spacing, vertical-spacing, horizontal-centers, vertical-centers."),
		),
		mcp.WithNumber("gap", mcp.Description("Optional fixed gap; if set, overrides even distribution and uses the gap between nodes instead.")),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()
		idsStr, _ := args["nodeIds"].(string)
		var ids []string
		if err := json.Unmarshal([]byte(idsStr), &ids); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("nodeIds must be a JSON string array: %v", err)), nil
		}
		if len(ids) < 3 {
			return mcp.NewToolResultError("at least 3 node IDs are required for distribution"), nil
		}
		mode, _ := args["mode"].(string)
		valid := map[string]bool{
			"horizontal-spacing": true, "vertical-spacing": true,
			"horizontal-centers": true, "vertical-centers": true,
		}
		if !valid[mode] {
			return mcp.NewToolResultError(fmt.Sprintf("invalid mode %q", mode)), nil
		}
		params := map[string]interface{}{"mode": mode}
		if g, ok := args["gap"].(float64); ok {
			params["gap"] = g
		}
		resp, err := node.Send(ctx, "distribute_nodes", ids, params)
		return renderResponse(resp, err)
	})

	s.AddTool(mcp.NewTool("pack_grid",
		mcp.WithDescription(`Auto-arrange nodes into a uniform N-column grid with consistent gaps.

The columns parameter controls grid width. Each row's height is the max height of its members. Position starts at (startX, startY) inside the parent, or at (0,0) if those are omitted.

Example: pack 12 cards into 4 columns with 24px gap → 3 rows of 4 cards each.`),

		mcp.WithString("nodeIds",
			mcp.Required(),
			mcp.Description(`JSON array of node IDs to pack. Order is preserved.`),
		),
		mcp.WithNumber("columns", mcp.Required(), mcp.Description("Number of columns.")),
		mcp.WithNumber("gap", mcp.Description("Gap (px) between cells (default 24).")),
		mcp.WithNumber("startX", mcp.Description("Top-left X (default 0).")),
		mcp.WithNumber("startY", mcp.Description("Top-left Y (default 0).")),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()
		idsStr, _ := args["nodeIds"].(string)
		var ids []string
		if err := json.Unmarshal([]byte(idsStr), &ids); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("nodeIds must be a JSON string array: %v", err)), nil
		}
		columns, _ := args["columns"].(float64)
		if columns < 1 {
			return mcp.NewToolResultError("columns must be >= 1"), nil
		}
		params := map[string]interface{}{"columns": columns}
		for _, k := range []string{"gap", "startX", "startY"} {
			if v, ok := args[k].(float64); ok {
				params[k] = v
			}
		}
		resp, err := node.Send(ctx, "pack_grid", ids, params)
		return renderResponse(resp, err)
	})
}

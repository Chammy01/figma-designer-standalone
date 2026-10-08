package internal

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// registerEditTools wires Category A — Edit-not-rewrite — tools.
//
// These solve the agent rewrite-loop problem: instead of deleting and
// re-emitting a whole HTML block when something is slightly wrong, the agent
// can target individual nodes and patch just the props that need to change.
//
// Tools registered:
//   - update_node_props      — universal property setter on one or many nodes
//   - patch_html             — selector-based patch over a subtree
//   - inspect_node_as_html   — HTML + ID outline + style summary for a node
//   - move_to_anchor         — relative positioning vs. another node
func registerEditTools(s *server.MCPServer, node *Node) {

	// ── update_node_props ────────────────────────────────────────────────────
	s.AddTool(mcp.NewTool("update_node_props",
		mcp.WithDescription(`Apply a batch of property updates across one or many nodes in a SINGLE call.

This is the single most important tool for editing existing designs. Instead of issuing separate set_fills + set_text + move_nodes + resize_nodes calls (each a separate round trip), describe all desired changes as one updates payload and the plugin will fan them out atomically.

SUPPORTED FIELDS per node (all optional):
- name              (string)
- x, y              (number) absolute position
- width, height     (number) size — calls resize()
- fillColor         (hex like #FF0080) — replaces fills with a single solid paint
- fillOpacity       (0–1) — combined with fillColor
- strokeColor       (hex) — replaces strokes
- strokeWeight      (number)
- text              (string) — only valid for TEXT nodes
- fontSize          (number)
- fontFamily        (string)
- fontWeight        ("Regular", "Bold", numeric like "500", etc.)
- opacity           (0–1)
- rotation          (degrees)
- cornerRadius      (number) uniform; for per-corner use cornerRadiusTL/TR/BR/BL
- paddingTop, paddingRight, paddingBottom, paddingLeft  (number)
- itemSpacing       (number) — gap inside auto-layout frames
- visible           (boolean)
- layoutSizingHorizontal / layoutSizingVertical  ("FILL"|"HUG"|"FIXED")
- textAutoResize    ("NONE"|"WIDTH_AND_HEIGHT"|"HEIGHT"|"TRUNCATE")

INPUT FORMAT:
updates is a JSON array. Each entry is {"nodeId": "1:2", "props": {...}}.

Example:
  [{"nodeId":"4:101","props":{"text":"New title","fontSize":48}},
   {"nodeId":"4:102","props":{"fillColor":"#FF0080","cornerRadius":12}}]

Returns {applied:N, failed:N, results:[{nodeId, success, applied:[...], error?}]}.`),

		mcp.WithString("updates",
			mcp.Required(),
			mcp.Description(`JSON array of {"nodeId":"...", "props":{...}} update entries.`),
		),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()
		updatesStr, _ := args["updates"].(string)
		if updatesStr == "" {
			return mcp.NewToolResultError("updates is required (JSON array)"), nil
		}
		var updates []interface{}
		if err := json.Unmarshal([]byte(updatesStr), &updates); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("updates must be valid JSON: %v", err)), nil
		}
		if len(updates) == 0 {
			return mcp.NewToolResultError("updates must not be empty"), nil
		}
		resp, err := node.Send(ctx, "update_node_props", nil, map[string]interface{}{
			"updates": updates,
		})
		return renderResponse(resp, err)
	})

	// ── patch_html ───────────────────────────────────────────────────────────
	s.AddTool(mcp.NewTool("patch_html",
		mcp.WithDescription(`Apply CSS-selector-style patches to existing nodes in a subtree, without rewriting them.

This is the answer to "the slide is 90% right, the title just needs to be red". Instead of regenerating the slide HTML, hand patch_html a list of {selector, props} entries and it walks the targetNodeId subtree, matches nodes by selector, and applies the props.

SELECTOR FORMS:
- "name:Title"       — exact node name match
- "name~:title"      — case-insensitive substring match on node name
- "type:TEXT"        — match by node type (FRAME, TEXT, RECTANGLE, INSTANCE, …)
- "id:4:101"         — match by node ID (rooted at the subtree)
- "*"                — match every node in the subtree (use with care)

Selectors can be combined with a pipe — "type:TEXT | name~:title" matches nodes of type TEXT whose name contains "title".

PROPS: same shape as update_node_props (see that tool for the full field list).

Example:
  patches = [
    {"selector":"name:Title", "props":{"fontSize":56, "fillColor":"#000"}},
    {"selector":"type:RECTANGLE | name~:divider", "props":{"fillColor":"#E0E0E0"}}
  ]

Returns {matched:N, applied:N, results:[{selector, nodeIds:[...], applied}]}.`),

		mcp.WithString("targetNodeId",
			mcp.Required(),
			mcp.Description("Root of the subtree to walk. Patches only apply to nodes inside this subtree."),
		),
		mcp.WithString("patches",
			mcp.Required(),
			mcp.Description(`JSON array of {"selector":"...", "props":{...}} patch entries.`),
		),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()
		targetNodeId, _ := args["targetNodeId"].(string)
		targetNodeId = NormalizeNodeID(targetNodeId)
		if !ValidNodeID(targetNodeId) {
			return mcp.NewToolResultError(fmt.Sprintf("targetNodeId must use colon format e.g. 4029:12345, got: %s", targetNodeId)), nil
		}
		patchesStr, _ := args["patches"].(string)
		if patchesStr == "" {
			return mcp.NewToolResultError("patches is required (JSON array)"), nil
		}
		var patches []interface{}
		if err := json.Unmarshal([]byte(patchesStr), &patches); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("patches must be valid JSON: %v", err)), nil
		}
		resp, err := node.Send(ctx, "patch_html", []string{targetNodeId}, map[string]interface{}{
			"patches": patches,
		})
		return renderResponse(resp, err)
	})

	// ── inspect_node_as_html ─────────────────────────────────────────────────
	s.AddTool(mcp.NewTool("inspect_node_as_html",
		mcp.WithDescription(`Return a structured HTML view of a node plus an ID outline and style summary.

Like get_html but optimized for agent consumption: alongside the HTML body you get a parallel "outline" — a tree of {nodeId, name, type, depth} entries — so you can reference any node in subsequent update_node_props or patch_html calls without round-tripping through search_nodes.

Useful as the very first step of an "edit, don't rewrite" workflow:
  1. inspect_node_as_html(slideId)  →  { html, outline, styles }
  2. (decide which node IDs to change)
  3. update_node_props([{nodeId, props}, ...])

Returns { html, outline:[{nodeId, name, type, depth, classes, layerName}], boundStyles:[{nodeId, fillStyle?, textStyle?}] }.`),

		mcp.WithString("nodeId",
			mcp.Required(),
			mcp.Description("Node ID to inspect (subtree root). Colon format e.g. '4029:12345'."),
		),
		mcp.WithNumber("depth", mcp.Description("Maximum tree depth to include in outline (default 6).")),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()
		nodeID, _ := args["nodeId"].(string)
		nodeID = NormalizeNodeID(nodeID)
		if !ValidNodeID(nodeID) {
			return mcp.NewToolResultError(fmt.Sprintf("nodeId must use colon format e.g. 4029:12345, got: %s", nodeID)), nil
		}
		params := map[string]interface{}{}
		if d, ok := args["depth"].(float64); ok {
			params["depth"] = d
		}
		resp, err := node.Send(ctx, "inspect_node_as_html", []string{nodeID}, params)
		return renderResponse(resp, err)
	})

	// ── move_to_anchor ───────────────────────────────────────────────────────
	s.AddTool(mcp.NewTool("move_to_anchor",
		mcp.WithDescription(`Move a node to align with an anchor node by edge or center, with optional offset.

Eliminates manual coordinate math. Examples:
  - "right edge of node A aligns with right edge of node B, offset 0"
  - "node A sits 24px below node B, horizontally centered"
  - "node A is to the right of node B with a 16px gap"

MODES:
  - "align-left"       — match left edges
  - "align-right"      — match right edges
  - "align-center-x"   — match horizontal centers
  - "align-top"        — match top edges
  - "align-bottom"     — match bottom edges
  - "align-center-y"   — match vertical centers
  - "above"            — place above anchor (with optional gap)
  - "below"            — place below anchor (with optional gap)
  - "left-of"          — place left of anchor (with optional gap)
  - "right-of"         — place right of anchor (with optional gap)

Returns {nodeId, x, y} after the move.`),

		mcp.WithString("nodeId",
			mcp.Required(),
			mcp.Description("Node ID to move."),
		),
		mcp.WithString("anchorId",
			mcp.Required(),
			mcp.Description("Anchor node ID to align against."),
		),
		mcp.WithString("mode",
			mcp.Required(),
			mcp.Description("One of: align-left, align-right, align-center-x, align-top, align-bottom, align-center-y, above, below, left-of, right-of."),
		),
		mcp.WithNumber("gap", mcp.Description("Optional gap (default 0). For above/below/left-of/right-of this is the distance between the edges. For align-* modes it's an additional offset along the perpendicular axis.")),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()
		nodeID, _ := args["nodeId"].(string)
		nodeID = NormalizeNodeID(nodeID)
		anchorID, _ := args["anchorId"].(string)
		anchorID = NormalizeNodeID(anchorID)
		if !ValidNodeID(nodeID) {
			return mcp.NewToolResultError(fmt.Sprintf("nodeId must use colon format, got: %s", nodeID)), nil
		}
		if !ValidNodeID(anchorID) {
			return mcp.NewToolResultError(fmt.Sprintf("anchorId must use colon format, got: %s", anchorID)), nil
		}
		mode, _ := args["mode"].(string)
		valid := map[string]bool{
			"align-left": true, "align-right": true, "align-center-x": true,
			"align-top": true, "align-bottom": true, "align-center-y": true,
			"above": true, "below": true, "left-of": true, "right-of": true,
		}
		if !valid[mode] {
			return mcp.NewToolResultError(fmt.Sprintf("invalid mode %q — see tool description for the allowed list", mode)), nil
		}
		params := map[string]interface{}{
			"anchorId": anchorID,
			"mode":     mode,
		}
		if g, ok := args["gap"].(float64); ok {
			params["gap"] = g
		}
		resp, err := node.Send(ctx, "move_to_anchor", []string{nodeID}, params)
		return renderResponse(resp, err)
	})
}

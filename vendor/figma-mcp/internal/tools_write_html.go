package internal

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

func registerWriteHTMLTools(s *server.MCPServer, node *Node) {

	// ── write_html ───────────────────────────────────────────────────────────
	s.AddTool(mcp.NewTool("write_html",
		mcp.WithDescription(`Parse an HTML string with inline CSS into Figma design nodes in a single operation.

SUPPORTED HTML ELEMENTS:
- <div> -> Frame (with auto-layout when display:flex is set)
- <p>, <span>, <h1>-<h6> -> Text nodes
- <img src="base64:..."> -> Rectangle with image fill
- <hr> -> Line/divider

SUPPORTED CSS (inline style="..." only):
- Layout: display:flex, flexDirection, justifyContent, alignItems, gap, flexWrap
- Sizing: width, height (px values)
- Spacing: padding, paddingTop/Right/Bottom/Left (px values)
- Colors: backgroundColor, color (hex #RRGGBB or #RRGGBBAA)
- Typography: fontFamily, fontSize, fontWeight, fontStyle, lineHeight, letterSpacing, textAlign
- Borders: border, borderRadius, borderColor, borderWidth
- Effects: opacity, boxShadow
- Positioning: position:absolute with top/left (relative to parent)

NOT SUPPORTED (same as Paper):
- display:grid, display:inline, margin, HTML tables

SPECIAL ATTRIBUTES:
- layer-name="..." sets the Figma layer name
- data-style-id="S:abc123" binds a Figma named style to the node
- data-text-style-id="S:abc123" binds a text style
- data-paint-style-id="S:abc123" binds a paint/fill style
- data-component-id="2:63" clones a component instead of creating a new node

STYLE MAPPING:
Use the styleMapping parameter to map CSS class names to Figma style IDs.
Example: {"heading": {"textStyleId": "S:abc", "paintStyleId": "S:def"}}
Then use class="heading" in HTML to auto-apply both styles.

Returns the created node tree with all IDs for subsequent operations.`),

		mcp.WithString("html",
			mcp.Required(),
			mcp.Description("HTML string with inline CSS styles. Elements map to Figma nodes: div->Frame, p/span/h1-h6->Text, img->Rectangle with image fill."),
		),
		mcp.WithString("targetNodeId",
			mcp.Required(),
			mcp.Description("Parent node ID to insert children into (insert-children mode) or node to replace (replace mode). Colon format e.g. '4029:12345'."),
		),
		mcp.WithString("mode",
			mcp.Description("'insert-children' (default) adds parsed HTML as children of targetNodeId. 'replace' removes targetNodeId and puts parsed HTML in its place."),
		),
		mcp.WithString("styleMapping",
			mcp.Description(`JSON object mapping CSS class names to Figma style IDs. Example: {"heading-cover": {"textStyleId": "S:abc123", "paintStyleId": "S:def456"}, "body-text": {"textStyleId": "S:ghi789", "paintStyleId": "S:jkl012"}}. Use class="heading-cover" in HTML to auto-bind styles. Each mapping entry may also include a "variables" array of {field, variableId} bindings (see B-8) — e.g. "variables":[{"field":"fillColor","variableId":"VariableID:..."}] to bind a Figma Variable to the node's fill, stroke, opacity, width, height, cornerRadius, padding*, etc.`),
		),
		mcp.WithNumber("x", mcp.Description("Optional X position for created root node(s). When omitted, nodes are placed at (0,0) inside the parent. For 'insert-children' mode this offsets the new children; for 'replace' mode this overrides the original target's position.")),
		mcp.WithNumber("y", mcp.Description("Optional Y position for created root node(s).")),
		mcp.WithBoolean("autoOffset", mcp.Description("If true (default false) and x/y are omitted, automatically place the new root next to existing siblings (last child's x + width + 80) so consecutive write_html calls don't stack on top of each other.")),
		mcp.WithString("requestId", mcp.Description("Optional idempotency key. If a previous write_html call with the same requestId already completed, the cached result is returned without recreating nodes (safe for timeout retries).")),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()
		html, _ := args["html"].(string)
		if html == "" {
			return mcp.NewToolResultError("html is required"), nil
		}

		targetNodeId, _ := args["targetNodeId"].(string)
		targetNodeId = NormalizeNodeID(targetNodeId)
		if targetNodeId == "" {
			return mcp.NewToolResultError("targetNodeId is required"), nil
		}
		if !ValidNodeID(targetNodeId) {
			return mcp.NewToolResultError(fmt.Sprintf("targetNodeId must use colon format e.g. 4029:12345, got: %s", targetNodeId)), nil
		}

		mode, _ := args["mode"].(string)
		if mode == "" {
			mode = "insert-children"
		}
		if mode != "insert-children" && mode != "replace" {
			return mcp.NewToolResultError("mode must be 'insert-children' or 'replace'"), nil
		}

		params := map[string]interface{}{
			"html":         html,
			"targetNodeId": targetNodeId,
			"mode":         mode,
		}

		// Parse styleMapping if provided
		if styleMappingStr, ok := args["styleMapping"].(string); ok && styleMappingStr != "" {
			var styleMapping map[string]interface{}
			if err := json.Unmarshal([]byte(styleMappingStr), &styleMapping); err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("styleMapping must be valid JSON: %v", err)), nil
			}
			params["styleMapping"] = styleMapping
		}

		// B-6: optional placement
		if x, ok := args["x"].(float64); ok {
			params["x"] = x
		}
		if y, ok := args["y"].(float64); ok {
			params["y"] = y
		}
		if autoOffset, ok := args["autoOffset"].(bool); ok {
			params["autoOffset"] = autoOffset
		}
		if reqID, ok := args["requestId"].(string); ok && reqID != "" {
			params["requestId"] = reqID
		}

		resp, err := node.Send(ctx, "write_html", []string{targetNodeId}, params)
		return renderResponse(resp, err)
	})

	// ── write_html_batch ─────────────────────────────────────────────────────
	s.AddTool(mcp.NewTool("write_html_batch",
		mcp.WithDescription(`Create multiple Figma frames from HTML in a single operation. Ideal for building entire carousel posts, multi-slide presentations, or any set of related frames.

Each slide in the 'slides' array becomes a separate frame with the specified dimensions. All slides share the same styleMapping for consistency.

This is dramatically more efficient than individual write_html calls — one tool call creates an entire post.

Returns an array of created frame IDs and their child node trees.`),

		mcp.WithString("slides",
			mcp.Required(),
			mcp.Description(`JSON array of slide objects. Each has: "name" (frame name), "html" (HTML content). Example: [{"name": "A3-0 Cover", "html": "<div style='...'>...</div>"}, {"name": "A3-1 Content", "html": "<div style='...'>...</div>"}]`),
		),
		mcp.WithNumber("frameWidth", mcp.Description("Width for all frames in pixels (default 1080)")),
		mcp.WithNumber("frameHeight", mcp.Description("Height for all frames in pixels (default 1350)")),
		mcp.WithString("parentId", mcp.Description("Parent node ID to contain all frames. Defaults to current page.")),
		mcp.WithString("styleMapping",
			mcp.Description(`JSON object mapping CSS class names to Figma style IDs. Applied to all slides. Example: {"heading": {"textStyleId": "S:abc", "paintStyleId": "S:def"}}`),
		),
		mcp.WithNumber("spacing", mcp.Description("Horizontal spacing between frames in pixels (default 80)")),
		mcp.WithNumber("startX", mcp.Description("X position of first frame (default 0)")),
		mcp.WithNumber("startY", mcp.Description("Y position of first frame (default 0)")),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()

		slidesStr, _ := args["slides"].(string)
		if slidesStr == "" {
			return mcp.NewToolResultError("slides is required (JSON array of {name, html} objects)"), nil
		}

		var slides []interface{}
		if err := json.Unmarshal([]byte(slidesStr), &slides); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("slides must be valid JSON array: %v", err)), nil
		}
		if len(slides) == 0 {
			return mcp.NewToolResultError("slides array must not be empty"), nil
		}

		params := map[string]interface{}{
			"slides": slides,
		}

		if w, ok := args["frameWidth"].(float64); ok {
			params["frameWidth"] = w
		}
		if h, ok := args["frameHeight"].(float64); ok {
			params["frameHeight"] = h
		}
		if pid, ok := args["parentId"].(string); ok && pid != "" {
			params["parentId"] = NormalizeNodeID(pid)
		}
		if spacing, ok := args["spacing"].(float64); ok {
			params["spacing"] = spacing
		}
		if sx, ok := args["startX"].(float64); ok {
			params["startX"] = sx
		}
		if sy, ok := args["startY"].(float64); ok {
			params["startY"] = sy
		}

		// Parse styleMapping
		if styleMappingStr, ok := args["styleMapping"].(string); ok && styleMappingStr != "" {
			var styleMapping map[string]interface{}
			if err := json.Unmarshal([]byte(styleMappingStr), &styleMapping); err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("styleMapping must be valid JSON: %v", err)), nil
			}
			params["styleMapping"] = styleMapping
		}

		resp, err := node.Send(ctx, "write_html_batch", nil, params)
		return renderResponse(resp, err)
	})

	// ── get_html ─────────────────────────────────────────────────────────────
	s.AddTool(mcp.NewTool("get_html",
		mcp.WithDescription(`Export a Figma node and its children as an HTML string with inline CSS. This is the reverse of write_html — it reads the Figma node tree and produces HTML that can be modified and written back.

Useful for:
- Reading a template as HTML, modifying text/colors, then writing it back
- Understanding the structure of an existing design
- Round-trip editing without touching individual nodes
- Copying styles from one design to another

The output HTML uses the same format accepted by write_html, enabling read-modify-write workflows.`),

		mcp.WithString("nodeId",
			mcp.Required(),
			mcp.Description("Node ID to export as HTML. Colon format e.g. '4029:12345'."),
		),
		mcp.WithString("includeStyles",
			mcp.Description("'inline' (default) embeds CSS in style attributes. 'classes' uses class names with a styleMapping in the response. 'both' includes both."),
		),
		mcp.WithNumber("depth", mcp.Description("Maximum depth to traverse (default 10). Use smaller values for performance.")),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()

		nodeID, _ := args["nodeId"].(string)
		nodeID = NormalizeNodeID(nodeID)
		if nodeID == "" {
			return mcp.NewToolResultError("nodeId is required"), nil
		}
		if !ValidNodeID(nodeID) {
			return mcp.NewToolResultError(fmt.Sprintf("nodeId must use colon format e.g. 4029:12345, got: %s", nodeID)), nil
		}

		params := map[string]interface{}{}
		if includeStyles, ok := args["includeStyles"].(string); ok && includeStyles != "" {
			params["includeStyles"] = includeStyles
		}
		if depth, ok := args["depth"].(float64); ok {
			params["depth"] = depth
		}

		resp, err := node.Send(ctx, "get_html", []string{nodeID}, params)
		return renderResponse(resp, err)
	})
}

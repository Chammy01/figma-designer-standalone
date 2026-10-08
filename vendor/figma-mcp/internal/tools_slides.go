package internal

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// registerSlideTools wires Category G — slide / carousel ergonomics, the
// workflow you actually live in. These are higher-level than write_html and
// know about slide-shaped frames specifically.
//
//   - slide_template       — list available templates / instantiate one
//   - regenerate_slide     — replace contents of slide N preserving its position
//   - make_slide_grid      — arrange slides into a preview grid
//   - list_slides          — return ordered slide frames in current page
func registerSlideTools(s *server.MCPServer, node *Node) {

	s.AddTool(mcp.NewTool("slide_template",
		mcp.WithDescription(`Library of pre-defined slide HTML templates. Solves "the agent reinvents the slide structure on every call".

ACTIONS:
  - "list"        — return template names + descriptions
  - "preview"     — return the HTML body of a named template
  - "instantiate" — create a slide frame at (x,y) and write the named template into it. Slot values can override default text.

Built-in templates:
  cover         | Big title + tagline + CTA. Slots: {title, tagline, handle}
  quote         | Centered pull-quote + attribution. Slots: {quote, attribution}
  list-3        | Heading + 3 bullets. Slots: {title, item1, item2, item3}
  comparison    | Two columns side by side. Slots: {leftTitle, leftBody, rightTitle, rightBody}
  cta           | Big call-to-action + supporting text. Slots: {title, body, cta, handle}

Returns vary by action: list returns templates, preview returns html, instantiate returns frameId.`),

		mcp.WithString("action", mcp.Required(), mcp.Description("One of: list, preview, instantiate.")),
		mcp.WithString("template", mcp.Description("Template name (required for preview and instantiate).")),
		mcp.WithString("slots", mcp.Description("JSON object of slot values for instantiate.")),
		mcp.WithString("parentId", mcp.Description("Where to put the new slide (instantiate only).")),
		mcp.WithNumber("x", mcp.Description("Slide x position (instantiate only).")),
		mcp.WithNumber("y", mcp.Description("Slide y position (instantiate only).")),
		mcp.WithNumber("frameWidth", mcp.Description("Width (default 1080).")),
		mcp.WithNumber("frameHeight", mcp.Description("Height (default 1350).")),
		mcp.WithString("styleMapping", mcp.Description("Optional styleMapping JSON applied to the template.")),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()
		action, _ := args["action"].(string)
		valid := map[string]bool{"list": true, "preview": true, "instantiate": true}
		if !valid[action] {
			return mcp.NewToolResultError("action must be 'list', 'preview', or 'instantiate'"), nil
		}
		params := map[string]interface{}{"action": action}
		if t, ok := args["template"].(string); ok && t != "" {
			params["template"] = t
		}
		if sl, ok := args["slots"].(string); ok && sl != "" {
			var slots map[string]interface{}
			if err := json.Unmarshal([]byte(sl), &slots); err != nil {
				return mcp.NewToolResultError(fmt.Sprintf("slots must be valid JSON: %v", err)), nil
			}
			params["slots"] = slots
		}
		if pid, ok := args["parentId"].(string); ok && pid != "" {
			params["parentId"] = NormalizeNodeID(pid)
		}
		for _, k := range []string{"x", "y", "frameWidth", "frameHeight"} {
			if v, ok := args[k].(float64); ok {
				params[k] = v
			}
		}
		if sm, ok := args["styleMapping"].(string); ok && sm != "" {
			var smap map[string]interface{}
			if err := json.Unmarshal([]byte(sm), &smap); err == nil {
				params["styleMapping"] = smap
			}
		}
		resp, err := node.Send(ctx, "slide_template", nil, params)
		return renderResponse(resp, err)
	})

	s.AddTool(mcp.NewTool("regenerate_slide",
		mcp.WithDescription(`Replace the contents of an existing slide frame with new HTML, preserving the frame's position, name, size, and background.

Use case: "Slide 3 needs different copy" — pass slide-3 frameId and the new HTML body. Children are replaced; the frame itself stays put. The frame's bound styles (fills set via style binding) are preserved unless explicitly overridden.

Returns {frameId, newChildren, removedChildren}.`),

		mcp.WithString("frameId", mcp.Required(), mcp.Description("Existing slide frame to regenerate.")),
		mcp.WithString("html", mcp.Required(), mcp.Description("New HTML body for the slide's children.")),
		mcp.WithString("styleMapping", mcp.Description("Optional styleMapping JSON.")),
		mcp.WithBoolean("preserveBackground", mcp.Description("If true (default true), keep the frame's existing fills.")),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()
		frameId, _ := args["frameId"].(string)
		frameId = NormalizeNodeID(frameId)
		if !ValidNodeID(frameId) {
			return mcp.NewToolResultError(fmt.Sprintf("frameId must use colon format, got: %s", frameId)), nil
		}
		html, _ := args["html"].(string)
		if html == "" {
			return mcp.NewToolResultError("html is required"), nil
		}
		params := map[string]interface{}{"html": html}
		if sm, ok := args["styleMapping"].(string); ok && sm != "" {
			var smap map[string]interface{}
			if err := json.Unmarshal([]byte(sm), &smap); err == nil {
				params["styleMapping"] = smap
			}
		}
		if pb, ok := args["preserveBackground"].(bool); ok {
			params["preserveBackground"] = pb
		}
		resp, err := node.Send(ctx, "regenerate_slide", []string{frameId}, params)
		return renderResponse(resp, err)
	})

	s.AddTool(mcp.NewTool("make_slide_grid",
		mcp.WithDescription(`Arrange existing slide frames into a tidy preview grid. Takes the slide IDs in order and lays them out N columns wide with a consistent gap.

Useful for the "carousel preview" view at the end of a post — see all slides at once before publishing.

Returns {arranged:[{frameId, x, y, row, col}], rows, columns}.`),

		mcp.WithString("frameIds", mcp.Required(), mcp.Description("JSON array of slide frame IDs in display order.")),
		mcp.WithNumber("columns", mcp.Description("Number of columns (default 4).")),
		mcp.WithNumber("gap", mcp.Description("Gap between cells in px (default 80).")),
		mcp.WithNumber("startX", mcp.Description("Top-left X (default 0).")),
		mcp.WithNumber("startY", mcp.Description("Top-left Y (default 0).")),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()
		idsStr, _ := args["frameIds"].(string)
		var ids []string
		if err := json.Unmarshal([]byte(idsStr), &ids); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("frameIds must be a JSON array: %v", err)), nil
		}
		params := map[string]interface{}{}
		for _, k := range []string{"columns", "gap", "startX", "startY"} {
			if v, ok := args[k].(float64); ok {
				params[k] = v
			}
		}
		resp, err := node.Send(ctx, "make_slide_grid", ids, params)
		return renderResponse(resp, err)
	})

	s.AddTool(mcp.NewTool("list_slides",
		mcp.WithDescription(`Return the ordered list of slide-shaped frames in the current page (or a parent subtree).

A frame is considered a "slide" if it's a top-level FRAME with width and height matching the most common dimensions on the page (e.g., 1080×1350 carousel slides).

Returns {slides:[{frameId, name, x, y, width, height, index}], total, dominantSize}.`),

		mcp.WithString("parentId", mcp.Description("Parent to scan (default: current page).")),
		mcp.WithNumber("frameWidth", mcp.Description("Filter to frames with this exact width.")),
		mcp.WithNumber("frameHeight", mcp.Description("Filter to frames with this exact height.")),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()
		params := map[string]interface{}{}
		if pid, ok := args["parentId"].(string); ok && pid != "" {
			params["parentId"] = NormalizeNodeID(pid)
		}
		if v, ok := args["frameWidth"].(float64); ok {
			params["frameWidth"] = v
		}
		if v, ok := args["frameHeight"].(float64); ok {
			params["frameHeight"] = v
		}
		resp, err := node.Send(ctx, "list_slides", nil, params)
		return renderResponse(resp, err)
	})
}

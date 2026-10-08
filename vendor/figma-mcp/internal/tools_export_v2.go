package internal

import (
	"context"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// registerExportV2Tools wires Category F — Asset & Export.
//
//   - export_node_as_react        — generate React + Tailwind for a node tree
//   - export_html_self_contained  — full HTML+CSS file with embedded images
//   - replace_image_globally      — swap an image hash across every node that uses it
func registerExportV2Tools(s *server.MCPServer, node *Node) {

	s.AddTool(mcp.NewTool("export_node_as_react",
		mcp.WithDescription(`Generate a React component (TSX) using Tailwind CSS classes that visually matches a Figma node tree.

Output is a single TSX string suitable for dropping into a React project. Frame styling becomes Tailwind utility classes; text content is rendered inline; images are emitted as <img src="..."> placeholders for you to replace.

Useful as a first-cut implementation handoff. Not a 1:1 design-to-code tool — small adjustments will likely be needed.

Returns {tsx, fontsUsed, imagesUsed}.`),

		mcp.WithString("nodeId", mcp.Required(), mcp.Description("Root node to export.")),
		mcp.WithString("componentName", mcp.Description("Component name (default 'FigmaNode').")),
		mcp.WithBoolean("includeImports", mcp.Description("If true, include `import React from 'react'` (default false).")),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()
		nodeID, _ := args["nodeId"].(string)
		nodeID = NormalizeNodeID(nodeID)
		if !ValidNodeID(nodeID) {
			return mcp.NewToolResultError(fmt.Sprintf("nodeId must use colon format, got: %s", nodeID)), nil
		}
		params := map[string]interface{}{}
		if cn, ok := args["componentName"].(string); ok && cn != "" {
			params["componentName"] = cn
		}
		if ii, ok := args["includeImports"].(bool); ok {
			params["includeImports"] = ii
		}
		resp, err := node.Send(ctx, "export_node_as_react", []string{nodeID}, params)
		return renderResponse(resp, err)
	})

	s.AddTool(mcp.NewTool("export_html_self_contained",
		mcp.WithDescription(`Export a node as a single self-contained HTML file with embedded CSS. Image fills are exported as base64 data URIs so the file renders correctly in any browser without external assets.

Useful for sharing previews, attaching to issues, or visually verifying that what you see in Figma matches what the agent intended.

Returns {html} — full HTML document string.`),

		mcp.WithString("nodeId", mcp.Required(), mcp.Description("Node to export.")),
		mcp.WithNumber("depth", mcp.Description("Maximum traversal depth (default 12).")),
		mcp.WithBoolean("includeImages", mcp.Description("If true, embed image fills as base64 (default true). Slow for large images.")),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()
		nodeID, _ := args["nodeId"].(string)
		nodeID = NormalizeNodeID(nodeID)
		if !ValidNodeID(nodeID) {
			return mcp.NewToolResultError(fmt.Sprintf("nodeId must use colon format, got: %s", nodeID)), nil
		}
		params := map[string]interface{}{}
		if d, ok := args["depth"].(float64); ok {
			params["depth"] = d
		}
		if ii, ok := args["includeImages"].(bool); ok {
			params["includeImages"] = ii
		}
		resp, err := node.Send(ctx, "export_html_self_contained", []string{nodeID}, params)
		return renderResponse(resp, err)
	})

	s.AddTool(mcp.NewTool("replace_image_globally",
		mcp.WithDescription(`Replace every occurrence of an image fill (by image hash) with a different image, across the current page.

Use case: you placed a draft headshot in 12 different cards; the final headshot is delivered; one tool call swaps all 12.

INPUT: oldImageHash and newImageBase64 (or newImageHash if you've already imported it via import_image).

Returns {affectedNodes:[{id, name}], total}.`),

		mcp.WithString("oldImageHash", mcp.Required(), mcp.Description("The image hash currently in use (visible in get_node responses).")),
		mcp.WithString("newImageBase64", mcp.Description("Base64 of the replacement image (omit if newImageHash is set).")),
		mcp.WithString("newImageHash", mcp.Description("Hash of an already-imported replacement image.")),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()
		oldHash, _ := args["oldImageHash"].(string)
		if oldHash == "" {
			return mcp.NewToolResultError("oldImageHash is required"), nil
		}
		newB64, _ := args["newImageBase64"].(string)
		newHash, _ := args["newImageHash"].(string)
		if newB64 == "" && newHash == "" {
			return mcp.NewToolResultError("either newImageBase64 or newImageHash is required"), nil
		}
		params := map[string]interface{}{
			"oldImageHash":   oldHash,
			"newImageBase64": newB64,
			"newImageHash":   newHash,
		}
		resp, err := node.Send(ctx, "replace_image_globally", nil, params)
		return renderResponse(resp, err)
	})
}

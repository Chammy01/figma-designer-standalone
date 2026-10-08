package internal

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// registerStyleEcosystemTools wires Category E — bulk creation tools that turn
// design tokens into Figma styles and variables.
//
//   - create_styles_from_palette  — N hex colors → N paint styles
//   - create_text_scale           — typography scale → N text styles
//   - import_design_tokens        — W3C / Style Dictionary tokens → Variables + Styles
//   - bind_variable_to_style      — link a paint style's color to a variable
func registerStyleEcosystemTools(s *server.MCPServer, node *Node) {

	s.AddTool(mcp.NewTool("create_styles_from_palette",
		mcp.WithDescription(`Create N paint styles from a single palette JSON in one call.

INPUT: a JSON object mapping style name → hex color.
  { "Brand/Primary": "#5B5FEF", "Brand/Accent": "#FFD700", "Surface/Default": "#FFFFFF" }

Names with slashes group styles into folders inside the Figma styles panel.

Returns {created:[{name, styleId, color}], failed:[{name, reason}]}.`),

		mcp.WithString("palette", mcp.Required(), mcp.Description("JSON object {name: hex} of paint styles to create.")),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		s2, _ := req.GetArguments()["palette"].(string)
		if s2 == "" {
			return mcp.NewToolResultError("palette is required (JSON object)"), nil
		}
		var palette map[string]interface{}
		if err := json.Unmarshal([]byte(s2), &palette); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("palette must be valid JSON: %v", err)), nil
		}
		resp, err := node.Send(ctx, "create_styles_from_palette", nil, map[string]interface{}{
			"palette": palette,
		})
		return renderResponse(resp, err)
	})

	s.AddTool(mcp.NewTool("create_text_scale",
		mcp.WithDescription(`Create text styles from a typography scale in one call.

INPUT: a JSON object describing each style:
  {
    "Heading/Display":  { "fontFamily":"Outfit", "fontSize":96, "fontWeight":"Medium", "lineHeight":104 },
    "Heading/Section":  { "fontFamily":"Outfit", "fontSize":48, "fontWeight":"Medium", "lineHeight":56 },
    "Body/Default":     { "fontFamily":"Inter",  "fontSize":16, "fontWeight":"Regular", "lineHeight":24 }
  }

Each entry creates one Figma TextStyle. Use slashes in names for folder grouping.

Returns {created:[{name, styleId, fontFamily, fontSize}], failed:[{name, reason}]}.`),

		mcp.WithString("scale", mcp.Required(), mcp.Description("JSON object describing the typography scale.")),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		s2, _ := req.GetArguments()["scale"].(string)
		if s2 == "" {
			return mcp.NewToolResultError("scale is required (JSON object)"), nil
		}
		var scale map[string]interface{}
		if err := json.Unmarshal([]byte(s2), &scale); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("scale must be valid JSON: %v", err)), nil
		}
		resp, err := node.Send(ctx, "create_text_scale", nil, map[string]interface{}{
			"scale": scale,
		})
		return renderResponse(resp, err)
	})

	s.AddTool(mcp.NewTool("import_design_tokens",
		mcp.WithDescription(`Import a W3C-format design tokens JSON (or Style Dictionary export) and create the equivalent Figma Variables + Paint/Text Styles.

Supported token types:
  - color  → Variable (COLOR) and matching Paint Style if exposeAsStyle is true
  - dimension / spacing → Variable (FLOAT)
  - typography → Text Style + a Variable per dimension
  - radius / border-radius → Variable (FLOAT)

Token JSON example:
  {
    "color": {
      "brand": { "primary": { "$value": "#5B5FEF", "$type": "color" } },
      "surface": { "default": { "$value": "#FFFFFF", "$type": "color" } }
    },
    "spacing": { "md": { "$value": "16px", "$type": "dimension" } }
  }

Returns {created:{variables, paintStyles, textStyles}, failed}.`),

		mcp.WithString("tokens", mcp.Required(), mcp.Description("Design tokens JSON.")),
		mcp.WithString("collectionName", mcp.Description("Variable collection name (default 'Imported Tokens').")),
		mcp.WithBoolean("exposeAsStyles", mcp.Description("If true, also create Paint/Text styles for color/typography tokens (default true).")),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()
		s2, _ := args["tokens"].(string)
		if s2 == "" {
			return mcp.NewToolResultError("tokens is required (JSON object)"), nil
		}
		var tokens map[string]interface{}
		if err := json.Unmarshal([]byte(s2), &tokens); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("tokens must be valid JSON: %v", err)), nil
		}
		params := map[string]interface{}{"tokens": tokens}
		if cn, ok := args["collectionName"].(string); ok && cn != "" {
			params["collectionName"] = cn
		}
		if ea, ok := args["exposeAsStyles"].(bool); ok {
			params["exposeAsStyles"] = ea
		}
		resp, err := node.Send(ctx, "import_design_tokens", nil, params)
		return renderResponse(resp, err)
	})

	s.AddTool(mcp.NewTool("bind_variable_to_style",
		mcp.WithDescription(`Bind a Figma Variable to a Paint Style's color so the style auto-updates when the variable's mode changes.

Use case: your "Brand/Primary" paint style is currently a fixed hex; you want it to follow a variable so light/dark modes pick the right color automatically.

Returns {styleId, variableId, ok:true} on success.`),

		mcp.WithString("styleId", mcp.Required(), mcp.Description("Paint style ID.")),
		mcp.WithString("variableId", mcp.Required(), mcp.Description("Variable ID (must be COLOR type).")),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()
		styleId, _ := args["styleId"].(string)
		varId, _ := args["variableId"].(string)
		if styleId == "" || varId == "" {
			return mcp.NewToolResultError("both styleId and variableId are required"), nil
		}
		resp, err := node.Send(ctx, "bind_variable_to_style", nil, map[string]interface{}{
			"styleId":    styleId,
			"variableId": varId,
		})
		return renderResponse(resp, err)
	})
}

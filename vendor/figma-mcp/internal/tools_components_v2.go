package internal

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// registerComponentV2Tools wires Category D — Component Ergonomics.
//
//   - create_component_from_html    — write_html that produces a Component
//   - instantiate_by_name           — make instance, looked up by name
//   - set_instance_overrides_batch  — apply many overrides in one call
//   - combine_as_variants           — combine COMPONENT nodes into a COMPONENT_SET
func registerComponentV2Tools(s *server.MCPServer, node *Node) {

	s.AddTool(mcp.NewTool("create_component_from_html",
		mcp.WithDescription(`Build a reusable Figma Component directly from HTML, in a single call. Same syntax as write_html but the resulting root frame is converted to a Component (not just a Frame), so it can be instantiated repeatedly.

Useful for shipping component libraries: hand the agent your design tokens via styleMapping, the HTML body, and you get a finished Component back.

Returns {componentId, name, bounds}.`),

		mcp.WithString("html", mcp.Required(), mcp.Description("HTML body for the component.")),
		mcp.WithString("targetNodeId", mcp.Required(), mcp.Description("Parent (page or section) where the component will live.")),
		mcp.WithString("name", mcp.Description("Optional component name; defaults to the root layer-name.")),
		mcp.WithString("styleMapping", mcp.Description("Optional JSON style mapping (same format as write_html).")),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()
		html, _ := args["html"].(string)
		if html == "" {
			return mcp.NewToolResultError("html is required"), nil
		}
		targetID, _ := args["targetNodeId"].(string)
		targetID = NormalizeNodeID(targetID)
		if !ValidNodeID(targetID) {
			return mcp.NewToolResultError(fmt.Sprintf("targetNodeId must use colon format, got: %s", targetID)), nil
		}
		params := map[string]interface{}{
			"html":         html,
			"targetNodeId": targetID,
		}
		if name, ok := args["name"].(string); ok && name != "" {
			params["name"] = name
		}
		if smStr, ok := args["styleMapping"].(string); ok && smStr != "" {
			var sm map[string]interface{}
			if err := json.Unmarshal([]byte(smStr), &sm); err == nil {
				params["styleMapping"] = sm
			}
		}
		resp, err := node.Send(ctx, "create_component_from_html", []string{targetID}, params)
		return renderResponse(resp, err)
	})

	s.AddTool(mcp.NewTool("instantiate_by_name",
		mcp.WithDescription(`Instantiate a Component by NAME (not ID). Useful when you know the component name from your design system but don't want to look up its ID first.

The plugin searches local components by exact name (case-insensitive); if no exact match, it falls back to substring match. If multiple components match the lookup, the first match in document order wins.

Optional overrides apply text/visibility/swap overrides to the new instance in the same call.

Returns {instanceId, componentId, componentName, bounds}.`),

		mcp.WithString("componentName", mcp.Required(), mcp.Description("Component name to look up.")),
		mcp.WithString("parentId", mcp.Description("Where to place the new instance (defaults to current page).")),
		mcp.WithNumber("x", mcp.Description("Optional x position.")),
		mcp.WithNumber("y", mcp.Description("Optional y position.")),
		mcp.WithString("overrides", mcp.Description(`Optional JSON object: {"layerName":"text"} to set text on a child by layer name.`)),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()
		name, _ := args["componentName"].(string)
		if name == "" {
			return mcp.NewToolResultError("componentName is required"), nil
		}
		params := map[string]interface{}{"componentName": name}
		if pid, ok := args["parentId"].(string); ok && pid != "" {
			params["parentId"] = NormalizeNodeID(pid)
		}
		if v, ok := args["x"].(float64); ok {
			params["x"] = v
		}
		if v, ok := args["y"].(float64); ok {
			params["y"] = v
		}
		if oStr, ok := args["overrides"].(string); ok && oStr != "" {
			var o map[string]interface{}
			if err := json.Unmarshal([]byte(oStr), &o); err == nil {
				params["overrides"] = o
			}
		}
		resp, err := node.Send(ctx, "instantiate_by_name", nil, params)
		return renderResponse(resp, err)
	})

	s.AddTool(mcp.NewTool("set_instance_overrides_batch",
		mcp.WithDescription(`Apply text / visibility / component-swap overrides across many INSTANCE nodes in one call.

INPUT: an array of {instanceId, overrides} entries. Each overrides object accepts:
  - text overrides:        {"layerName":"new text"}      — sets characters on text descendant by name
  - visibility overrides:  {"layerName": false}          — sets visible=false on descendant by name
  - swap component:        {"swap":{"layerName":"NewComponentName"}}  — swap a child instance to a different main component (looked up by name)

Designed for "render N cards from a data array" style workflows: one tool call updates all of them.

Returns {applied, failed, results:[{instanceId, applied:[...], errors:[...]}]}.`),

		mcp.WithString("updates",
			mcp.Required(),
			mcp.Description(`JSON array of {"instanceId":"...", "overrides":{...}} entries.`),
		),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()
		s2, _ := args["updates"].(string)
		if s2 == "" {
			return mcp.NewToolResultError("updates is required (JSON array)"), nil
		}
		var updates []interface{}
		if err := json.Unmarshal([]byte(s2), &updates); err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("updates must be valid JSON: %v", err)), nil
		}
		resp, err := node.Send(ctx, "set_instance_overrides_batch", nil, map[string]interface{}{
			"updates": updates,
		})
		return renderResponse(resp, err)
	})

	s.AddTool(mcp.NewTool("combine_as_variants",
		mcp.WithDescription(`Combine two or more existing local COMPONENT nodes into a native Figma COMPONENT_SET.

Before combining, each component is renamed to Property=Value form so Figma creates a real VARIANT property. By default the property is "State" and each value is derived from the last slash-delimited segment of the component's existing name. For example "Button / Primary / Hover" becomes "State=Hover".

Use variantValues when you want exact values instead of name-derived values.

parentId is optional. When omitted, the plugin finds the nearest common ancestor that can contain the new component set. Components may start in different wrapper frames as long as they are on the same page and Figma allows them to be reparented.

This tool does not delete former wrapper frames after components are moved. It reports any wrappers that became empty so callers can inspect them before deciding whether to clean them up.

Returns {componentSetId, name, parentId, variants, formerParentIds, emptyFormerParentIds, bounds}.`),

		mcp.WithArray("componentIds",
			mcp.Required(),
			mcp.Description("Two or more local COMPONENT node IDs to combine."),
			mcp.Items(map[string]any{"type": "string"}),
		),
		mcp.WithString("name",
			mcp.Description(`Optional COMPONENT_SET name, e.g. "Button / Primary".`),
		),
		mcp.WithString("propertyName",
			mcp.Description(`Variant property name. Defaults to "State".`),
		),
		mcp.WithArray("variantValues",
			mcp.Description("Optional values parallel to componentIds, e.g. [\"Default\",\"Hover\",\"Pressed\",\"Disabled\"]."),
			mcp.Items(map[string]any{"type": "string"}),
		),
		mcp.WithString("parentId",
			mcp.Description("Optional parent node for the new COMPONENT_SET. When omitted, the nearest safe common ancestor is used."),
		),
	), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		args := req.GetArguments()

		rawIDs, ok := args["componentIds"].([]interface{})
		if !ok {
			return mcp.NewToolResultError("componentIds is required and must be an array"), nil
		}
		componentIDs := toStringSlice(rawIDs)
		if len(componentIDs) < 2 {
			return mcp.NewToolResultError("componentIds must contain at least 2 component IDs"), nil
		}

		for i, id := range componentIDs {
			componentIDs[i] = NormalizeNodeID(id)
			if !ValidNodeID(componentIDs[i]) {
				return mcp.NewToolResultError(fmt.Sprintf("invalid componentIds[%d]: %s", i, componentIDs[i])), nil
			}
		}

		params := map[string]interface{}{}

		if name, ok := args["name"].(string); ok && name != "" {
			params["name"] = name
		}

		propertyName := "State"
		if v, ok := args["propertyName"].(string); ok && v != "" {
			propertyName = v
		}
		params["propertyName"] = propertyName

		if rawValues, ok := args["variantValues"].([]interface{}); ok && len(rawValues) > 0 {
			values := toStringSlice(rawValues)
			if len(values) != len(componentIDs) {
				return mcp.NewToolResultError(fmt.Sprintf(
					"variantValues length (%d) must match componentIds length (%d)",
					len(values), len(componentIDs),
				)), nil
			}
			for i, v := range values {
				if v == "" {
					return mcp.NewToolResultError(fmt.Sprintf("variantValues[%d] must not be empty", i)), nil
				}
			}
			params["variantValues"] = values
		}

		if parentID, ok := args["parentId"].(string); ok && parentID != "" {
			parentID = NormalizeNodeID(parentID)
			if !ValidNodeID(parentID) {
				return mcp.NewToolResultError(fmt.Sprintf("parentId must use colon format, got: %s", parentID)), nil
			}
			params["parentId"] = parentID
		}

		resp, err := node.Send(ctx, "combine_as_variants", componentIDs, params)
		return renderResponse(resp, err)
	})
}

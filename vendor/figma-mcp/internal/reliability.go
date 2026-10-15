package internal

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"crypto/rand"
	"encoding/hex"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

const BridgeProtocolVersion = 2
const ProductVersion = "1.1.0"

type reliabilityContextKey struct{}

var operationIDPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_-]{15,79}$`)

func newOperationID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		panic("operation ID entropy unavailable")
	}
	return hex.EncodeToString(b[:])
}
func validateOperationID(id interface{}) error {
	s, ok := id.(string)
	if !ok || !operationIDPattern.MatchString(s) {
		return fmt.Errorf("INVALID_OPERATION_ID: expected 16–80 opaque ASCII characters")
	}
	return nil
}
func compatiblePlugin(resp BridgeResponse) error {
	if resp.Error != "" {
		return fmt.Errorf("PLUGIN_VERSION_MISMATCH: %s", resp.Error)
	}
	p, ok := resp.Data.(map[string]interface{})
	if !ok {
		return fmt.Errorf("PLUGIN_VERSION_MISMATCH")
	}
	if p["protocolVersion"] != float64(BridgeProtocolVersion) {
		return fmt.Errorf("PROTOCOL_MISMATCH")
	}
	if p["version"] != ProductVersion {
		return fmt.Errorf("PLUGIN_VERSION_MISMATCH")
	}
	caps, _ := p["capabilities"].(map[string]interface{})
	for _, key := range []string{"receipts", "preconditions", "revisionTokens", "writeTools"} {
		if caps[key] != true {
			return fmt.Errorf("CAPABILITY_UNAVAILABLE: %s", key)
		}
	}
	document, ok := p["document"].(map[string]interface{})
	if !ok || document["accessState"] != "READABLE" || document["id"] == nil || document["pageId"] == nil {
		return fmt.Errorf("DOCUMENT_UNAVAILABLE")
	}
	return nil
}
func enrichHealth(resp *BridgeResponse) {
	data, ok := resp.Data.(map[string]interface{})
	if !ok {
		return
	}
	h, _ := data["handshake"].(map[string]interface{})
	if h == nil {
		h = map[string]interface{}{}
	}
	h["server"] = map[string]interface{}{"product": "Figma Designer MCP", "version": ProductVersion, "protocolVersion": BridgeProtocolVersion}
	plugin, _ := h["plugin"].(map[string]interface{})
	if plugin != nil {
		h["document"] = plugin["document"]
		h["capabilities"] = plugin["capabilities"]
	}
	state, reason := "COMPATIBLE", ""
	if plugin == nil {
		state, reason = "PLUGIN_TOO_OLD", "Structured plugin handshake unavailable"
	} else if err := compatiblePlugin(BridgeResponse{Data: plugin}); err != nil {
		state, reason = "PROTOCOL_MISMATCH", err.Error()
		if plugin["version"] != ProductVersion {
			state = "PLUGIN_VERSION_MISMATCH"
		}
		if strings.HasPrefix(err.Error(), "CAPABILITY_UNAVAILABLE") {
			state = "CAPABILITY_MISSING"
		}
		if protocol, ok := plugin["protocolVersion"].(float64); ok && protocol != BridgeProtocolVersion {
			if protocol < BridgeProtocolVersion {
				state = "PLUGIN_TOO_OLD"
			} else {
				state = "SERVER_TOO_OLD"
			}
		}
	}
	h["compatibility"] = map[string]interface{}{"state": state, "reason": reason}
	data["handshake"] = h
}
func registerReliabilityTools(s *server.MCPServer, node *Node) {
	// Wrap the existing handlers once; filtered/rebuilt params retain optional safety fields.
	for name, entry := range s.ListTools() {
		if !mutatingTools[name] {
			continue
		}
		t := entry.Tool
		t.InputSchema.Properties["operationId"] = map[string]interface{}{"type": "string", "minLength": 16, "maxLength": 80, "description": "Opaque unique operation ID. Reuse only for an identical request; query receipt after uncertainty."}
		t.InputSchema.Properties["expectedRevision"] = map[string]interface{}{"type": "string", "description": "Optional exact current-page revision from get_document_revision."}
		t.InputSchema.Properties["preconditions"] = map[string]interface{}{"type": "object", "description": "Optional fail-closed target guards. Applied to all mutation targets, or the chosen source for instantiate_by_name.", "additionalProperties": false, "properties": map[string]interface{}{
			"expectedNodeType": map[string]string{"type": "string"}, "expectedParentId": map[string]string{"type": "string"}, "expectedName": map[string]string{"type": "string"}, "expectedComponentId": map[string]string{"type": "string"}, "expectedComponentSetId": map[string]string{"type": "string"}, "expectedReactionCount": map[string]interface{}{"type": "integer", "minimum": 0}, "expectedChildrenCount": map[string]interface{}{"type": "integer", "minimum": 0}, "expectedVisible": map[string]string{"type": "boolean"}, "expectedRevision": map[string]string{"type": "string"},
		}}
		next := entry.Handler
		s.AddTool(t, func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			args := req.GetArguments()
			extra := map[string]interface{}{}
			for _, key := range []string{"operationId", "preconditions", "expectedRevision"} {
				if v, ok := args[key]; ok {
					extra[key] = v
				}
			}
			if _, ok := extra["operationId"]; !ok {
				extra["operationId"] = newOperationID()
			}
			if err := validateOperationID(extra["operationId"]); err != nil {
				return mcp.NewToolResultError(err.Error()), nil
			}
			return next(context.WithValue(ctx, reliabilityContextKey{}, extra), req)
		})
	}
	s.AddTool(mcp.NewTool("get_operation_receipt", mcp.WithDescription("Read-only lookup of a bounded plugin-local operation receipt. UNKNOWN is never proof of no write."), mcp.WithReadOnlyHintAnnotation(true), mcp.WithString("operationId", mcp.Required())), func(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		id := req.GetArguments()["operationId"]
		if err := validateOperationID(id); err != nil {
			return mcp.NewToolResultError(err.Error()), nil
		}
		resp, err := node.Send(ctx, "get_operation_receipt", nil, map[string]interface{}{"operationId": id})
		return renderResponse(resp, err)
	})
	s.AddTool(mcp.NewTool("get_document_revision", mcp.WithDescription("Read-only deterministic SHA-256 revision of current-page native properties/reactions/source identities. Not a full-document revision; selection/viewport excluded."), mcp.WithReadOnlyHintAnnotation(true)), makeHandler(node, "get_document_revision", nil, nil))
}

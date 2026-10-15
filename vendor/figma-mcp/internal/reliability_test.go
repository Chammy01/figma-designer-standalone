package internal

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

func hello() map[string]interface{} {
	return map[string]interface{}{"version": "1.1.0", "protocolVersion": float64(2), "document": map[string]interface{}{"id": "fixture", "pageId": "0:1", "accessState": "READABLE"}, "capabilities": map[string]interface{}{"receipts": true, "preconditions": true, "revisionTokens": true, "writeTools": true}}
}
func TestReliabilityCompatibility(t *testing.T) {
	for _, code := range []string{"COMPATIBLE", "PROTOCOL_MISMATCH", "PLUGIN_VERSION_MISMATCH", "CAPABILITY_UNAVAILABLE"} {
		t.Run(code, func(t *testing.T) {
			p := hello()
			switch code {
			case "PROTOCOL_MISMATCH":
				p["protocolVersion"] = float64(1)
			case "PLUGIN_VERSION_MISMATCH":
				p["version"] = "1.0.0"
			case "CAPABILITY_UNAVAILABLE":
				p["capabilities"].(map[string]interface{})["receipts"] = false
			}
			err := compatiblePlugin(BridgeResponse{Data: p})
			if code == "COMPATIBLE" {
				if err != nil {
					t.Fatal(err)
				}
			} else if err == nil || !strings.Contains(err.Error(), code) {
				t.Fatalf("%v", err)
			}
		})
	}
}
func TestReliabilityOperationIDs(t *testing.T) {
	for _, id := range []interface{}{nil, 3, "a", "../../private/secret", strings.Repeat("a", 81)} {
		if validateOperationID(id) == nil {
			t.Fatalf("accepted %v", id)
		}
	}
	if validateOperationID(newOperationID()) != nil {
		t.Fatal("generated ID invalid")
	}
}
func TestReliabilityCatalogAdditive(t *testing.T) {
	s := server.NewMCPServer("test", "test")
	RegisterTools(s, NewNode("127.0.0.1", 19940, "test"))
	if len(s.ListTools()) != 108 {
		t.Fatal(len(s.ListTools()))
	}
	for name := range mutatingTools {
		tool := s.GetTool(name)
		if tool == nil {
			t.Fatal(name)
		}
		for _, p := range []string{"operationId", "preconditions", "expectedRevision"} {
			if tool.Tool.InputSchema.Properties[p] == nil {
				t.Fatal(name, p)
			}
		}
		for _, p := range tool.Tool.InputSchema.Required {
			if p == "operationId" || p == "preconditions" || p == "expectedRevision" {
				t.Fatal("safety field mandatory")
			}
		}
	}
	for _, name := range []string{"get_operation_receipt", "get_document_revision"} {
		if s.GetTool(name).Tool.Annotations.ReadOnlyHint == nil || !*s.GetTool(name).Tool.Annotations.ReadOnlyHint {
			t.Fatal("missing read-only annotation")
		}
	}
}
func TestReliabilityFilteredParamsCarryMetadata(t *testing.T) {
	n := NewNode("127.0.0.1", 0, "1.1.0")
	if err := n.BecomeLeader(); err != nil {
		t.Fatal(err)
	}
	defer n.Stop()
	// Handler wrapper context survives a hand-built params map (set_text).
	bridge, client := setupBridgeWithClient(t)
	n.leader.bridge = bridge
	go func() {
		for i := 0; i < 2; i++ {
			var r BridgeRequest
			if wsjson.Read(context.Background(), client, &r) != nil {
				return
			}
			data := interface{}(hello())
			if r.Type != "bridge_hello" {
				if r.Params["operationId"] != "operation-filtered-test" || r.ProtocolVersion != 2 || r.Params["preconditions"] == nil {
					t.Error("metadata lost", r)
				}
				data = map[string]interface{}{"id": "1:2"}
			}
			_ = wsjson.Write(context.Background(), client, BridgeResponse{RequestID: r.RequestID, Data: data})
		}
	}()
	s := server.NewMCPServer("test", "test")
	RegisterTools(s, n)
	r := mcp.CallToolRequest{}
	r.Params.Name = "set_text"
	r.Params.Arguments = map[string]interface{}{"nodeId": "1:2", "text": "test", "operationId": "operation-filtered-test", "preconditions": map[string]interface{}{"expectedNodeType": "TEXT"}}
	result, err := s.GetTool("set_text").Handler(context.Background(), r)
	if err != nil || result.IsError {
		t.Fatal(err, result)
	}
}
func TestReliabilityRejectsMismatchBeforeWrite(t *testing.T) {
	b, c := setupBridgeWithClient(t)
	go func() {
		var r BridgeRequest
		_ = wsjson.Read(context.Background(), c, &r)
		if r.Type != "bridge_hello" {
			t.Error("mutation sent before handshake")
		}
		p := hello()
		p["protocolVersion"] = float64(1)
		_ = wsjson.Write(context.Background(), c, BridgeResponse{RequestID: r.RequestID, Data: p})
	}()
	_, err := b.Send(context.Background(), "create_frame", nil, map[string]interface{}{"operationId": "operation-test-12345"})
	if err == nil || !strings.Contains(err.Error(), "PROTOCOL_MISMATCH") {
		t.Fatal(err)
	}
}
func TestReliabilityDisconnectBeforeWrite(t *testing.T) {
	_, err := NewBridge().Send(context.Background(), "create_frame", nil, nil)
	if err == nil || !strings.Contains(err.Error(), "PLUGIN_NOT_CONNECTED") {
		t.Fatal(err)
	}
}
func TestReliabilityHealthAdditive(t *testing.T) {
	resp := BridgeResponse{Data: map[string]interface{}{"ok": true, "version": "1.1.0", "handshake": map[string]interface{}{"plugin": hello()}}}
	enrichHealth(&resp)
	b, _ := json.Marshal(resp.Data)
	if !strings.Contains(string(b), "COMPATIBLE") || resp.Data.(map[string]interface{})["ok"] != true {
		t.Fatal(string(b))
	}
}
func TestReliabilityTransportIDsSurviveServerRestart(t *testing.T) {
	if NewBridge().nextID() == NewBridge().nextID() {
		t.Fatal("request IDs collide after restart")
	}
}

func TestReliabilityLostResponseLookupAfterReconnect(t *testing.T) {
	b, client := setupBridgeWithClient(t)
	ctx := context.Background()
	var mutations atomic.Int64
	const id = "operation-socket-loss-test"
	go func() {
		var req BridgeRequest
		if wsjson.Read(ctx, client, &req) != nil {
			return
		}
		_ = wsjson.Write(ctx, client, BridgeResponse{RequestID: req.RequestID, Data: hello()})
		if wsjson.Read(ctx, client, &req) != nil {
			return
		}
		if req.Type != "create_frame" || req.Params["operationId"] != id {
			t.Error("unexpected mutation", req)
		}
		mutations.Add(1) // Fake native peer committed; deliberately drop its response.
		_ = client.CloseNow()
	}()
	_, err := b.Send(ctx, "create_frame", nil, map[string]interface{}{"operationId": id})
	if err == nil || !strings.Contains(err.Error(), "WRITE_RESPONSE_LOST") || !strings.Contains(err.Error(), id) {
		t.Fatal(err)
	}
	srv := httptest.NewServer(http.HandlerFunc(b.HandleUpgrade))
	defer srv.Close()
	peer, _, err := websocket.Dial(ctx, "ws"+strings.TrimPrefix(srv.URL, "http"), nil)
	if err != nil {
		t.Fatal(err)
	}
	defer peer.CloseNow()
	deadline := time.Now().Add(time.Second)
	for !b.IsConnected() && time.Now().Before(deadline) {
		time.Sleep(time.Millisecond)
	}
	go func() {
		var req BridgeRequest
		if wsjson.Read(ctx, peer, &req) != nil {
			return
		}
		if req.Type != "get_operation_receipt" {
			t.Error("mutation replayed instead of lookup", req.Type)
		}
		_ = wsjson.Write(ctx, peer, BridgeResponse{RequestID: req.RequestID, Data: map[string]interface{}{"operationId": id, "state": "COMMITTED", "createdNodeIds": []string{"1:2"}}})
	}()
	result, err := b.Send(ctx, "get_operation_receipt", nil, map[string]interface{}{"operationId": id})
	if err != nil || result.Data.(map[string]interface{})["state"] != "COMMITTED" || mutations.Load() != 1 {
		t.Fatal(err, result, mutations.Load())
	}
}

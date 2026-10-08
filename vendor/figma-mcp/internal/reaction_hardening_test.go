package internal

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"sync"
	"testing"
	"time"

	"github.com/coder/websocket/wsjson"
)

func TestReactionInvalidRequestsPreserveStateAcrossTransports(t *testing.T) {
	cases := []struct{ tool, params string }{
		{"set_reactions", `{}`}, {"set_reactions", `{"reactions":"broken"}`},
		{"set_reactions", `{"reactions":"{}"}`}, {"set_reactions", `{"reactions":null}`},
		{"set_reactions", `{"reactions":[{}]}`}, {"set_reactions", `{"reactions":[null]}`},
		{"set_reactions", `{"reactions":[{"trigger":{},"actions":[{"type":"BACK"}]}]}`},
		{"set_reactions", `{"reactions":[{"trigger":{"type":"ON_CLICK"},"actions":[{}]}]}`},
		{"set_reactions", `{"reactions":[],"mode":"oops"}`}, {"set_reactions", `{"reactions":[],"mode":3}`},
		{"remove_reactions", `{"indices":"broken"}`}, {"remove_reactions", `{"indices":"{}"}`},
		{"remove_reactions", `{"indices":null}`}, {"remove_reactions", `{"indices":[-1]}`},
		{"remove_reactions", `{"indices":[0.5]}`}, {"remove_reactions", `{"indices":["0"]}`},
		{"set_reactions", `{"reactions":[{"trigger":{"type":"ON_CLICK"},"actions":[{"type":"SET_VARIABLE"}]}]}`},
		{"set_reactions", `{"reactions":[{"trigger":{"type":"ON_CLICK"},"actions":[{"type":"SET_VARIABLE_MODE"}]}]}`},
		{"set_reactions", `{"reactions":[{"trigger":{"type":"ON_CLICK"},"actions":[{"type":"UPDATE_MEDIA_RUNTIME"}]}]}`},
		{"set_reactions", `{"reactions":[{"trigger":{"type":"ON_CLICK"},"actions":[{"type":"CONDITIONAL"}]}]}`},
	}
	bridge, conn := setupBridgeWithClient(t)
	leader := &Leader{bridge: bridge}
	srv := httptest.NewServer(http.HandlerFunc(leader.handleRPC))
	defer srv.Close()
	direct := &Node{role: RoleLeader, leader: leader}
	follower := NewFollower(srv.URL)
	var mu sync.Mutex
	original := []string{"accepted reaction"}
	state := append([]string{}, original...)
	writes := 0
	go func() {
		for {
			var req BridgeRequest
			if err := wsjson.Read(context.Background(), conn, &req); err != nil {
				return
			}
			mu.Lock()
			writes++
			state = nil
			mu.Unlock()
			_ = wsjson.Write(context.Background(), conn, BridgeResponse{RequestID: req.RequestID, Data: map[string]any{"reactionCount": 0}})
		}
	}()
	for _, c := range cases {
		t.Run(c.tool+c.params, func(t *testing.T) {
			var params map[string]any
			if err := json.Unmarshal([]byte(c.params), &params); err != nil {
				t.Fatal(err)
			}
			ctx, cancel := context.WithTimeout(context.Background(), time.Second)
			defer cancel()
			a, err := direct.Send(ctx, c.tool, []string{"1:2"}, params)
			if err != nil {
				t.Fatal(err)
			}
			b, err := follower.Send(ctx, c.tool, []string{"1:2"}, params)
			if err != nil {
				t.Fatal(err)
			}
			mu.Lock()
			defer mu.Unlock()
			if writes != 0 || !reflect.DeepEqual(state, original) {
				t.Fatalf("invalid input wrote %d times; state %v", writes, state)
			}
			if a.Error == "" || a.Error != b.Error {
				t.Fatalf("direct=%q follower=%q", a.Error, b.Error)
			}
		})
	}
}

func TestReactionIntentionalInputsValidate(t *testing.T) {
	for _, c := range []struct{ tool, params string }{
		{"set_reactions", `{"reactions":[],"mode":"replace"}`},
		{"set_reactions", `{"reactions":[{"trigger":{"type":"ON_CLICK"},"actions":[{"type":"BACK"}]}],"mode":"append"}`},
		{"set_reactions", `{"reactions":"[{\"trigger\":null,\"action\":{\"type\":\"CLOSE\"}}]"}`},
		{"set_reactions", `{"reactions":[{"trigger":{"type":"ON_CLICK"},"actions":[{"type":"NODE","navigation":"SCROLL_TO","destinationId":"1:3","transition":null}]}]}`},
		{"remove_reactions", `{}`}, {"remove_reactions", `{"indices":[]}`}, {"remove_reactions", `{"indices":"[0,2]"}`},
	} {
		var params map[string]any
		if err := json.Unmarshal([]byte(c.params), &params); err != nil {
			t.Fatal(err)
		}
		if msg := ValidateRPC(c.tool, []string{"1:2"}, params); msg != "" {
			t.Errorf("%s %s: %s", c.tool, c.params, msg)
		}
	}
}

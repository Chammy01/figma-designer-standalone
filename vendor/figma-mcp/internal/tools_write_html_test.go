package internal

import (
	"encoding/json"
	"testing"
)

func TestValidateRPC_WriteHTML(t *testing.T) {
	tests := []struct {
		name    string
		tool    string
		nodeIDs []string
		params  map[string]interface{}
		wantErr bool
	}{
		{
			name:    "write_html valid",
			tool:    "write_html",
			nodeIDs: nil,
			params: map[string]interface{}{
				"html":         "<div>Hello</div>",
				"targetNodeId": "1:1",
				"mode":         "insert-children",
			},
			wantErr: false,
		},
		{
			name:    "write_html missing html",
			tool:    "write_html",
			nodeIDs: nil,
			params: map[string]interface{}{
				"targetNodeId": "1:1",
			},
			wantErr: true,
		},
		{
			name:    "write_html missing targetNodeId",
			tool:    "write_html",
			nodeIDs: nil,
			params: map[string]interface{}{
				"html": "<div>Hello</div>",
			},
			wantErr: true,
		},
		{
			name:    "write_html invalid targetNodeId format",
			tool:    "write_html",
			nodeIDs: nil,
			params: map[string]interface{}{
				"html":         "<div>Hello</div>",
				"targetNodeId": "bad-format",
			},
			wantErr: true,
		},
		{
			name:    "write_html invalid mode",
			tool:    "write_html",
			nodeIDs: nil,
			params: map[string]interface{}{
				"html":         "<div>Hello</div>",
				"targetNodeId": "1:1",
				"mode":         "invalid",
			},
			wantErr: true,
		},
		{
			name:    "write_html replace mode valid",
			tool:    "write_html",
			nodeIDs: nil,
			params: map[string]interface{}{
				"html":         "<div>Hello</div>",
				"targetNodeId": "1:1",
				"mode":         "replace",
			},
			wantErr: false,
		},
		{
			name:    "get_html valid",
			tool:    "get_html",
			nodeIDs: []string{"1:1"},
			params:  map[string]interface{}{},
			wantErr: false,
		},
		{
			name:    "get_html missing nodeId",
			tool:    "get_html",
			nodeIDs: []string{},
			params:  map[string]interface{}{},
			wantErr: true,
		},
		{
			name:    "get_html invalid nodeId",
			tool:    "get_html",
			nodeIDs: []string{"bad"},
			params:  map[string]interface{}{},
			wantErr: true,
		},
		{
			name:    "get_html invalid includeStyles",
			tool:    "get_html",
			nodeIDs: []string{"1:1"},
			params:  map[string]interface{}{"includeStyles": "invalid"},
			wantErr: true,
		},
		{
			name:    "get_html valid includeStyles",
			tool:    "get_html",
			nodeIDs: []string{"1:1"},
			params:  map[string]interface{}{"includeStyles": "classes"},
			wantErr: false,
		},
		{
			name:    "write_html_batch valid",
			tool:    "write_html_batch",
			nodeIDs: nil,
			params: map[string]interface{}{
				"slides": []interface{}{
					map[string]interface{}{"name": "Slide 1", "html": "<div>Test</div>"},
				},
			},
			wantErr: false,
		},
		{
			name:    "write_html_batch empty slides",
			tool:    "write_html_batch",
			nodeIDs: nil,
			params: map[string]interface{}{
				"slides": []interface{}{},
			},
			wantErr: true,
		},
		{
			name:    "write_html_batch invalid parentId",
			tool:    "write_html_batch",
			nodeIDs: nil,
			params: map[string]interface{}{
				"slides":   []interface{}{map[string]interface{}{"name": "S1", "html": "<div>T</div>"}},
				"parentId": "bad-format",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			msg := ValidateRPC(tt.tool, tt.nodeIDs, tt.params)
			if tt.wantErr && msg == "" {
				t.Errorf("expected validation error, got none")
			}
			if !tt.wantErr && msg != "" {
				t.Errorf("unexpected validation error: %s", msg)
			}
		})
	}
}

func TestStyleMappingJSONParsing(t *testing.T) {
	// Verify that our style mapping JSON format is parseable
	input := `{"heading-cover": {"textStyleId": "S:abc123", "paintStyleId": "S:def456"}, "body-text": {"textStyleId": "S:ghi789"}}`

	var parsed map[string]interface{}
	err := json.Unmarshal([]byte(input), &parsed)
	if err != nil {
		t.Fatalf("Failed to parse style mapping JSON: %v", err)
	}

	heading, ok := parsed["heading-cover"].(map[string]interface{})
	if !ok {
		t.Fatal("heading-cover not found or wrong type")
	}
	if heading["textStyleId"] != "S:abc123" {
		t.Errorf("expected textStyleId S:abc123, got %v", heading["textStyleId"])
	}
	if heading["paintStyleId"] != "S:def456" {
		t.Errorf("expected paintStyleId S:def456, got %v", heading["paintStyleId"])
	}

	body, ok := parsed["body-text"].(map[string]interface{})
	if !ok {
		t.Fatal("body-text not found or wrong type")
	}
	if body["textStyleId"] != "S:ghi789" {
		t.Errorf("expected textStyleId S:ghi789, got %v", body["textStyleId"])
	}
}

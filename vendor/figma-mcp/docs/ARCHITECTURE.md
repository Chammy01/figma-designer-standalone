# Architecture

MCP client → stdio JSON-RPC → Go MCP server → existing leader/follower localhost
bridge → Figma development plugin → native Figma Plugin API. Responses return
through the same unchanged path. The Svelte plugin UI owns bridge connection
settings. HTML, components, reactions and source collectors retain imported code.
The main package directory remains `cmd/figma-mcp-go` internally to avoid churn;
the public executable is `figma-designer-mcp.exe`.

Default address and handshake are unchanged. Plugin ID `figma-mcp-go` and
wildcard network permissions remain technical compatibility choices, not public
product names. Restriction/handshake/receipts/idempotency are deferred to V1.4.3B.

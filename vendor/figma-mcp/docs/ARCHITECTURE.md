# Architecture

MCP client → stdio → Go MCP server → leader/follower loopback bridge → Figma plugin → native API. Public binary figma-designer-mcp.exe; internal main folder remains cmd/figma-mcp-go.

Protocol 2 adds a compatible plugin capability check before mutations. MCP optional metadata reaches the plugin even through legacy argument adapters. The plugin serializes execution, checks preconditions and stores bounded receipts in local clientStorage before responding. No server-side replay or database. Read-only revision/receipt primitives share the inspection path.

Native writes are not transactional. Local receipt persistence cannot close the native-commit/storage-crash window. See RELIABILITY_V1_4_3B.md and PROTOCOL.md. Source collector projection and existing HTML/component/prototype algorithms remain unchanged.

Plugin technical ID and network permissions remain stable. Default bridge is loopback; explicit remote binds retain warnings.

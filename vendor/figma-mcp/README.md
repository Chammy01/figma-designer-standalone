# Figma Designer MCP

Maintained by Chammy01. Version **1.1.0** (additive reliability hardening; unreleased).

A writable Figma MCP server: MCP clients communicate over stdio with a Go server,
which bridges through localhost WebSocket to a Figma Desktop development plugin.
It creates editable native layers and exposes 108 tools (106 existing plus receipt/revision inspection), including
`combine_as_variants`. It does not use the Figma REST API.

## Setup

Build with Go 1.26.1 x64 and Bun 1.4.2; see [Building](docs/BUILDING.md).
Import `plugin/manifest.json` in Figma Desktop as a development plugin. Its display
name is **Figma Designer MCP**; the technical ID stays `figma-mcp-go` to preserve
existing imports. Open a non-sensitive design and run the plugin.

Configure a stdio-capable MCP client (OpenCode is the verified Figma Designer
client; other stdio clients need their own acceptance):

```json
{"mcpServers":{"figma-designer-mcp":{"command":"C:/path/bin/figma-designer-mcp.exe"}}}
```

Default bridge: `127.0.0.1:1994`. Existing address flags, bridge election, tools,
timeouts and reaction semantics are unchanged. Writes affect the connected file;
read back after indeterminate writes before retrying. No stable release or npm
package is published by this milestone.

## Provenance and license

Originally derived from [vkhanhqui/figma-mcp-go](https://github.com/vkhanhqui/figma-mcp-go).
Includes work derived from [tharuneswarj/figma-mcp](https://github.com/tharuneswarj/figma-mcp).
MIT; prior copyright and license notices are retained. Chammy01 claims only fork
modifications. [Exact import provenance](docs/PROVENANCE.md),
[compatibility](docs/COMPATIBILITY.md), [architecture](docs/ARCHITECTURE.md).

Prior docs retain historical toolkit versions; these are not a new feature
release. Plugin wildcard network permission is deliberately unchanged pending
V1.4.3B. Stateful conditional prototype workflows remain HOLD.

## Reliability

Version 1.1.0 adds optional operation IDs, fail-closed preconditions, scoped revisions and bridge protocol 2. Use a matched server/plugin pair. A timeout remains indeterminate: query its receipt and inspect before retrying. See [reliability guarantees and limits](docs/RELIABILITY_V1_4_3B.md) and [protocol](docs/PROTOCOL.md).

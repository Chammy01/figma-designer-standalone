# Architecture and preserved runtime

User prompt → OpenCode (`figma-designer` for slash commands) → local Figma MCP executable → localhost WebSocket bridge → Figma development plugin → editable native layers in the current design document. Native Orca is not required. The Figma REST API is not a replacement for this integration.

The approved executable is `bin/figma-mcp-go.exe`, supplied in the Windows release. Its startup version is `1.2.0-standalone-hardening`; upstream health diagnostics may still expose `1.3.0`. Plugin identity is established by the approved core hash, not that diagnostics constant. Public beta `v1.2.1-beta.1` is packaging/onboarding metadata; system version remains `1.2.1-standalone-source-freshness`. Manifest/report schemas remain 2; source projection is `figma-browser-source-v1`; fingerprint is `canonical-json-sha256-v1`.

The bridge defaults to `127.0.0.1:1994`. OpenCode's legacy numeric timeout remains 10000. Internal bridge/follower budgets are unchanged. The compatible ordinary-chat default remains `web-designer` and the configured model remains `opencode/space-bunny-free`. Legacy `orca.ps1` and both agents are retained; normal standalone instructions never invoke native Orca.

Production roots, the Component States frame, and the Interactive App section have separate ownership. States, flow, interactive, and motion follow the mandatory rules; QA/browser have zero Figma writes. Timed writes require stable read-back reconciliation.

Node browser export uses read-only live source capture, dependency closure, and two matching normalized reads. Begin/finish binds exports to source fingerprints and a run ID. Playwright reports browser acceptance separately from local/source/overall freshness. See [SOURCE_FRESHNESS.md](../SOURCE_FRESHNESS.md).

## Pinned vendor and local changes

`vendor/figma-mcp` is actual source, not a submodule. The original vendor Git metadata is excluded. Upstream [vkhanhqui/figma-mcp-go](https://github.com/vkhanhqui/figma-mcp-go) is pinned at `5806e71b8fd4bad97671038a0b010f04df1aaa41`. Intentional customizations include `combine_as_variants`, hardened reaction validation, structural HTML comparison, and the read-only browser-source collector. Do not reset, replace, upgrade, broadly format, or mass-normalize that tree. The existing plugin bun.lock is preserved byte-for-byte.

Local history, activation backups, freshness evidence, generated acceptance exports, and personal document identifiers are excluded. Historical audit/hardening/freshness reports were consulted locally; this repository records only sanitized release facts. See [Release packaging](RELEASE_PACKAGING.md).

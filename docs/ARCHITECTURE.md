# Architecture and preserved runtime

The V1.4 source application adds a localhost Node service and plain web UI over
authenticated OpenCode sessions. The service selects `figma-designer` and forwards
natural prompts or existing specialist commands. It does not duplicate routing,
authoring, QA, motion or browser logic. Credentials stay server-side; generated
previews use a separate local origin. See [Application foundation](FIGMA_DESIGNER_APP_V1_4_0.md) and [provider/model recovery](FIGMA_DESIGNER_APP_V1_4_1.md). The fixed local AI API sanitizes native catalogs, delegates connection credentials to OpenCode, and switches models only while the conversation is idle and reconciled. Only model IDs persist; interrupted work is inspected without automatic resend. A [validation adapter](FIGMA_DESIGNER_APP_V1_4_2.md) projects existing guarded QA metadata and browser artifacts into a fixed read-only API; it does not duplicate analyzers.

User prompt → OpenCode (`figma-designer` for slash commands) → local Figma MCP executable → localhost WebSocket bridge → Figma development plugin → editable native layers in the current design document. Native Orca is not required. The Figma REST API is not a replacement for this integration.

The owned executable is `bin/figma-designer-mcp.exe`, Figma Designer MCP 1.0.0, serverInfo.name `figma-designer-mcp`. Plugin diagnostics report 1.0.0. The existing OpenCode client alias `figma` is retained solely to preserve tool prefixes and critique/QA guards. Main vendors exact owned commit `a0b2e1c3e2ab2dd37c512fc3edeacb77a785a418` from [Chammy01/figma-designer-mcp](https://github.com/Chammy01/figma-designer-mcp). Beta 3 remains the immutable public rollback with the old runtime. System remains 1.2.1; schemas/projection/fingerprint versions are unchanged.

The bridge defaults to `127.0.0.1:1994`. OpenCode's legacy numeric timeout remains 10000. Internal bridge/follower budgets are unchanged. The compatible ordinary-chat default remains `web-designer` and the configured model remains `opencode/space-bunny-free`. Legacy `orca.ps1` and both agents are retained; normal standalone instructions never invoke native Orca.

Production roots, the Component States frame, and the Interactive App section have separate ownership. States, flow, interactive, and motion follow the mandatory rules; QA/browser have zero Figma writes. Timed writes require stable read-back reconciliation.

Node browser export uses read-only live source capture, dependency closure, and two matching normalized reads. Begin/finish binds exports to source fingerprints and a run ID. Playwright reports browser acceptance separately from local/source/overall freshness. See [SOURCE_FRESHNESS.md](../SOURCE_FRESHNESS.md).

## Pinned vendor and local changes

`vendor/figma-mcp` is a compatibility storage path for the owned pinned source, not an active upstream dependency. Its exact owned commit is recorded in APPROVED_RUNTIME.json. All approved local hardening, variants and conditional collector work is retained; dependencies are unchanged (only the lock root package name changes). Upstream attribution and the old approved record are preserved.

Local history, activation backups, freshness evidence, generated acceptance exports, and personal document identifiers are excluded. Historical audit/hardening/freshness reports were consulted locally; this repository records only sanitized release facts. See [Release packaging](RELEASE_PACKAGING.md).

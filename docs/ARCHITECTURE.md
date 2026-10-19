# Architecture and preserved runtime

The V1.4 source application adds a localhost Node service and plain web UI over
authenticated OpenCode sessions. The service selects `figma-designer` and forwards
natural prompts or existing specialist commands. It does not duplicate routing,
authoring, QA, motion or browser logic. Credentials stay server-side; generated
previews use a separate local origin. See [Application foundation](FIGMA_DESIGNER_APP_V1_4_0.md) and [provider/model recovery](FIGMA_DESIGNER_APP_V1_4_1.md). The fixed local AI API sanitizes native catalogs, delegates connection credentials to OpenCode, and switches models only while the conversation is idle and reconciled. Only model IDs persist; interrupted work is inspected without automatic resend. A [validation adapter](FIGMA_DESIGNER_APP_V1_4_2.md) projects existing guarded QA metadata and browser artifacts into a fixed read-only API; it does not duplicate analyzers.

Product, browser, and developer harness architectures are strictly distinct:
- **Product Architecture**: User prompt / Product App → OpenCode → workflows (`.opencode/agents/figma-designer.md` as sole primary agent) → local Figma MCP executable → localhost WebSocket bridge → Figma development plugin → editable native layers in the current design document. The Figma REST API is not a replacement for this integration.
- **Browser Architecture**: Browser export and regression testing use local Node and Playwright, strictly separated from Figma write operations.
- **Developer Harness Architecture**: OMP is the external developer harness. Native Orca is obsolete; do not search for, install, invoke, or require it. An absent executable is expected and not a blocker.

The owned executable is `bin/figma-designer-mcp.exe`, Figma Designer MCP 1.1.0, serverInfo.name `figma-designer-mcp`. Plugin diagnostics report 1.1.0; bridge protocol is 2. The existing OpenCode client alias `figma` preserves tool prefixes and critique/QA guards. Main vendors exact owned commit `c95e264350ecd4f13f11f4012cc13dcc96edc927` from [Chammy01/figma-designer-mcp](https://github.com/Chammy01/figma-designer-mcp). Two read-only tools bring the catalog to 108; the original 106 tools retain required inputs. Optional operation IDs, preconditions and page revisions add conservative recovery. The app uses verified receipt evidence before its existing reconciliation fallback, without automatic replay. See [reliability boundaries](FIGMA_DESIGNER_MCP_RELIABILITY_V1_4_3B.md). Beta 3 and the 1.0.0 approval remain historical rollback records. System remains 1.2.1; browser schemas/projection/fingerprint versions are unchanged.

The bridge defaults to `127.0.0.1:1994`. OpenCode's legacy numeric timeout remains 10000. Internal bridge/follower budgets are unchanged. The configured model remains `opencode/space-bunny-free`. The sole primary agent is `figma-designer` (`.opencode/agents/figma-designer.md`); legacy `web-designer` and legacy scripts like `orca.ps1` have been cut over and removed. Native Orca is obsolete.

Production roots, the Component States frame, and the Interactive App section have separate ownership. States, flow, interactive, and motion follow the mandatory rules; QA/browser have zero Figma writes. Timed writes require stable read-back reconciliation.

Node browser export uses read-only live source capture, dependency closure, and two matching normalized reads. Begin/finish binds exports to source fingerprints and a run ID. Playwright reports browser acceptance separately from local/source/overall freshness. See [SOURCE_FRESHNESS.md](../SOURCE_FRESHNESS.md).

## Pinned vendor and local changes

`vendor/figma-mcp` is a compatibility storage path for the owned pinned source, not an active upstream dependency. Its exact owned commit is recorded in APPROVED_RUNTIME.json. All approved local hardening, variants and conditional collector work is retained; dependencies are unchanged (only the lock root package name changes). Upstream attribution and the old approved record are preserved.

Local history, activation backups, freshness evidence, generated acceptance exports, and personal document identifiers are excluded. Historical audit/hardening/freshness reports were consulted locally; this repository records only sanitized release facts. See [Release packaging](RELEASE_PACKAGING.md).

## Desktop shell

V1.4.4 adds one sandboxed Electron window and an owned bundled-Node service sidecar. The existing service, OpenCode sessions, guards and MCP contracts remain authoritative. The renderer has only a fixed plugin-folder operation; previews receive no preload bridge. Persistent workspace data lives under the user profile. See [desktop architecture](FIGMA_DESIGNER_DESKTOP_V1_4_4.md) and [packaging decision](DESKTOP_PACKAGING_DECISION_V1_4_4.md).

## Agent Studio (V1.5.0 source)

The existing run observer translates tool names/statuses and authoritative run/recovery outcomes into an allowlisted shared activity model. No model call, workflow decision, extra Figma read, retry, or second transport is added. Existing run APIs carry current activity plus ten coalesced entries. The overhauled workspace renders locally prepared user-provided bedroom/character/CRT artwork; the Electron shell gains no privileges. See [activity architecture](AGENT_ACTIVITY_V1_5_0.md).

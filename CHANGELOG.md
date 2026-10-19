# Changelog

## v1.5.0-source — unreleased Agent Studio

Bedroom Agent Studio UI overhaul, deterministic activity translation, coalesced history and truthful waiting/recovery states. Cut over to figma-designer as sole primary agent; removed legacy web-designer instructions and obsolete Native Orca scripts/references. No MCP, workflow or Figma authoring change. Beta 4 is immutable; no new public release. Design-System Intelligence moves to V1.6.

## v1.2.1-beta.4 — Windows desktop prerelease

Per-user installer and portable app with bundled OpenCode 2.0.28, owned MCP 1.1.0/protocol 2, provider/model controls, structured validation, receipt-based recovery and isolated previews. Desktop package version remains 1.4.4. Unsigned; Beta 3 stays available for rollback and V1.2.5 remains HOLD. See [release notes](docs/RELEASE_NOTES_v1.2.1-beta.4.md).

## Unreleased — MCP ownership migration (V1.4.3A)

Adopts Figma Designer MCP 1.0.0 from Chammy01/figma-designer-mcp at an exact source pin. Public identity/module/binary/plugin branding changes; the 106-tool contract and runtime behavior remain equivalent. Approved hashes rotate with rollback provenance retained. Local validation package identity is v1.2.1-ownership.1; no release or Beta 4 is published, and Beta 3 remains immutable. V1.2.5 remains HOLD.

## v1.2.1-beta.3 — public prerelease checkpoint

Packages current design/briefing/routing/planner workflows, supported centered overlays, Interaction QA V2, the native motion audit, explicit smooth scrolling and browser motion parity. Approved runtime hashes, system 1.2.1 and MCP 1.2.0-standalone-hardening remain unchanged. V1.2.5 variables/conditionals remain HOLD. See [release notes](RELEASE_NOTES_v1.2.1-beta.3.md).

## v1.2.1-beta.1 — release candidate

Beginner-first README and Windows onboarding, safe setup, portable config template, community files/issue forms, offline CI, explicit source/release allowlists, approved runtime hash gates, ZIP/checksum tooling, and privacy review. No Figma write behavior, reaction/motion semantics, model/default agent, timeout, upstream revision, source fingerprint, or schema changes.

## V1.2.1 — automatic live source freshness

Read-only dependency-closed source projection; two matching captures; begin/finish export binding; automatic live comparisons in browser test/status; distinct acceptance and local/source/overall freshness. Plugin core adds an additive read-only collector. MCP executable and hardened write paths are preserved.

## V1.2 — hardened runtime

Reaction input validation at Go/plugin boundaries prevents malformed destructive writes. Structural HTML comparison reports missing/extra children without executable structural patches. Browser checks scope controls correctly, exercise reduced motion, restrict networking, and bind reports to local assets. Custom combine_as_variants and existing motion tokens remain preserved.

## Unreleased — Windows desktop candidate (V1.4.4)

Adds a thin Electron shell, bundled toolchain, per-user installer/portable packaging, profile-owned default workspace and interrupted-run checkpoint/reconciliation. MCP 1.1.0/protocol 2 and its approved hashes remain unchanged. Beta 4 is not published; Beta 3 stays immutable and V1.2.5 remains HOLD.

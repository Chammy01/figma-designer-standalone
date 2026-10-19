# Changelog

## v1.5.3-source — structural UI rebuild (Concept C: Design document)

Rebuilds the desktop interface around Concept C: Design document, replacing the room vignette and sidebar navigation with a continuous document hierarchy:
- Shell and Navigation: Top horizontal workflow bar organizing primary tasks (Studio, Prototype, QA, Browser) with separated utility destinations (Runs, Settings); minimal status footer with expandable connection and runtime details.
- Collaborative Studio: Top-placed multiline brief and revision composer in primary reading order, compact single-strip agent activity display (phase, factual status sentence, and expandable observed steps), and full-width two-column revision ledger pairing requests and outcomes.
- Prototype: Structured three-stage interaction planning sequence (Design context, Interaction intent, Read-only review) without speculative screen graphs or simulated playback proof.
- Review and Validation: QA two-column desk separating scope verdict and integrity evidence from findings; Browser local chapters (Preview, Behavior, Motion, Fidelity, Limitations) with persistent truth and artifact guard status.
- Management: Master-detail Runs journal with intent and outcome indexing; flat categorized Settings without nested cards.
- Design System: Monochromatic graphite visual system with strict luminance hierarchy, high-contrast focus indicators, responsive reflow down to 900 × 650, and reduced-motion support. All underlying MCP, sandbox, verification, recovery, and security boundaries remain unchanged.
- Documentation and Presentation: Updates repository README with V1.5.3 gallery captures and truthful captions, preserves Beta 4 as the recommended download, notes unchanged presentation privacy semantics, and includes rebuild design documentation in allowlists.

## v1.5.2-source — complete monochromatic UI/UX overhaul

Redesigns the full Figma Designer desktop interface around a cohesive monochromatic Deep Cool Slate (220° Hue) design system. Replaces muddy olive/khaki tones and decorative kickers with an editorial, professional creative tool hierarchy:
- Shell & Navigation: Responsive sidebar with custom SVG vector icons, minimal top bar chrome, and quiet status indicators.
- Collaborative Studio Workspace: Spacious layout with collaborative design conversation, prominent architectural prompt composer, and restrained agent companion vignette.
- Review Surfaces: Clean tabular QA review desk, 4-pillar Browser validation surface (Preview, Test, Motion, Fidelity), and master-detail Studio journal.
- Design System & Accessibility: Strict 11-step tonal scale (`--mono-50` to `--mono-950`), WCAG AA text contrast, high-contrast focus rings, and full reduced-motion support. All underlying reliability, read-only QA, and artifact guard boundaries preserved.

## v1.5.1-source — unreleased Browser Test artifact guard and workspace capability profile

Enforces explicit user-approved workspace-wide positive capability restriction: preserves exact approved 108 Figma MCP operations, finite Build write/edit/patch tools restricted to `.figma-designer/browser-prototype/`, fixed no-argument source begin/finish tools (`figma_browser_build_begin`, `figma_browser_build_finish`), and safe read tools. Denies generic shell, Node, PowerShell, Code Mode `execute`, delegation, and formatters across all workspace sessions. Collector-owned `figma-source.json` cannot be model-authored. All mutating callbacks hold atomic shared Build-write member leases through `finally`. Formatter execution is disabled at highest priority in owned-engine configuration (`OPENCODE_CONFIG_CONTENT` with `formatter: false`); unmanaged engines fail closed on the Build-write precondition. Direct canonical `BROWSER_TEST` launcher bypasses model interaction, preserving `workspaceSessionId`. Natural OpenCode Test allows only safe reads and the fixed no-argument `figma_browser_test_report` tool once per turn. Immutable artifact guard captures complete before/after SHA-256 snapshots and enforces atomic directory leases (`.figma-designer/browser-artifacts.lock`). Preserves truthful known 5 MEDIUM stroke-width and motion FAIL / parity UNVERIFIED findings. No OS sandbox claimed; no retrospective historical shell certification. Beta 4 remains immutable; no new release; V1.2.5 remains HOLD.

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

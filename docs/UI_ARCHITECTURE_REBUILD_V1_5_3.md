# V1.5.3 workspace architecture rebuild implementation plan

> **For agentic workers:** Use executing-plans for parent integration and bounded subagents for independent verification work. Preserve all backend/security truth.

**Goal:** Replace room-first Studio and vertical application rail with Concept C's workflow navigation and design document, across every named surface.

**Architecture:** Keep the current vanilla HTML/CSS/module stack, hash routes, structured activity and normalized validation contracts. Replace HTML composition and styles; adapt renderer only for record hierarchy, selected categories, status disclosure and accessible navigation. No new state store or dependency.

**Tech stack:** Existing Electron, local Node server, vanilla DOM/CSS, Playwright, Node test runner, pinned MCP/plugin/Go.

**Spec:** [Concept selection](UI_ARCHITECTURE_CONCEPT_SELECTION_V1_5_3.md), [audit](UI_ARCHITECTURE_REBUILD_AUDIT_V1_5_3.md), [design system](UI_ARCHITECTURE_DESIGN_SYSTEM_V1_5_3.md), PRODUCT.md and the product-owner V1.5.3 task.

## Global constraints

MCP 1.1.0, protocol 2, 108 tools, combine_as_variants present. V1.2.5 HOLD. No MCP/backend behavior changes, no Native Orca, no release publication or Beta 3/4 edits. Browser Test freeze/capabilities/SHA-256/fail-closed semantics and QA/critique read-only contracts unchanged. Preserve unrelated dirty artwork and critique assertion deletion. Do not resolve live uncertainty or submit live design tasks for screenshots.

## Scope map

| File | Responsibility/change |
|---|---|
| app/web/index.html | New top shell, document Studio, contextual evidence/preferences composition; existing functional IDs remain where useful. |
| app/web/styles.css | Replace old composition entirely with graphite tokens, document/ledger/evidence layouts and reflow. |
| app/web/agent-presence.js | Preserve semantic mappings and sanitized details; remove scene/image dependencies. |
| app/web/agent-presence.css | Compact activity strip, observed steps and no constant animation. |
| app/web/app.js | Route fallback/focus, record semantics, unified status and local category selection; submission/recovery logic unchanged. |
| app/web/validation.js | Existing normalized findings rendered into retained IDs; category composition belongs to HTML. No status policy changes. |
| scripts/figma-app-ui.test.mjs | Replace incidental token assertions; maintain behavior and keyboard contracts. |
| scripts/figma-agent-presence-ui.test.mjs | Remove obsolete room/sprite presentation checks; preserve activity, recovery, secrets and asset-serving security checks. |
| scripts/figma-app-validation-ui.test.mjs | Adapt category visibility while retaining evidence truth and filters. |
| scripts/figma-ui-rebuild.test.mjs | Focused new architecture/reflow/keyboard/long-content acceptance using existing fixture engine. |
| package.json | Include new behavioral UI acceptance in existing UI regression entrypoints. No dependency changes. |
| docs/* and ai-memory/* | Required design/evidence/acceptance and continuity updates. Allowlists include only permanent intended distribution docs/assets. |

Existing callers of composer, routes, activity, run rendering, provider setup and validation are mapped in the audit. Retain their IDs, not their old layout. No exported API changes. Backend app/shared/result-contract and all security policy files remain unchanged.

## Review focus

1. Latest waiting question/recovery must not disappear below closed history disclosure.
2. Long unbroken prompt/result/error must wrap without widening a pane.
3. Unknown hash must not yield a blank screen; navigation remains keyboard-accessible.
4. Switching Browser categories must not mask failure/stale/integrity evidence or reinterpret historical PASS.
5. Settings controls retain busy/reconciliation locks and provider secret clearing.

## Tasks and checks

### 1. New shell and Studio document

- [ ] Add failing runtime assertions for horizontal labeled navigation, top command geometry, readable revision document, unknown-route fallback and no scene dominance.
- [ ] Run focused new acceptance and record expected failure before changing product code.
- [ ] Replace shell/Studio HTML and CSS; remove rendered artwork, not source assets.
- [ ] Adapt activity renderer to text/observed steps; preserve every phase mapping and technical whitelist.
- [ ] Adapt record headers to request/purpose/time and outcome columns; preserve full-request expansion, questions and recovery controls.
- [ ] Verify source runtime screenshot at 1320×860 and 900×650 after shell and Studio checkpoints.

### 2. Secondary surfaces

- [ ] Compose Prototype as intent/capability/readiness sequence with existing action, no fake flow objects.
- [ ] Compose QA as verdict/integrity context beside findings/filter.
- [ ] Compose Browser with local evidence chapter controls: Preview/Behavior/Motion/Fidelity/Limitations, all existing evidence IDs intact.
- [ ] Compose Runs as selectable intent index and full record inspector; Settings as contextual category preferences.
- [ ] Keep errors in document flow and uncertainty language/actions unchanged.
- [ ] Inspect QA/Browser and Runs/Settings checkpoints in actual rendered app.

### 3. Behavioral and responsive verification

- [ ] Update only presentation-specific tests; never re-pin incidental CSS values/source text.
- [ ] Exercise all user-listed 38 acceptance concerns through existing tests plus focused new behavior checks and runtime capture matrix.
- [ ] Validate 1440×900, 1320×860, 1200×800, 1024×720, 900×650 and zoom/reflow, contrast, keyboard/focus, labels, reduced motion, long prompt/error.
- [ ] Run npm contracts, all browser/UI, activity/manual recovery/provider-model, Build/Test/guard, motion/fidelity/QA/critique, desktop/setup/privacy/plugin, Go tests/vet through existing entrypoints.
- [ ] Build Windows candidate without publishing; validate payload, startup, single-instance, provider/settings, recovery and preview isolation. Report inaccessible live prerequisites truthfully.

### 4. Acceptance and delivery

- [ ] Capture final permanent evidence and compare grayscale silhouette to baseline; label fixture evidence.
- [ ] Obtain independent visual and advisor reviews, fix material findings and recapture.
- [ ] Update README only with truthful current-development screenshots and unreleased version notice; CHANGELOG and architecture/privacy docs only where behavior warrants.
- [ ] Refresh project memory and Graphify.
- [ ] Commit explicit task-owned files only; exclude existing dirty artwork and critique assertion change. Push final head and require node-contracts/plugin/go/desktop SUCCESS on that exact SHA.
- [ ] Deliver all 65 requested report items; PASS only after every required gate, otherwise HOLD with exact missing evidence.

## Execution decisions

The product owner explicitly delegates architecture selection and implementation; no design preference interview is needed. Work remains in the existing checkout to preserve the inspected local context; only explicit task-owned paths will be staged. Temporary fixture state is isolated from the real recovery store. Native work is not replayed or accepted as part of this UI rebuild.

## Verification ledger

Pending implementation. Baseline app and all six surfaces captured at both audit sizes. Baseline state fixtures captured at both sizes. These observations are not final acceptance.

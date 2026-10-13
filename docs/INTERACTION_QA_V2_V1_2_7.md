# Interaction QA V2 — V1.2.7

QA verifies intended behavior; Critique judges visual quality. This upgrades
`/figma/qa` and its natural-language continuation, with no new slash command,
MCP capability, Figma writer or runtime change. V1.2.5 remains HOLD.

## Architecture and evidence

The command reads `rules/figma-interaction-qa.md`. The pure shared model in
`rules/figma-interaction-qa.mjs` adapts existing document/native source inspection.
`scripts/figma-interaction-qa.mjs` collects through the approved localhost bridge
using a closed read-tool allowlist, before/after document and source snapshots,
and complete reaction arrays. This internal CLI is not a user-facing command.
Source closure failure (for example a missing destination) falls back to existing
raw reaction/component reads; incomplete required reads fail verification.
Source projection version and collector semantics are unchanged.

Inventory includes reacted nodes, verified control-family instances and concrete
control affordances, even without reactions. Plain prose, headings and control
labels are excluded. Underlined text and explicit source/user annotations can add
text links, icon controls, clickable rows/cards, tabs and real menu options.
Discovery is structural and conservative; a model must resolve meaningful controls
that heuristics miss. A node name alone never establishes a destination or rule.

Each control records its actual ID, role, screen, source counterpart when known,
actual instance COMPONENT/set, expected behavior, actual reactions and evidence.
Expected behavior requires a specific supplied source/user statement and VERIFIED
or STRONG confidence. An unsupported claim of confidence without a source cannot
create a defect. Do not invent validation, payment, authentication, tab choices,
menu actions, return requirements or missing destinations.

VERIFIED means direct native readback; STRONG means corroborated source/user intent;
LIMITED means a capability/evidence boundary. Structural path validation is not
manual prototype playback, visual hit-testing or exhaustive usability testing.

## Graph and journeys

Typed nodes: SCREEN, OVERLAY, STATE_VARIANT, EXTERNAL_URL, SCROLL_TARGET.
Edges: NAVIGATE, CHANGE_TO, OPEN_OVERLAY, CLOSE, BACK, SCROLL_TO, SWAP, URL.
Inspect descendant controls and source variants, not only screen-root reactions.
Validate complete triggers/actions, real destinations/types/ownership, same-set
CHANGE_TO, duplicate equivalent edges, stale/missing variants, actual component
source, Disabled behavior and source-required states. Do not demand every possible
state. Detached controls are broken only when inheritance is actually required.

Starts come from supplied journey evidence or graph roots, never leftmost canvas
position. Reachability distinguishes screens and overlays. Scenarios track screen,
Back history, overlay stack/context and real state variants; overlay SWAP retains
the underlying base. CLOSE must return to an established overlay context. A
terminal with no required continuation is VALID_TERMINAL; an evidenced missing
continuation is DEAD_END. Conditional/multiple-location execution is LIMITED,
not a certified path. Known contextual limitations do not become unreachable-control
defects. Required unreachable destinations and primary failed paths remain defects.

## Classification, severity and stable report

Exclusive control totals:

| Class | Meaning |
| --- | --- |
| WORKING_ACTION | Verified eligible action exists. |
| WORKING_STATE | Verified state reaction exists without a separate action. |
| FIGMA_LIMITED | Real requested behavior exceeds the current native contract. |
| INTENTIONALLY_INERT | Source/fixture explicitly excludes behavior. |
| UNKNOWN_EXPECTATION | Meaningful control has no evidenced behavior rule. |
| BROKEN | Implementable intended behavior or actual supported wiring is defective. |

An action control can also have inherited state facets. Report facets separately
rather than double-counting exclusive totals. Existing reactions do not imply that
all possible behavior is implemented.

Severity: BLOCKER for unsafe ownership/integrity or failed required primary path;
HIGH for major intended behavior; MEDIUM for secondary/duplicate integrity defects;
LOW for non-blocking consistency observations; LIMITATION for capability boundaries.
Stable findings are sorted by severity, actual affected IDs and code, then numbered
Q01… Each has Problem, Why it matters, Evidence/grade/IDs, Expected, Actual and
recommended narrow workflow. Recommendations never execute.

PASS requires complete verification, valid supported paths and no defects.
WARN preserves native limitations, intentionally inert/undefined behavior and minor
observations. FAIL covers broken expected behavior, invalid ownership/destinations,
required failed paths, incomplete required evidence, forbidden tool calls or changed
protected fingerprints. A repaired mutation still fails QA. No numeric score.

Example from the retained contextual menu:

```text
FIGMA_INTERFACE_QA: WARN
Coverage: FIGMA_LIMITED=1; BROKEN=0
Q01 — LIMITATION — FIGMA_LIMITED
Problem: Contextual destination configuration is readonly
Why it matters: Current Plugin API cannot configure that destination.
Evidence: LIMITED; IDs 47:36, 47:43
Expected: Contextual placement
Actual: Destination not suitably preconfigured
Recommended next workflow: INTERACTIVE (not executed)
Production/document: unchanged
WRITE_CALLS: 0
```

## Ownership, overlays, geometry and motion

Production is read-only. Runtime is the single canonical Interactive App SECTION;
component-state masters belong in the canonical library. Legacy/canonical ambiguity,
wrong parents, runtime masters and production destinations fail. Semantic duplicate
checks require source/role plus equivalent anatomy, not names alone. Intentional
repetition is allowed. Missing source-mapped content/empty wrappers are defects.

CENTERED_MODAL works; PRECONFIGURED_OVERLAY is conditional on real native settings.
Autonomous contextual configuration remains FIGMA_LIMITED. A centered substitute
for a contextual request is BROKEN. Required Close, actual OPEN destination and
return context are checked. Missing settings mean incomplete evidence, not a
fabricated native limitation. Required unconfigured outside-click/background
behavior remains limited. No overlay properties or reactions are altered.

Semantic Motion uses the central registry/tolerances to report MATCH, MISMATCH,
LIMITED or UNKNOWN. No transition normalization. No canvas-derived spatial meaning.
Geometry uses matching parent-relative coordinates: valid control bounds, SECTION
containment, accidental independent-screen overlap and source-established order.
Rotated/scaled ancestry is reported uncertain instead of compared incorrectly.
Overlay canvas positions are not native playback positions. Rendered overlap,
clipping, text wrapping and actual hit-testing need separate visual/playback evidence.

## Fingerprints and no-repair boundary

Document fingerprints cover full page structure, IDs/types/names, bounds, child
order, content/style values; unstable document-local fill/stroke alias labels are
resolved to their actual values. Source closure adds complete reactions, component
source/families and referenced variable metadata. Raw fallback hashes reactions,
instances and component registry separately. Missing fingerprint evidence fails.
Compare both snapshots and trace. Any forbidden Figma tool or changed fingerprint
forces FAIL. The collector exposes only reads; the pure analyzer has no transport.
Command/planner instructions forbid repairs, cleanup, exports and authoring.
This is not a new persistent session guard; the independent critique guard is intact.

## Router and Prototype Planner

“Is this fully wired?”, “Check the checkout flow” and “Find dead buttons” route to QA.
“Does this look good?” routes to critique; explanation stays informational.
“Fix whatever QA finds” performs read-only QA first, without auto-chaining repairs.
A later explicitly bounded authoring request is a separate operation.

Planner QA is always terminal. It consumes QA_STATUS, BLOCKER_COUNT, HIGH_COUNT,
MEDIUM_COUNT, LOW_COUNT, LIMITATION_COUNT, BROKEN_CONTROL_COUNT, UNREACHABLE_COUNT,
BROKEN_EDGE_COUNT. QA FAIL cannot become planner success; no self-repair loop.
Browser QA stays separate. Missing browser exports do not fail native Figma QA.
Readable stateful JSON does not certify SET_VARIABLE/CONDITIONAL execution;
router/planner/QA stateful enablement remains deferred under V1.2.5 HOLD.

## Deterministic acceptance

54 QA tests cover fixtures A–T: valid flow, dead primary, inert, missing/production
destination, same/cross-family states, duplicate edge, unreachable required screen,
valid terminal, required dead end, modal OPEN/CLOSE, contextual limitation, false
centered substitute, motion mismatch, wrong source family, detached control,
source-established order, duplicate runtime and legacy ambiguity.
Additional tests cover reactionless discovery, labels versus prose, typed graph,
state paths, Back/overlay SWAP return context, actual sources, missing variants,
Disabled, full triggers, scoped geometry/uncertainty, semantic duplicates, stable
findings, conditional limitation, fingerprint sensitivity, zero-write transport,
closed fallback inspection, command/planner packaging and unchanged critique guard.
These are synthetic/native-shaped structural fixtures, not mocked playback proof.

Six tool-free model cases passed real provider classification for fully wired, visual
quality, checkout flow, dead buttons, QA-first repair and explanation. No Figma
writes or planning of invented repairs is permitted.

## Live read-only acceptance

Existing non-sensitive Untitled, page 9:306. No acceptance nodes created or repaired.
The retained V1.2.6 fixtures supply real source/intent; scopes below are explicit.

| Case | Observed result |
| --- | --- |
| A healthy details modal | PASS: 47:34 opens CENTER overlay 47:38; real Close 47:41 returns to base 47:32. 2 WORKING_ACTION controls, 1 inherited state facet; no findings. |
| B contextual menu | WARN: reactionless Status 47:36 targets supplied 47:43 contextually. Q01 CONTEXTUAL_LIMIT; 1 FIGMA_LIMITED, 0 BROKEN. No fake centered opener. |
| C complete mixed coverage | WARN: 3 WORKING_ACTION, 1 FIGMA_LIMITED, 1 fixture-defined INTENTIONALLY_INERT, 3 UNKNOWN_EXPECTATION menu options; 2 inherited state facets. Modal, café-menu and real Default→Hover→Pressed paths pass structurally. |
| D descendant reachability | WARN for explicitly inert Visit us only; Café 36:720 → Menu 36:739 through INSTANCE 36:815 passes. Menu is a valid terminal, not a guessed missing Back defect. |
| E repeat | C repeated with identical findings/IDs/order, classifications, graph and paths. |

There is no standalone state-only runtime control in these retained artifacts.
Inherited state facets and the actual 34:709→34:712→34:715 source path prove state
inspection without inventing a new fixture. Visit us is excluded from the retained
fixture's defined navigation journey; absent destinations are not fabricated.
Menu items All/Active/Delayed are inventoried explicitly from actual text nodes
47:45/47:46/47:47; no selection rule is invented.

Each collector case uses 6 reads, zero writes, matching before/after fingerprints.
Independent page and 8 complete reaction-array checks bring the five-case harness
to 48 reads / 0 writes. Canonical command and ordinary-chat QA also passed through
the real OpenCode session/provider with plain first-line markers. Direct read
aliases, closed collector traces and independent snapshots verify zero Figma writes.
The first model answer added a prefatory sentence/heading; the command was tightened
and a fresh-session repeat verified the final format. One deep design-context read
timed out; the bounded collector succeeded without a write or repair.

Document fingerprint (alias-normalized full page):
`a8c1c5af049e0788b2e8794ca422fd6dbfb9a9b6f71c14e1ae5343bd45e0819e`.
Runtime/dependency source fingerprint:
`305132db06a84df82351b91fbc02f99f028e5d9a4cc29289d4e5cfb78afdd204`.
Protected production IDs: 10:307, 10:783, 28:283, 29:464; entire current page and
state/runtime source closure are compared, not just node counts.

Live evidence is structural; no new manual playback campaign or Figma writes.
Prior native overlay playback is not presented as new V1.2.7 playback proof.

## Regression and limitations

Local regressions: 250 npm contracts (54 new QA tests), 275 plugin tests, 97
hardening/variants/source tests, 6 browser fixtures, 1 installed OpenCode check,
30 setup fixtures, release/source/privacy/hash checks: all pass. A clean source
archive built all three exact approved runtime artifacts; canonical release
extraction/setup and repeated setup without Go/Bun passed. This temporary package
is regression evidence only, not a republished Beta 2 asset. Hosted CI also runs
Go tests/vet and clean archive/package checks on the exact pushed revision.
Approved runtime metadata and all three bytes remain unchanged; 14 commands remain.
No dependency, source projection version, MCP/plugin/browser runtime or hash change.

Model judgment still determines intended behavior, meaningful affordances and
annotation usefulness. Names never prove product logic. Graph reachability is not
full Figma playback; dynamic/stateful/conditional and uncertain composite action
semantics remain limited. Native contextual configuration and V1.2.5 plan blocks
are unchanged. Missing visual evidence is never replaced by aesthetic QA claims.

## Files changed

- `.opencode/commands/figma/qa.md`
- `rules/figma-interaction-qa.md`
- `rules/figma-interaction-qa.mjs`
- `rules/figma-intent-router.mjs`
- `rules/figma-prototype-planner.md`
- `scripts/figma-interaction-qa.mjs`
- `scripts/figma-interaction-qa.test.mjs`
- `scripts/fixtures/interaction-qa.mjs`
- `scripts/setup.test.ps1`
- `setup.ps1`
- `package.json`
- `docs/COMMANDS.md`
- `docs/SOURCE_ALLOWLIST.json`
- `docs/RELEASE_ALLOWLIST.json`
- `docs/INTERACTION_QA_V2_V1_2_7.md`

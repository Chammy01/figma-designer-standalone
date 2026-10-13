# Native smooth scroll motion — V1.3

V1.3 productizes only the narrow scroll subset established by the
[V1.2.8 native audit](FIGMA_MOTION_CAPABILITY_AUDIT_V1_2_8.md). There is no new
command, MCP operation, plugin/runtime change or browser implementation.
`/figma/motion` remains a finishing workflow on existing reactions.
V1.2.5 remains **FIGMA_STATEFUL_VARIABLES: HOLD**.

## Two scroll meanings

| User intent | Semantic | Behavior |
| --- | --- | --- |
| "Scroll to Details" / existing ordinary section link | SCROLL_NATIVE | Preserve the existing SCROLL_TO transition, including null or an already present transition. Zero motion writes. |
| "Scroll smoothly to Details" / "Animate this existing scroll" | SCROLL_SMOOTH | Verify the existing edge and prepared native context, then propose the canonical SCROLL_ANIMATE transition only. |
| Unclear "make scrolling smoother" | Target clarification | Ask one concise question if context does not identify the existing interaction. No write while unresolved. |

Generic "subtle" or "less motion" does not automatically animate scroll actions.
Neither a wiring request nor an aesthetic critique authorizes scroll animation.

The authoritative registry is [figma-motion-semantics.mjs](../rules/figma-motion-semantics.mjs):
SCROLL_SMOOTH is `SCROLL_ANIMATE`, **0.20 seconds**, `EASE_OUT`, with duration
tolerance **0.195–0.205**. Dedicated V1.3 native testing accepted the shape and
returned `0.20000000298023224`; Desktop playback showed intermediate viewport
movement and then the intended Details region. Exact elapsed timing/curve
conformance is not claimed. Existing state/navigation/spatial/overlay tokens
retain their original definitions.

## Preconditions and truthful limits

Before writing, read the complete plural reaction array and resolve the actual
intended existing child destination. Verify runtime ownership, source/target
ancestry, native `overflowDirection`, a shared prepared container and meaningful
content overflow using matching parent-relative geometry.

The approved read-only browser-source projection already exposes native overflow
and the required structure. `inspectScrollContext` consumes these current native
records; it does not discover or write Figma itself. It validates reciprocal child
relationships, owned canonical runtime, native overflow axes, visible axis-aligned
geometry and content extents. No fabricated evidence flag may replace inspection.

`NONE` or insufficient overflow yields **FIGMA_LIMITED: SCROLL_CONTEXT_PREPARATION**.
Missing/conflicting/ambiguous structure yields **UNKNOWN**. Both make zero motion
writes. Frame height, names, canvas positions, clipping and HTML `overflow:hidden`
are insufficient by themselves. Complex fixed/sticky, rotated or conflicting
nested contexts require further native evidence; skip uncertain cases.

Native scroll-context preparation has no approved deterministic public setter.
This workflow never resizes/rebuilds screens, writes private properties, uses UI
automation or adds a setter to manufacture scrolling. A user-prepared or existing
valid context may be reused. During acceptance, the user prepared exactly one
disposable frame; the structurally similar second frame retained native NONE.

## Transition-only safety and idempotence

Only an existing owned `NODE + SCROLL_TO` may receive SCROLL_ANIMATE. It is rejected
for NAVIGATE, CHANGE_TO, OVERLAY, SWAP and non-NODE actions. Non-approved existing
scroll transitions are preserved as limited; custom scroll durations, springs,
Bézier curves and presets are not enabled.

Lossless complete reaction arrays remain mandatory. The proposal changes only
the exact eligible transition and keeps the deprecated singular `action` mirror
equivalent to `actions[0]`. Counts, triggers/fields, action types, navigation,
destinations, scroll/video flags, overlay fields and unrelated actions remain
identical. The existing dependent-instance projection check also applies to scroll:
uncertain inherited reaction effects prevent a new transition write; already matching
tokens remain no-ops. Conflicting same-trigger location actions or uncertain reconstruction
prevent writes. Read back immediately and compare every non-transition field.
Timeout means indeterminate: stabilize/read/reconcile before retrying missing work.

Equivalent float32 values and repeated requests yield **MOTION_ALREADY_NORMALIZED**,
zero writes. Unauthorized, audit, production and state-library scroll proposals
cannot author this runtime-only feature. The helpers remain pure; existing
specialist ownership and write contracts remain authoritative.

## Router, planner and QA

No new route exists. A single explicit smooth-scroll request uses MOTION; ordinary
wiring remains FLOW/INTERACTIVE where the existing contract can truthfully handle
it; correctness checks use QA; aesthetic reviews use CRITIQUE. A broad interactive
goal explicitly including smooth scrolling uses Prototype Planner.

Planner reuses existing runtime/state work, establishes a prerequisite edge only
if an existing specialist supports it, verifies native context, then passes
SCROLL_SMOOTH semantically to motion. Matching tokens are no-ops. Missing preparation
limits only that portion; no invented screen/navigation substitute or V1.2.5 phase.
QA is terminal/read-only; no automatic repair after it.

QA annotations can express `motion: {intent: "SCROLL_SMOOTH"}` for an explicit user
requirement. QA derives context from current native nodes, overriding supplied
context flags. Its motion rows report:

| Evidence / actual result | QA motion status |
| --- | --- |
| No smooth expectation; existing null/current scroll | SCROLL_NATIVE / MATCH |
| Smooth expectation, prepared context, canonical transition | SCROLL_SMOOTH / MATCH |
| Smooth expectation, prepared context, missing/wrong canonical transition | MISMATCH / BROKEN |
| Native context unprepared | LIMITED / FIGMA_LIMITED, not BROKEN |
| Required native evidence unavailable or conflicting | UNKNOWN |

QA does not modify the document or prepare containers. Structural MATCH is separate
from observed native playback.

## Source, browser and intentionally excluded capabilities

Source projection remains `figma-browser-source-v1`: it already preserves full
reaction arrays, SCROLL_ANIMATE, native floats, duration, easing and destination.
No collector or projection-version change is required.

**BROWSER_SCROLL_MOTION_PARITY: NOT_IMPLEMENTED.** Native acceptance does not imply
browser parity. The browser command reports this limitation when the source contains
SCROLL_ANIMATE; its implementation is unchanged. No browser artifact is generated.

Experimental audit results remain disabled: shared-element preparation/layer
renaming, matchLayers authoring, new easing families or custom spring/Bézier,
SWAP motion, timed sequences, MOVE_IN overlay expansion and arbitrary navigation
Smart Animate. Timeline/keyframes, parallax, continuous and scroll-driven motion
remain outside the supported contract. Reduced-motion policy remains conservative
authoring, without OS preference detection.

## Tests and acceptance

The dedicated contracts cover default preservation, compatible actions, exact
destination/native context, fail-closed geometry/ancestry, complete arrays/mirrors,
immutability, conflicting actions, float no-ops, language policy, planner order,
read-only QA, browser limits, unchanged hashes/guard and V1.2.5 HOLD.

The [retained native evidence](../scripts/fixtures/native-scroll-live.json) records
full before/after reaction arrays, real native context and playback separately.
Natural-language cases ran through OpenCode 2.0.24 and the existing Figma agent,
using the unchanged local MCP/bridge/plugin.

| Case | Observed result |
| --- | --- |
| A — "Scroll smoothly to Details" | MOTION route; one exact transition write on 70:827; native SCROLL_ANIMATE .20 EASE_OUT readback; every non-transition field/mirror unchanged. Fresh Desktop presentation showed an intermediate viewport position, then the green Details child at the content-end limit. |
| B — "Make this scroll smooth" | MOTION; MOTION_ALREADY_NORMALIZED; zero writes; identical arrays/source fingerprint. |
| C — ordinary "Scroll to Details" | Existing-motion preservation in the current conversation; native null on 70:829 retained; zero writes. No automatic animation. New wiring remains FLOW/INTERACTIVE where supported. |
| D — unprepared twin | MOTION; native NONE read back; FIGMA_LIMITED: SCROLL_CONTEXT_PREPARATION; zero writes or preparation. |
| E — bounded interactive + smooth goal | PROTOTYPE_PLANNER; runtime/state/edges reused, SCROLL_SMOOTH after the edge/context, terminal read-only QA PASS. Final rerun reused normalized motion with zero writes. |
| F — accepted-fixture QA | QA route; two SCROLL_SMOOTH MATCH and one SCROLL_NATIVE MATCH; verified native child/context; QA PASS, six read calls and zero writes; fingerprints unchanged. |

The first E attempt correctly ended **FAIL**: the acceptance harness had positioned
the two temporary frames outside the canonical SECTION bounds. The planner completed
one valid transition, then stopped at terminal QA without repair. A separate fixture
setup correction moved only those temporary frames inside existing bounds and made
the unprepared twin shorter to fit unused space; native NONE stayed unchanged. No
production or canonical SECTION geometry changed. The final planner rerun preserved
completed motion and passed QA without rewriting it. This failure is retained, not
converted into a passing first attempt.

One preliminary harness prompt used OpenCode's default web agent because `agent`
on the prompt payload did not select the session agent. Its single scoped transition
write is included in counts but excluded from routing acceptance. The existing
read-only status command selected the canonical Figma agent; A–F then exercised
actual natural-language routing. No default-agent or routing architecture change.

Recorded lower bounds: **18 writes / 196 reads** across harness/direct MCP logs.
Writes comprise 15 fixture setup/probe/reset/correction/cleanup operations and three
model transition writes (preliminary prompt, accepted A, initial E). The final
planner rerun, B/C/D and QA made zero writes. Additional read-only source/shell/QA
calls are not all represented in direct MCP metadata. No native write timeout or
reconciliation event occurred. No protected node was a write target.

Cleanup removed all **24** same-run nodes. Original page count **1290** and exact
normalized document SHA `a8c1c5af049e0788b2e8794ca422fd6dbfb9a9b6f71c14e1ae5343bd45e0819e`
and canonical runtime/dependency source SHA
`305132db06a84df82351b91fbc02f99f028e5d9a4cc29289d4e5cfb78afdd204`
were restored. Two subsequent source captures were stable, zero writes; health
returned ok/recentErrorCount 0. Production, canonical states/runtime and approved
Beta 2 runtime hashes remain unchanged. No acceptance nodes/reactions remain.

Local regressions: **323 npm contracts** (40 dedicated V1.3 tests), **275 plugin**,
**112 approved-dispatcher hardening/variants/source** (71 source), **6 browser** and
**1 installed OpenCode** test passed. **30 setup fixtures**, clean source archive
build, package extraction/setup, source/release/privacy checks and approved runtime
hash checks passed locally. Hosted CI must verify the exact pushed commit, including
Go tests/vet and a fresh archive/package build; an old green run is not evidence.
The old ignored QA BOM-prefixed evidence is preserved untouched; release checking
uses clean candidate source rather than altering unrelated local evidence.

Known limits: intent interpretation is model-guided; native context must already
exist; helpers do not certify all fixed/sticky/nested contexts or playback; browser
parity, OS reduced-motion switching and experimental audit capabilities remain off.

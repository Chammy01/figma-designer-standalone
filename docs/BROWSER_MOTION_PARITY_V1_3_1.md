# Figma ↔ browser motion parity foundation — V1.3.1

The existing browser export now has an explicit, tested mapping for shipped semantic
motion. This does not reproduce Figma's renderer or expand native motion authoring.
No command, framework, MCP capability, Figma write or runtime/hash rotation was added.
Published v1.2.1-beta.2 assets are unchanged; this is a main-source milestone.
V1.2.5 remains **FIGMA_STATEFUL_VARIABLES: HOLD**.

## Architecture and parity boundaries

`rules/figma-motion-semantics.mjs` remains the canonical native token registry.
`rules/figma-browser-motion.mjs` translates captured nativeAction + verified source
evidence into descriptors. It does not execute writes. `browserMotionSource` embeds
the dependency-free implementation from `scripts/figma-browser-motion-runtime.mjs`
in generated app.js. Source HTML/CSS/content and native-backed variant properties
are still inspected and exported by the browser workflow; no general native renderer
or new exporter service is introduced. The command's file writes remain inside
`.figma-designer/browser-prototype/`.

| Classification | What it means |
| --- | --- |
| BEHAVIORAL_PARITY | Supported observable browser behavior matches the native interaction meaning. |
| TIMING_BOUNDED | Registry duration is configured, with intermediate/final evidence within a generous completion bound. Exact native frame timing/easing is not claimed. |
| PARTIAL | Useful mapping with explicitly incomplete visual behavior. |
| NOT_IMPLEMENTED | Native evidence is preserved; required approximation yields WARN/FAIL. |
| NATIVE_REFERENCE_UNVERIFIED | Browser fixture works but that native combination lacks playback proof. |
| REDUCED_MOTION_OVERRIDE | Intentional immediate/collapsed browser preference policy. |

Behavioral parity includes bounded browser timing evidence, not pixel, rasterization,
compositing or identical easing curves across runtimes. The rAF curve maps CSS
ease-out; it is not a measurement of Figma's native animation curve.

## Mappings

| Token | Browser behavior | Result |
| --- | --- | --- |
| STATE_FAST | Source-backed same-family hover/press properties, registry 100ms ease-out CSS | BEHAVIORAL_PARITY; only compact control states. |
| NAV_DEFAULT | Registry 150ms outgoing/incoming dissolve | BEHAVIORAL_PARITY; semantic anchors, one history entry, Back/Forward, deep links and fallback survive. |
| NAV_SPATIAL / PUSH | Both source and destination move, registry 200ms | BEHAVIORAL_PARITY for all four vectors with retained native playback reference. |
| NAV_SPATIAL / MOVE_IN | Destination enters over stationary source | LEFT BEHAVIORAL_PARITY; other vectors NATIVE_REFERENCE_UNVERIFIED. |
| NAV_SPATIAL / MOVE_OUT | Source leaves over destination | LEFT BEHAVIORAL_PARITY; other vectors NATIVE_REFERENCE_UNVERIFIED. |
| NAV_SPATIAL / SLIDE_IN, SLIDE_OUT | Incoming/outgoing primary movement | LEFT PARTIAL: native dimming/secondary movement is not reproduced; other vectors NATIVE_REFERENCE_UNVERIFIED. |
| OVERLAY_DEFAULT | Registry 150ms centered modal fade, base retained | BEHAVIORAL_PARITY for existing centered modal; contextual positioning is PARTIAL, no authoring expansion. |
| SCROLL_NATIVE | Immediate child scroll with native/null transition | BEHAVIORAL_PARITY; never implicit smooth scrolling. |
| SCROLL_SMOOTH | Registry 200ms rAF from current offset to clamped child offset | BEHAVIORAL_PARITY with TIMING_BOUNDED evidence. |

Directions come from captured transition.direction, never canvas position. LEFT/TOP
use the negative outgoing axis; incoming enters from the opposite side. RIGHT/BOTTOM
reverse it. Actual native type is retained. General SMART_ANIMATE navigation,
matchLayers, custom easing/springs, SWAP, AFTER_TIMEOUT, timeline/continuous motion,
shared-element choreography and variables/conditionals remain unimplemented.

Smooth scroll requires verified native scrolling ancestry/overflow/content and a
real DOM scroller, including nested contexts. It respects axes and DOM extents,
corrects the final target, handles an already-reached target, cancels on restart or
user interruption, and cancels/completes immediately when reduced motion changes.
No uncontrolled browser `scrollIntoView({behavior:"smooth"})` is used. Unsupported
or missing native transition/context fields do not acquire a fabricated token.

`prefers-reduced-motion: reduce` collapses CSS state duration to <=1ms, makes route,
spatial and modal changes immediate, and resolves smooth scroll immediately without
a pending frame. Native scroll stays immediate. This is intentionally different
from native prototype playback. Modal focus enters the existing dialog, Tab remains
within its controls, CLOSE retains the route/base and restores the opener.

## Manifest and tests

Manifest version stays **2**. Additive `motion` contains contractVersion "1.3.1",
reducedMotion "prefers-reduced-motion", six registry-derived tokens and parity rows.
Each interaction retains complete nativeAction, motionEvidence and its descriptor
(native type/duration/easing/direction/matchLayers fields as actually captured).
State edges retain the actual sourceVariantId. Validation rejects altered durations,
descriptors, parity inventory, conflicting action fields and unimplemented triggers.
Evidence is model/source supplied; structural validation cannot prove its origin.

`scripts/figma-browser-motion-check.mjs` extends the existing browser-test runner.
Normal and reduced modes exercise actual computed state property changes, duration,
intermediate crossfade/transform/scroll, final destination/clamped target, and modal
open/close/base/focus. Existing pointer/Enter, history, deep-link, fallback and unique
control-hook checks remain. A negative test supplies false running hooks without
actual animation and must fail. Hooks alone are insufficient.

The runner reports per-token parity totals and preserves separate browser acceptance,
local freshness and source freshness. Runner version advances to 1.3.1 so old runner
evidence cannot masquerade as new acceptance. Historical schema-2 exports without
motion metadata keep navigation-only coverage; regeneration is needed for motion proof.
Browser-status remains a comparison tool, not a motion test. Native QA is unchanged.

Local regressions: **368 Node contracts**, **8 Playwright integration tests**, **275
plugin tests**, **112 hardening/variants/source tests**, **30 setup fixtures**, and
**1 installed-OpenCode configuration test**. The positive browser motion fixture
exercises **50 normal/reduced observations** covering all six semantics and all
20 spatial type/vector combinations. It also verifies scroll cancellation/restart
and a preference switch during scrolling. Hosted CI now runs browser regressions
alongside contracts, plugin/source tests, Go tests/vet and clean source/package setup.
Clean source/archive/extraction and release/privacy/integrity checks are required
before the main push; published Beta 2 assets are not replaced.

## Freshness, live acceptance and integrity

The live begin/finish protocol is unchanged. Both ends capture two stable source
reads; only comparable STABLE evidence allows browser build PASS. Projection version
remains **figma-browser-source-v1**, algorithm **canonical-json-sha256-v1**. Existing
stale/invalid fixture coverage still detects stale evidence; browser tests do not
rewrite manifest source fields. Native transition fields remain captured generically.

Fresh read-only acceptance used the existing non-sensitive canonical runtime on
page 9:306, runtime SECTION 36:719. It exported **five screens, five controls and
seven interaction/state edges**. Existing undefined Visit us/Status controls stay
inert/limited; native QA's WARN for an orphan contextual overlay remains separate.
No destinations, states, contextual reactions or product content were invented.
Actual source component variants supply four hover/press cases.

| Acceptance | Evidence/result |
| --- | --- |
| A current runtime | Fresh browser build STABLE, browser-test PASS, source/local/overall CURRENT. |
| B dissolve | Actual 36:815 → 36:739; intermediate and final opacity, pointer/Enter/history verified. |
| C spatial | Deterministic source-shaped fixtures based on retained native audit; all types/vectors browser-tested, native evidence limits retained. |
| D modal | Actual 47:34 → 47:38 with CLOSE 47:41; fade, base/route, focus and reduced mode verified. |
| E native scroll | Deterministic exact null-transition semantics; immediate clamped target, no smooth token/frame. |
| F smooth scroll | Retained V1.3 native-scroll action evidence; browser intermediate/final target, 200ms/ease-out metadata and reduced mode verified. **Fixture evidence, not fresh Figma source.** |
| G freshness | Stable export remains CURRENT; deterministic stale-source fixtures still pass. |
| H local-only | No external requests or WebSockets; workers blocked, no remote assets/modules/analytics. |

Fresh runtime playback observations: STATE_FAST 4, NAV_DEFAULT 1, OVERLAY_DEFAULT 1,
plus the same **6 reduced overrides**, totaling **12**. Together with the fixture
matrix there are **62 positive motion observations**. Page count is **1290 before
and after**, with identical normalized page fingerprint:
`a8c1c5af049e0788b2e8794ca422fd6dbfb9a9b6f71c14e1ae5343bd45e0819e`.
Canonical runtime/dependency fingerprint is unchanged:
`305132db06a84df82351b91fbc02f99f028e5d9a4cc29289d4e5cfb78afdd204`.
Production, canonical component states and runtime remain untouched. The counted
live acceptance campaign made **81 reads and zero Figma writes**, with no timeout
or recovery event. Fixture runner/source/setup reads are separate from that count.
The sanitized result is retained in `scripts/fixtures/browser-motion-live.json`.

## Limits

No general Smart Animate/shared-element renderer, spring/custom easing, timed sequence,
continuous motion, native variables/conditionals, browser state parity or new contextual
overlay authoring was added. Fixed native desktop geometry and local font substitutions
can affect browser wrapping; complex paints/vector paths were not recreated by the
acceptance export. There is no screenshot/pixel regression or exact native frame-time
measurement. Native references for non-LEFT non-PUSH combinations remain unverified.
No Figma runtime gap was encountered; all three approved Beta 2 artifact hashes remain
unchanged. V1.2.5 requires native plan support and actual two-branch playback before
it can leave HOLD.

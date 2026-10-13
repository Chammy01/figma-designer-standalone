# Browser motion foundation — 1.3.1

This is a local browser translator, not a native motion authoring contract.
Figma is strictly read-only. Native Semantic Motion and Interaction QA remain
authoritative for native work; browser-test owns browser acceptance.

Read captured native reactions and actual source relationships. Call browserMotion
from figma-browser-motion.mjs with the complete nativeAction and verified evidence.
Use browserMotionManifest for additive schema-2 metadata. Token durations derive
from figma-motion-semantics.mjs; do not create independent constants. Source
projection/algorithm versions and begin/finish live source protocol are unchanged.
Missing fields are unknown, not evidence. Preserve original native transition
fields including direction, matchLayers and easing-specific fields in nativeAction
and the descriptor. Never fabricate transitions to make an export appear supported.

| Token | Browser mapping | Boundary |
| --- | --- | --- |
| STATE_FAST | Small CSS property transitions; source variants via data-figma-state | Verify same component family, available styles, actual trigger and sourceVariantId; never general Smart Animate. |
| NAV_DEFAULT | Outgoing/incoming crossfade | Semantic anchors, one hash/history entry, Back/Forward, deep links and fallback retained. |
| NAV_SPATIAL | Actual type/direction mapped to incoming/outgoing transforms | PUSH moves both; MOVE_IN/SLIDE_IN incoming; MOVE_OUT/SLIDE_OUT outgoing. SLIDE dimming/secondary movement is PARTIAL. |
| OVERLAY_DEFAULT | Centered existing modal fade over retained base | Existing content and CLOSE only; focus enters modal, stays within controls, returns to opener. No new contextual authoring. |
| SCROLL_NATIVE | Immediate local scroll | Null native transition stays nonanimated, including under reduced motion. |
| SCROLL_SMOOTH | Deterministic cancellable requestAnimationFrame scroll | Canonical SCROLL_ANIMATE only, actual prepared native-backed DOM scroller and child target. |

Embed browserMotionSource from scripts/figma-browser-motion-runtime.mjs into app.js.
This avoids runtime imports/dependencies. Author semantic source HTML/CSS separately:
the helper neither reconstructs arbitrary native visual layers nor invents content.
Screens must be individually hideable; their containing app must support overlapping
outgoing/incoming layers without reflow during animation. Preserve source geometry.
Provide CSS for [hidden], source variant IDs, transitioned source properties, and
the centered [data-figma-overlay="open"] layout. Use --figma-state-duration from
the runtime and an ease-out CSS relationship. Under prefers-reduced-motion: reduce,
CSS durations must be <=1ms. A local font fallback must be disclosed.

Scroll context must come from native overflowDirection, ancestry and content evidence,
not a name/clipping guess. Translate it to a real overflow:auto/scroll DOM container
with its source ID hook, appropriate scrolling axes and source-backed child positions.
SCROLL_SMOOTH animates from current offset to child offset clamped to actual DOM
extent, using the CSS ease-out cubic curve as a browser mapping, final correction,
and the canonical registry duration. Already-at-target is a no-op. Restart cancels
the previous frame; wheel/touch/pointer navigation or reduced-motion changes cancel
active frames. Nested scrollers use the verified container, never global window scroll.
Do not use uncontrolled scrollIntoView({behavior:"smooth"}).

Reduced motion is an intentional REDUCED_MOTION_OVERRIDE: route/modal/spatial
transitions become immediate, compact CSS states <=1ms, smooth scroll immediate
and no pending frame. Native scroll remains immediate. Preserve interaction meaning.

Parity classifications:

- BEHAVIORAL_PARITY: observed supported interaction/property behavior.
- TIMING_BOUNDED: canonical configured duration and bounded intermediate/completion
  evidence; never exact native frame or easing identity.
- PARTIAL: useful mapping with disclosed native visual differences.
- NATIVE_REFERENCE_UNVERIFIED: browser fixture works, corresponding native playback
  was not verified (non-LEFT non-PUSH combinations).
- NOT_IMPLEMENTED: preserved native evidence with no supported motion mapping.
- REDUCED_MOTION_OVERRIDE: intentional browser preference policy difference.

PUSH all four vectors and LEFT for all five directional types have retained native
playback evidence. Other vectors retain NATIVE_REFERENCE_UNVERIFIED. Layer matching,
arbitrary Smart Animate navigation, springs/custom easing, SWAP, AFTER_TIMEOUT,
timelines and stateful conditional actions remain unimplemented. Required unsupported
source motion yields WARN/FAIL, not a silent immediate-parity claim.

Add motion.contractVersion "1.3.1", reducedMotion "prefers-reduced-motion", tokens
and parity inventory to schema 2. Interactions carry nativeAction, motionEvidence
and motion; state edges carry the actual sourceVariantId. Only captured information
may populate evidence. validateManifest checks descriptor/token/inventory agreement;
it cannot prove supplied evidence came from Figma. Live begin/finish and source
inspection supply that proof. Keep saved fixture evidence separate from fresh source.

Browser-test exercises normal and reduced contexts, real computed styles,
intermediate fade/transforms/scroll and final behavior. Hooks describe token/type,
configured duration/easing and running/settled state, but hooks alone cannot pass.
Reports retain local and live source freshness independently; browser-status only
compares evidence/files. No network APIs, CDN, remote assets, WebSockets or service
workers; browser command filesystem output stays inside its existing boundary.

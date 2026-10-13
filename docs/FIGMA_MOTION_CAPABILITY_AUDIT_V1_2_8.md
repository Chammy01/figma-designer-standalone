# Figma Motion Capability Audit — V1.2.8

This is an audit of the approved Beta 2 stack, not a motion feature release.
No command, token, router, planner, QA, browser engine, MCP or plugin behavior is
expanded. V1.2.5 remains `FIGMA_STATEFUL_VARIABLES: HOLD`.

## Pinned source and method

Baseline: `8412e23786abc944b06b342f811a4382456194f8`. Upstream remains
`5806e71b8fd4bad97671038a0b010f04df1aaa41`, with the approved Beta 2 conditional
source collector repair. The installed and lockfile-pinned
`@figma/plugin-typings` version is **1.124.0**; package.json's range alone is not
the pin. Inventory uses `plugin-api.d.ts`, especially Reaction/Action/Transition/
Trigger/Navigation/Easing at lines 5039–5238 and readonly overlay properties.

The [deterministic matrix and native readbacks](../scripts/fixtures/figma-motion-capabilities.json)
retain 103 structural probes (95 initial cases plus eight correct same-family
CHANGE_TO cases), 40 fixed playback scenes, canonical-duration rechecks and
cleanup evidence. Invalid frame-to-frame CHANGE_TO and screen-as-scroll-target
probes are labelled invalid destination contexts; they do not disprove valid
component or child-target behavior.

Public `set_reactions` was exercised through the unchanged project executable and
localhost bridge. `get_reactions` returned full arrays, including the native
deprecated action mirror, plural actions, trigger and transition fields.
Native Figma Desktop playback was observed through bounded screenshots and
settled accessibility state. A visible intermediate state is stronger evidence
than arriving at a destination. These observations are manual/native evidence,
not automated renderer, timing, curve or physical-parameter conformance proof.

All probes were inside disposable SECTION `54:73`, **Figma Designer — Motion
Audit V1.2.8**, on a non-sensitive acceptance page. No production or canonical
library/runtime node was authored. Controlled screens were 800×500. Matching
pairs used matching layer names/types/hierarchy and different real IDs. All
destination screens were placed to the right, independently of requested motion
direction. Forty immutable scenes avoided native player's stale reaction cache;
early cached samples were excluded. The two final canonical-duration changes
were tested in a newly opened presentation.

## Evidence levels

Each capability has exactly one strongest status, with lower-stage history kept
in its probes. `DECLARED` means present in pinned types only; `TRANSPORTED` means
the unchanged public tool carries the exact structure; `AUTHORABLE` means the
native setter accepted it; `READBACK_VERIFIED` means native structure returned;
`PLAYBACK_VERIFIED` requires observed behavior. `REJECTED_NATIVE` and
`PLAN_BLOCKED` distinguish native rejection from account restrictions.
`NOT_EXPOSED` means no required primitive on the specified API/transport surface;
`UNVERIFIED` means insufficient evidence.

DECLARED is not working support. TRANSPORTED is not working support. READBACK
does not imply playback. No visible SHIP_V1_3 candidate is promoted without
native playback. Individual combinations may remain readback-only even when a
transition family has a verified representative.

## Declared transition matrix

The pinned Design API has exactly eight transition discriminators.
Every row passed the plugin validator and generic public transport. The native
setter determines action compatibility.

| Type | Go description | Native NAVIGATE | Same-set CHANGE_TO | OVERLAY | SWAP | Valid SCROLL_TO child | Playback / strongest family evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DISSOLVE | Listed | Readback | Readback | Readback | Readback | Unverified | Stationary crossfade for navigation, centered modal and screen-like SWAP; PLAYBACK_VERIFIED |
| SMART_ANIMATE | Listed | Readback | Readback | Rejected | Readback | Unverified | Matched properties/instances, component states and screen-like SWAP interpolate; PLAYBACK_VERIFIED |
| MOVE_IN | Listed | Readback | Rejected | Readback | Readback | Unverified | Destination enters over source; centered modal enters; PLAYBACK_VERIFIED |
| MOVE_OUT | Listed | Readback | Rejected | Rejected | Readback | Unverified | Source exits revealing destination; PLAYBACK_VERIFIED |
| PUSH | Listed | Readback | Rejected | Rejected | Readback | Unverified | Both screens translate; all four vectors played; PLAYBACK_VERIFIED |
| SLIDE_IN | Listed | Readback | Rejected | Rejected | Readback | Unverified | Incoming screen, smaller source movement and dimming observed; PLAYBACK_VERIFIED |
| SLIDE_OUT | Listed | Readback | Rejected | Rejected | Readback | Unverified | Outgoing source with dimmed destination during transition; PLAYBACK_VERIFIED |
| SCROLL_ANIMATE | Omitted | Rejected | Rejected | Rejected | Rejected | Readback | Child-target viewport movement observed; PLAYBACK_VERIFIED |

“Readback” includes setter acceptance and full native readback; it does not imply
playback for every cell. SWAP playback was bounded to DISSOLVE/SMART_ANIMATE
outside an overlay. Other SWAP transitions and actual overlay-to-overlay SWAP
remain unverified visually. Non-scroll transitions on a correctly prepared
SCROLL_TO child were not probed; the invalid screen-target negatives do not
establish that compatibility.

Simple transitions require `type`, `duration` and `easing`. Directional transitions
also require `direction` and boolean `matchLayers`. Omission of either directional
field reaches Figma and is rejected. Directions are exactly LEFT, RIGHT, TOP and
BOTTOM. See retained JSON for each exact requested and normalized returned shape,
including native-added `resetVideoPosition: false` and float32 values.

Eligible destinations differ: NAVIGATE/SWAP use screen frames; CHANGE_TO used
verified variants of COMPONENT_SET `57:188`; OVERLAY used default centered FRAME
`59:208`; SCROLL_TO used an actual child inside a prepared scrollable frame.
No transition test changed an action type, trigger or destination to force support.

## Easing matrix

All thirteen declared easing variants reached native validation on an eligible
SMART_ANIMATE navigation edge. The validator checks a string discriminator, not
the complete easing enum or parameter structure. Native acceptance is decisive.

| Easing | Exact extra fields tested | Strongest evidence | Playback limit |
| --- | --- | --- | --- |
| EASE_IN | None | READBACK_VERIFIED | Curve not visually certified |
| EASE_OUT | None | PLAYBACK_VERIFIED | Current tokens and multiple controlled scenes |
| EASE_IN_AND_OUT | None | READBACK_VERIFIED | Curve not visually certified |
| LINEAR | None | READBACK_VERIFIED | Curve not visually certified |
| EASE_IN_BACK | None | READBACK_VERIFIED | Overshoot not visually certified |
| EASE_OUT_BACK | None | READBACK_VERIFIED | Overshoot not visually certified |
| EASE_IN_AND_OUT_BACK | None | READBACK_VERIFIED | Overshoot not visually certified |
| CUSTOM_CUBIC_BEZIER | easingFunctionCubicBezier: {x1: .25, y1: .1, x2: .25, y2: 1} | PLAYBACK_VERIFIED | Motion observed; exact curve and parameter bounds unmeasured |
| GENTLE | None | PLAYBACK_VERIFIED | Interpolation observed; numerical curve unmeasured |
| QUICK | None | READBACK_VERIFIED | Curve not visually certified |
| BOUNCY | None | PLAYBACK_VERIFIED | Interpolation observed; exact rebound/overshoot unmeasured |
| SLOW | None | READBACK_VERIFIED | Curve not visually certified |
| CUSTOM_SPRING, pinned shape | easingFunctionSpring: {mass: 1, stiffness: 100, damping: 15, initialVelocity: 0} | REJECTED_NATIVE | Native says unrecognized initialVelocity |
| CUSTOM_SPRING, native alternate | easingFunctionSpring: {mass: 1, stiffness: 100, damping: 15} | PLAYBACK_VERIFIED | Accepted/read back/interpolated; experimental mismatch with pinned type |

The declared Bézier fields and all four declared spring fields are numbers.
No additional range constraints are declared in these interfaces. Only the safe
representatives above were tested; no extreme-value fuzzing or universal validity
claims. Native float32 `.1` parameters read back as `0.10000000149011612`.

Native spring easing exists in transition objects. An independent element
physics engine, arbitrary spring tracks and automatic spring authoring do not
follow from that fact. The three-field alternative is not silently substituted
into current product behavior.

## Duration and direction

| Requested seconds | Native returned duration | Observation |
| --- | --- | --- |
| 0.10 | 0.10000000149011612 | Short dissolve and component-state change |
| 0.15 | 0.15000000596046448 | NAV_DEFAULT and OVERLAY_DEFAULT play |
| 0.20 | 0.20000000298023224 | Short dissolve and canonical PUSH play |
| 0.50 | 0.5 | Longer controlled probes expose intermediate states |
| 0 | 0.3 | Accepted but not stored as zero; destination arrived, playback timing unverified |

No accurate elapsed-time/clamping benchmark was attempted. Existing tolerances
0.095–0.105, 0.145–0.155 and 0.195–0.205 remain authoritative. A null transition
and a zero-duration transition are different structures; do not infer “instant”
from sending zero.

All five directional types read back all four vectors. LEFT playback was observed
for each type; RIGHT/TOP/BOTTOM playback was observed for PUSH. Other twelve
type/vector combinations retain READBACK_VERIFIED, not playback certification.
RIGHT moved both screens right with the target entering from the left; TOP moved
up with the target entering from below; BOTTOM moved down with the target entering
from above. This happened despite all destinations being to the right on canvas.
Canvas placement is not product-navigation meaning.

## matchLayers, Smart Animate and shared elements

`matchLayers` is required on directional transitions, not declared on
SMART_ANIMATE. Both booleans read back on all five directional types. Adding it
to SMART_ANIMATE is rejected as an unrecognized field. True on PUSH visibly kept
the matching Mover as one interpolating object while unmatched controls translated.
False moved the source/destination as separate screen bands. Other directional
true/false visual comparisons remain unverified.

Controlled SMART_ANIMATE pairs showed:

| Change | Native playback observation |
| --- | --- |
| Same-family component states | Default→Hover, Hover→Pressed, Off↔On; inherited instances; release/leave native reversion |
| x/y | Single object at intermediate position |
| width/height | Intermediate size |
| opacity | Fade toward 0.2 |
| solid fill | Intermediate orange/blue paint |
| rotation | Intermediate angle toward 45 degrees |
| corner radius | Intermediate radius toward 36 |
| renamed layer | Two stationary positions crossfade |
| different parent hierarchy | Two positions crossfade |
| same component-family instance | One control interpolates position |
| same text, font size 16→32 | Intermediate text size |
| changed text content | Destination copy changes; character interpolation/crossfade mechanism UNVERIFIED |
| Auto Layout gap 12→80 | Child position interpolates |
| reversed named Auto Layout items | Children pass each other to new order |

Text-layer translation/opacity were not isolated separately. Different node types,
duplicate names, arbitrary nested matching and all typography properties were not
exhaustively tested. Different IDs across screens worked; identical IDs are not
possible for distinct nodes. Matching names/type/hierarchy are observed constraints
in these fixtures, not a reverse-engineered universal matching algorithm.

Result: **SHARED_ELEMENT_CONDITIONAL**, experimental for V1.3. Existing verified
continuity can remain preserved. Do not enable matching, rename layers or restructure
accepted screens automatically. The existing conservative false/default policy
remains justified because enabling matching materially changes the visual result.

## Component, navigation, overlay, scroll and history findings

Native component motion used same-set CHANGE_TO. ON_HOVER changed a Default instance
to blue Hover; a press produced purple Pressed, release returned Hover and leaving
returned Default. Off↔On used explicit ON_CLICK edges and changed gray/green. Complete
direct readback was retained for Default→Hover; the other three exact accepted
requests and their native playback are recorded without inventing absent direct
readback snapshots. DISSOLVE on a valid same-set edge was readback-verified only.

All seven non-scroll transition types played on NAVIGATE. This is capability
discovery, not a recommendation to use spatial motion without journey meaning.
The centered modal path played DISSOLVE and MOVE_IN. SMART_ANIMATE and other
directional modal types were rejected in tested OVERLAY reactions. Readonly
`overlayPositionType`, `overlayBackground` and `overlayBackgroundInteraction`
were not changed; the contextual overlay setter limitation from V1.2.6 remains.

SCROLL_TO accepted and retained null or SCROLL_ANIMATE on an actual child target.
Both reached the target in native playback; the animated case showed intermediate
viewport displacement. SCROLL_ANIMATE did not work on NAVIGATE, CHANGE_TO, OVERLAY
or SWAP. The frame must have a real intended scroll context and enough overflow.
HTML `overflow:hidden` gives clipping, not `overflowDirection`. The two disposable
scroll frames were set to Vertical through the native editor before playback.
Duration/easing fields read back; exact timing/curve fidelity is not measured.

SWAP played as screen-like replacement outside an overlay with dissolve or matched
Smart Animate. It is not certified here as a general replacement/overlay framework.
Destination ownership must still be explicit. BACK and CLOSE actions declare only
their type: **transition fields NOT_EXPOSED**. Observed BACK/history reversed an
originating dissolve; CLOSE reversed modal dissolve/move-in. Do not add fake fields.

Representative trigger playback covered ON_CLICK, ON_HOVER, ON_PRESS and
AFTER_TIMEOUT. MOUSE_ENTER/LEAVE are declared with `delay` and `deprecatedVersion`;
MOUSE_UP/DOWN with `delay`; keyboard with `device`/`keyCodes`; media triggers have
their own fields. These additional trigger combinations were inventoried, not
visually promoted. AFTER_TIMEOUT `{timeout:1.5}` advanced automatically with an
ordinary NODE navigation. Cancellation and exact timeout timing remain unverified;
the Go example describing milliseconds is not a proven native unit contract.

## Capability limits

**TIMELINE_AUTHORING: NOT_EXPOSED.** Searching the complete pinned Design API found
no keyframes, timeline, per-property tracks or independent element animation
sequences. Slides has a separate SlideTransition; it is not a Design timeline.
AFTER_TIMEOUT chains are **TIMED_NAVIGATION_SEQUENCE**, narrowly experimental.

**CONTINUOUS_MOTION: NOT_EXPOSED.** No scroll-progress, scroll-driven animation,
parallax or continuous gesture-progress authoring primitive was found. ON_DRAG
is a discrete trigger and does not prove continuous interpolation.

Spring-like easing is declared/native as recorded above; independent physical
animation remains limited. There is no OS reduced-motion preference switching
in the native authoring stack. V1.2.4's short, restrained defaults remain a
reduced-motion-conscious authoring policy, not runtime preference detection.

## MCP surface, source freshness and QA

**MCP_GAP: NONE for transition/easing transport.** Generic reaction objects carry
the valid structures. The plugin knows all eight transition types; Go's public
description omits SCROLL_ANIMATE. Native rejects fields/relationships that the
permissive validator forwards, including SMART_ANIMATE.matchLayers and the
pinned spring initialVelocity. These are documented native/type mismatches, not
a reason to rebuild the approved runtime.

**SCROLL_PREPARATION_GAP: overflowDirection setter not exposed by public MCP.**
The pinned API exposes it as mutable, but existing HTML and public tools do not
provide a deterministic setter. Existing/UI-prepared scroll frames can use the
verified transition. A future narrow setter could be considered separately;
none is implemented in this audit.

Existing source projection generically captures complete transition/easing objects,
including direction, matchLayers, Bézier/spring parameters, duration, null and
SCROLL_ANIMATE. Fixture tests use actual native readbacks and assert full normalized
reaction equality, meaningful field fingerprint sensitivity and zero collector
writes. Capture preserves raw native floats; six-decimal fingerprint normalization
remains intentional.
**SOURCE_FRESHNESS_GAP: NONE. SOURCE_PROJECTION_VERSION: UNCHANGED**
(`figma-browser-source-v1`). No serializer repair was needed.

QA V2 remains unchanged and read-only. It can capture these objects and check
destinations, ownership and ordinary semantic tokens. It does not certify native
animation visually. Additional easing, shared-element matching and SCROLL_ANIMATE
authoring/parity need explicit V1.3 policy before QA should judge those new choices
as product expectations. SWAP has existing graph inspection, not a new motion token.

## Browser comparison and Semantic Motion compatibility

| Native capability | Browser audit classification | Limit |
| --- | --- | --- |
| DISSOLVE / ordinary screen change | PARTIAL | Existing command requests ~150ms dissolve; no native curve/timing conformance |
| compact component-state transitions | PARTIAL | Existing ~100ms CSS transitions; no general matching-layer renderer |
| directional five types / matchLayers | NOT_IMPLEMENTED | No certified mapping for complete native behavior |
| arbitrary Smart Animate continuity/layout/text | NOT_IMPLEMENTED | No native matching algorithm equivalent |
| null scroll action | Existing interaction mapping possible; motion parity UNVERIFIED | Audit did not regenerate/test a browser export |
| SCROLL_ANIMATE and custom curves/springs | NOT_IMPLEMENTED | No certified native-parameter playback mapping |
| overlay motion / SWAP / timed sequences | NOT_IMPLEMENTED | Native fixture behavior not certified in browser |
| native reduced-motion preference detection | NOT_EXPOSED natively | Browser has existing prefers-reduced-motion policy; no expansion here |

There is no single fixed browser engine proving every generated export's parity.
These classifications follow current browser instructions/source/tests; native
playback must not be presented as browser playback evidence.

| Current semantic token | Compatibility result |
| --- | --- |
| STATE_FAST | Supported: same-set Smart Animate .10 EASE_OUT, native instance playback |
| NAV_DEFAULT | Supported: dissolve .15 EASE_OUT, native fade |
| NAV_SPATIAL | Supported representative PUSH LEFT .20 EASE_OUT matchLayers:false; other permitted types read back and played at .50 LEFT |
| OVERLAY_DEFAULT | Supported: centered dissolve .15 EASE_OUT, native fade/close |
| SCROLL_NATIVE | Supported: existing null SCROLL_TO reaches target |

No current token was invalidated or changed. The newly observed scroll transition
does not authorize changing current SCROLL_NATIVE behavior in this milestone.
Natural-language “subtle” and “snappy” still use existing MOTION. Continuous bounce
still receives the existing truthful limitation. Shared elements remain conditional/
limited under the current contract. Capability questions can cite this audit, without
implicitly authoring new motion or expanding the router/planner.

## Integrity, recovery and regression

Cleanup deleted only the exact named same-run SECTION and its descendants: **522**
nodes including the root (audit node count, not production count). No audit nodes,
reactions, components or temporary library remained. Native editor search found no
audit hub; the original runtime was presented again without authoring it.

Restored page node count: **1290**. Normalized full page SHA-256:
`a8c1c5af049e0788b2e8794ca422fd6dbfb9a9b6f71c14e1ae5343bd45e0819e`.
Canonical runtime/dependency source SHA-256:
`305132db06a84df82351b91fbc02f99f028e5d9a4cc29289d4e5cfb78afdd204`.
Both exactly match baseline. Two additional read-only source captures were stable;
health returned ok and recentErrorCount 0. Final source capture made zero Figma writes.
Selection/player viewport changes were excluded from normalized document integrity.
Review of 281 retained write requests found zero protected node targets; twelve
protected workflow/runtime source files also remained unchanged.

Retained public-tool logs contain **487 requests: 325 writes and 162 reads**,
plus special read-only source RPC captures. These are recorded lower bounds, not
an exact campaign total: the interrupted initial matrix trace was overwritten.
At least three write timeouts were recorded. They were indeterminate and reconciled
by stable readback before resuming missing rows. The cause was the old audit helper
not draining stderr, which blocked logging after many rejected cases. The same
approved executable was restarted with drained diagnostics; no timeout/runtime
policy changed and the whole matrix was not blindly repeated.

Approved hashes remain unchanged:

- executable: `bc9eec0d9a9cddd20e27331a41319a59b84bd51f88a78e59885b901456562f3f`
- plugin code: `273e20f56b80e9a7d995962948b1bb93e5cc1dfa19471ecd834ca7308d7da941`
- plugin UI: `661fb49dd3ca38ed4648e70858822f59f565093718d02143c6b1b85628f054ee`

Local regression results:

| Suite | Result |
| --- | --- |
| npm contracts, including 33 audit contracts | 283/283 PASS |
| Plugin tests | 275/275 PASS |
| Approved dispatcher hardening/variants/source | 111/111 PASS, including 70 source tests |
| Browser integration | 6/6 PASS |
| Installed OpenCode compatibility | 1/1 PASS, OpenCode 2.0.24 |
| Setup fixtures | 30 PASS |
| Clean source archive build and release extraction/setup | PASS; rebuilt approved hashes match |
| Clean candidate release/source/privacy checks | PASS; approved config, syntax, setup and hashes verified |

The workspace-wide JSON check encountered BOM-prefixed files in older ignored
QA evidence. Those files were preserved untouched; release validation uses the
clean candidate archive, which excludes local evidence and exercises the shipped
source/runtime. No packaging or checker behavior was changed. Hosted CI must run
on the exact pushed commit, including Go tests/vet; an older green run is not evidence.

## V1.3 recommendations

- **SHIP_V1_3 candidate:** SCROLL_ANIMATE on verified existing child targets and
  already prepared scroll contexts, with native playback/readback checks and future
  QA/browser policy. This is a recommendation, not present authoring enablement.
- **KEEP_EXISTING:** current semantic tokens and transition-only finishing boundary.
  Retain action/trigger/destination immutability, lossless arrays, no-op tolerances,
  ownership and timeout reconciliation.
- **EXPERIMENTAL:** constrained Smart Animate/shared elements, directional matching,
  non-default easing, native three-field custom spring, screen-like SWAP and basic
  timed navigation. Require explicit constraints and additional combination/parity
  checks before default use. Readback-only easing variants are not promoted.
- **LIMITED:** transition fields on BACK/CLOSE, arbitrary element entrance/exit,
  universal text morphing and unconstrained shared-element choreography.
- **DEFER:** independent timelines/keyframes/physics, continuous/scroll-driven motion,
  deterministic scroll-context preparation and broader browser parity. No timer hacks
  or screen chains presented as timelines.

The mapped boundary is sufficient to choose this narrow V1.3 scope. Remaining
unverified combinations are explicitly bounded and are excluded from promotion.
No broad advanced-motion implementation is included. Stateful authoring remains
blocked by the connected Figma plan until actual SET_VARIABLE/CONDITIONAL playback
can be tested, including both branches.

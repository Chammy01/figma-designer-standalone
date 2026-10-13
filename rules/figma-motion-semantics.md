# Semantic motion — V1.2.4

Read the authoritative token/support registry in `rules/figma-motion-semantics.mjs`.
Natural-language interpretation is model-guided. Its pure helpers propose/compare
transitions from supplied inspection evidence; they never inspect or write Figma.
Generated `motionPolicy` supplies identical definitions to routed motion/planner
prompts. Manual commands must read these two shared files before acting.

First determine whether the user authorized changes or requested an audit. "How
is motion being used?", "Review the transitions" and "Are transitions consistent?"
are read-only. "Make the transitions consistent" authorizes eligible normalization.
Plan-only remains read-only. For unclear "more animated", ask one concise ordinary-
chat question about intended meaning, end the turn, make no writes.
Audit/plan-only also forbid filesystem authoring: no helper scripts or report files.
Use existing helpers in read-only Node evaluation if practical, or inspect/reason
without executing them. Do not create a script merely to run verification.

Before transition selection, record semantic intent, actual node/reaction/action,
supported representation, destination/source identity, evidence, token and scope.
STATE/FEEDBACK require existing compatible same-set CHANGE_TO. NAVIGATION requires
existing runtime NAVIGATE. OVERLAY requires existing OVERLAY content/destination;
preserve overlay position/behavior. Ordinary SCROLL uses SCROLL_NATIVE: preserve
existing SCROLL_TO, including null/current transition; SEMANTICALLY_RECOGNIZED /
NO_TRANSITION_WRITE. Explicit "scroll smoothly", "animate this existing scroll" or
"make this jump to Features smoother" selects SCROLL_SMOOTH. Generic subtle/less
motion does not enable it. Never turn scroll into navigation.

SCROLL_SMOOTH requires an existing NODE + SCROLL_TO, actual intended existing child
destination, owned runtime source/target, complete reaction arrays and no competing
location-changing actions on the same trigger. Read native overflowDirection through
the existing read-only source projection (get_node with browserSource:true); verify
parent-child ancestry, the same native scroll container and actual content overflow
in matching parent-relative coordinates. Use inspectScrollContext with current
native records, not guessed evidence flags. Native NONE means FIGMA_LIMITED:
SCROLL_CONTEXT_PREPARATION; unavailable properties/hierarchy mean UNKNOWN. Both make
zero motion writes. Names, frame height, canvas placement, clipsContent or HTML
overflow:hidden alone never prove preparedness. Ambiguous fixed/sticky content,
rotated geometry or competing nested contexts need verified native evidence; skip
uncertain cases rather than manufacturing scrollability.

Apply only the shared SCROLL_SMOOTH token to the exact eligible transition. Preserve
all other fields and the deprecated action mirror. Non-approved existing scroll
transitions are limited, not normalized. SCROLL_ANIMATE is incompatible with
NAVIGATE, CHANGE_TO, OVERLAY, SWAP and non-NODE actions. No scroll preparation,
resizing/rebuilding, private property writes, UI automation, MCP setter or production
mutation. A user-prepared valid container may be reused. No custom scroll durations,
springs, Bézier curves or new presets; audit experiments remain disabled.

On a scoped but unidentified "make scrolling smoother", ask one target clarification.
No write before the existing edge is resolved. Ordinary "scroll to Features" can
use flow/interactive to wire a known supported edge; it does not request animation.
Parallax and scroll-position-driven animation remain MOTION_LIMITED. Browser
SCROLL_ANIMATE parity is NOT_IMPLEMENTED; native playback is not browser proof.

"Subtle" and "less motion" favor conservative semantic defaults, without removing
behavior. "Snappy state change" maps to STATE_FAST. "Quiet modal" maps to
OVERLAY_DEFAULT. Do not blindly apply NAV_DEFAULT to state/overlay reactions.
"Everything slide" does not authorize inappropriate directional motion everywhere.
Classify each existing action, limit directional choices to justified spatial meaning,
and explain skipped incompatible requests.

SPATIAL_NAVIGATION requires real journey order/direction or explicit compatible
direction. Canvas XY positions are not navigation semantics. Forward/backward alone
does not establish axis, reading direction or transition direction. Use stated
journey semantics (for example, horizontal left-to-right progression moving LEFT
for next and RIGHT for previous), not node placement. If direction is unresolved,
report ambiguity and use NAV_DEFAULT, or ask if direction is a material requirement.
Preserve verified intentional spatial/shared continuity unless the user explicitly
requests compatible normalization; do not erase it during an unrelated audit.

ENTER/EXIT through an existing truthful NAVIGATE/OVERLAY action use its corresponding
token. Independent arbitrary element entrance/exit is MOTION_LIMITED: ENTER/EXIT
requires animation capability not available in this existing-reaction transition
contract. SHARED_ELEMENT is preserve-only when already verified intended matching-
layer/SMART_ANIMATE behavior represents the relationship. Otherwise report
MOTION_LIMITED: SHARED_ELEMENT. Never auto-enable matchLayers, rename/restructure
layers, manufacture continuity, or create a timeline.

Explicit dissolve, smart animate for compatible variants, or a directional push
with justified direction may override defaults. Check actual action compatibility
and runtime support; unknown support means skip, not experimentation. SMART_ANIMATE
on URL/BACK/CLOSE is incompatible. Do not change an action to fit its requested
animation. Never enable matching layers through an override. Registry tolerances
apply; custom supported durations should match their float32 read-back equivalently.

Use resolveMotion/planMotion/transitionMatches/reactionSemantics when practical via
ordinary local Node; helpers are optional verification, not a new MCP or write path.
Never substitute supplied booleans for live evidence or claim helper execution
when only reading the rules. Read complete arrays immediately before every write,
copy losslessly, change eligible transition objects only, replace for that exact
existing owned node, re-read and compare every non-transition field. Lossless
reconstruction uncertain -> SKIP THE WRITE. No node/reaction/interaction creation,
production modification, trigger/action/destination changes or architecture repairs.
When get_reactions exposes deprecated action alongside actions[], verify it mirrors
the first plural action. Preserve all plural actions and keep the mirror consistent;
read-back compares eligible transition changes in both representations. A differing
mirror is uncertain reconstruction: skip, never collapse multiple actions to one.
Before changing a source COMPONENT transition, inspect directly dependent INSTANCE
reaction arrays. Figma can combine inherited reactions with instance-local copies;
changing a master transition may expose/coalesce duplicates in that effective view.
If unchanged counts/non-transition semantics cannot be established for dependents,
SKIP THE WRITE and report the projection ambiguity. Do not repair instance reactions
or remove duplicates from motion. Re-read dependent arrays at the exit boundary.

The canonical motion ownership and timeout contract remains authoritative. A write
timeout is indeterminate: re-read, stabilize, reconcile; never blindly repeat it.
Audit rows: real node/reaction, semantic intent, current implementation, expected
token, MATCH / MISMATCH / LIMITED / UNKNOWN, evidence and reason. A mismatch found
during audit does not authorize a fix. Preserve limited/unknown findings honestly.
On no-op, report MOTION_ALREADY_NORMALIZED; do not write equivalent float values.
Retain FIGMA_MOTION_GUARD safety status separately from capability limits: guard PASS
means safe completion, not successful implementation of a limited request.

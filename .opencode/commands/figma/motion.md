---
description: Interpret semantic motion, audit or normalize existing transitions without changing interaction semantics
agent: figma-designer
subagent: false
---

FIGMA MOTION SYSTEM TASK — STANDALONE V1.2

Run health_check before making changes.

Follow AGENTS.md, the figma-designer agent instructions, and rules/figma-design-rules.md.

This task standardizes motion on EXISTING runtime reactions only.
It does not create interaction behavior.

USER SCOPE / TARGET

$ARGUMENTS

Treat the user input above as the requested scope. Resolve named Figma nodes/screens from the live document; do not rely on stale IDs from another file.



PHASE 5 GOAL

Apply a restrained, consistent motion language to the native component-state library and interactive app while preserving every existing interaction's semantics.

The current architecture is:

production design (strictly read-only)
-> `Figma Designer — Component States` (reaction transitions may be normalized)
-> `Figma Designer — Interactive App` SECTION (reaction transitions may be normalized)
-> interface QA

SEMANTIC MOTION BEFORE TRANSITIONS

Read rules/figma-motion-semantics.md and the authoritative registry/pure helpers in
rules/figma-motion-semantics.mjs before acting. Routed prompts include the same
generated motionPolicy. Interpret STATE, NAVIGATION, SPATIAL_NAVIGATION, OVERLAY,
SCROLL, SCROLL_SMOOTH, FEEDBACK, ENTER, EXIT or SHARED_ELEMENT first; then verify the existing
reaction/action/destination and resolve its supported token, not a raw preset.
Token values and float tolerances live only in the shared registry.

Decide authorization first: motion audit/review/consistency questions are strictly
read-only unless changes were explicitly requested. Plan-only is also zero-write.
Do not create architecture to satisfy a motion request. Missing reactions/states/
destinations belong to states, flow, interactive or Prototype Planner, never this
command. Arbitrary enter/exit or unverified shared-element requests are recognized
as MOTION_LIMITED and make zero writes; report the exact limitation. More animated
requires one concise intent clarification before writes, not a decorative campaign.

REDUCED-MOTION-SAFE POLICY

The current MCP/Figma automation does not dynamically switch prototype transitions based on an operating-system reduced-motion preference.

Therefore Figma Designer's automated policy is intentionally restrained:
- use short durations
- use DISSOLVE for ordinary screen changes
- use SMART_ANIMATE only for compact component-state changes
- do not introduce scale, parallax, bounce, spring-like, or decorative motion automatically
- do not introduce directional screen motion unless explicitly justified
- do not automatically create timed animation sequences

This is a conservative authoring policy, not an adaptive runtime accessibility preference.

STRICT WRITE ISOLATION

Before the first write:
1. inspect the full page
2. identify production root(s)
3. identify `Figma Designer — Component States`
4. identify the canonical `Figma Designer — Interactive App` SECTION
5. identify unrelated page-level nodes
6. record a structural/style fingerprint for every page-level subtree
7. record every existing reaction that may be touched, including the complete trigger and complete actions array

WRITE ALLOWLIST:
- set_reactions on EXISTING nodes inside `Figma Designer — Component States`
- set_reactions on EXISTING nodes inside the canonical `Figma Designer — Interactive App` SECTION
- only when an existing reaction's transition needs normalization under this motion system

WRITE DENYLIST:
- all production nodes
- all production reactions
- unrelated page-level nodes
- node creation
- node deletion
- node cloning
- node conversion
- node movement or reparenting
- renaming
- resizing
- restyling
- text changes
- instance overrides
- component-set membership changes
- new runtime destinations
- new runtime reactions
- removed runtime reactions

REACTION SEMANTICS ARE IMMUTABLE

This command MUST NOT change:
- reaction count
- trigger type
- trigger timeout or trigger-specific fields
- action count
- action type
- destinationId
- navigation
- URL
- preserveScrollPosition
- resetScrollPosition
- resetVideoPosition
- overlay position or overlay behavior
- any other non-transition semantic field

The ONLY allowed semantic difference is the transition object of an already-existing supported NODE action.

Because set_reactions writes a full reaction list:
1. call get_reactions before every write
2. preserve the complete existing reaction array in memory
3. reconstruct the full array exactly
4. change only the approved transition object
5. use mode `replace` only for that exact node
6. immediately call get_reactions again
7. compare pre/post reaction count and every non-transition field
8. if any non-transition field changed, STOP and report failure

If you cannot reconstruct a reaction losslessly, DO NOT WRITE IT.
Report it as skipped.

NORMALIZATION RULES

Apply the shared semantic support matrix, compatible explicit overrides and evidence
requirements. STATE/FEEDBACK require compatible same-set CHANGE_TO. NAVIGATION uses
NAV_DEFAULT; justified SPATIAL_NAVIGATION uses NAV_SPATIAL with real semantic direction,
never canvas positions. OVERLAY uses OVERLAY_DEFAULT with position/behavior unchanged.
Preserve verified intentional spatial/shared continuity unless compatible normalization
is explicitly requested. Ordinary SCROLL uses SCROLL_NATIVE, preserving existing
null/current SCROLL_TO transitions and reporting SEMANTICALLY_RECOGNIZED /
NO_TRANSITION_WRITE. Explicit animated scrolling alone selects SCROLL_SMOOTH from
the shared registry. Verify the actual child destination, owned source/target,
prepared native overflowDirection, common scroll context, real content overflow
and complete nonconflicting arrays using current read-only source evidence.
Unprepared context: FIGMA_LIMITED: SCROLL_CONTEXT_PREPARATION, zero writes.
Missing evidence: UNKNOWN, zero writes. No UI automation, private fields, setter,
resizing or screen rebuild to prepare scrolling. SCROLL_ANIMATE applies only to
the exact existing SCROLL_TO transition; no custom easing/duration expansion.
Preserve SWAP and all
non-NODE actions; do not guess tokens. ENTER/EXIT may map only through an existing
truthful NAVIGATE/OVERLAY; independent element animation remains MOTION_LIMITED.
Do not automatically enable matchLayers, rename/restructure layers or imitate springs.

Do not add a missing reaction.
Do not remove a reaction.
Do not change a destination to make a transition fit.

FLOAT TOLERANCE

Use the unchanged duration ranges in rules/figma-motion-semantics.mjs; equivalent
float32 values must not cause a rewrite. Do not put tolerance fields into transitions.

NO-OP BEHAVIOR

If every eligible existing reaction already matches the motion tokens:
- make zero writes
- report MOTION_ALREADY_NORMALIZED
- still complete the read-only verification described below

POST-WRITE VERIFICATION

After all eligible reactions are processed:
1. re-inspect production and verify it is structurally/style/reaction identical
2. re-inspect unrelated page-level nodes and verify they are identical
3. verify `Figma Designer — Component States` has identical structure, styling, component IDs, COMPONENT_SET membership, and reaction semantics; only allowed transition objects may differ
4. verify `Figma Designer — Interactive App` has identical SECTION/screen/instance structure, styling, destinations, and reaction semantics; only allowed transition objects may differ
5. verify no reaction was added or removed
6. verify no destination, navigation, trigger, or action type changed
7. verify every normalized transition matches an Figma Designer token
8. report exactly which reaction IDs/nodes changed, or report zero writes

FINAL REPORT

Keep the report concise but specific.

Report:
- motion scope and change authorization versus read-only audit
- semantic intent and verified evidence before token/implementation
- supported, preserved, limited or unknown cases with honest reasons
- audit rows: reaction, intent, current implementation, expected token, MATCH / MISMATCH / LIMITED / UNKNOWN
- nodes/reactions inspected
- nodes/reactions changed
- skipped reactions and why
- component-state transition summary
- screen-navigation transition summary
- any existing directional/overlay/non-node actions preserved
- whether production remained untouched
- whether component/state and flow structure remained unchanged
- whether reaction semantics remained identical
- whether the run was a no-op

End the report with exactly one of:

FIGMA_MOTION_GUARD: PASS

or

FIGMA_MOTION_GUARD: FAIL

Use PASS only if:
- no write occurred outside the reaction-transition allowlist
- no reaction was added or removed
- no non-transition reaction semantic field changed
- production and unrelated page-level content remained unchanged
- component/state and flow structure/style remained unchanged

Use FAIL if any forbidden mutation is detected.

---
description: Normalize motion on existing Figma reactions without changing interaction semantics
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

MOTION TOKENS

Use these Figma Designer defaults unless the user explicitly requested another supported transition for a specific existing edge.

1. COMPONENT STATE / FAST
Use for NODE + CHANGE_TO between variants in the SAME COMPONENT_SET:
- transition.type: SMART_ANIMATE
- duration: 0.10 seconds
- easing.type: EASE_OUT

This is the canonical interaction-state token.

2. SCREEN / DEFAULT
Use for ordinary NODE + NAVIGATE between runtime screen FRAMEs when no spatial relationship is explicitly required:
- transition.type: DISSOLVE
- duration: 0.15 seconds
- easing.type: EASE_OUT

This is the canonical screen-navigation token.

3. SPATIAL / EXPLICIT ONLY
Directional motion is allowed only when the user request or existing journey structure clearly requires a directional spatial relationship.

Allowed directional transition types:
- PUSH
- MOVE_IN
- MOVE_OUT
- SLIDE_IN
- SLIDE_OUT

Default directional duration:
- 0.20 seconds
- easing.type: EASE_OUT

Directional transitions must include:
- direction: LEFT, RIGHT, TOP, or BOTTOM
- matchLayers: false unless the existing reaction already intentionally uses matching-layer behavior and that behavior is verified

Do not introduce PUSH/MOVE/SLIDE merely for visual flair.
When direction is ambiguous, use SCREEN / DEFAULT instead.

4. OVERLAY / CONSERVATIVE
For existing NODE + OVERLAY reactions:
- prefer DISSOLVE
- duration: 0.15 seconds
- easing.type: EASE_OUT

Do not convert an overlay to SMART_ANIMATE automatically.
Do not create overlays during this task.

5. NON-NODE ACTIONS
For BACK, CLOSE, URL, or other non-NODE actions:
- preserve the existing action exactly
- do not invent transition fields that are not already supported by that action
- do not replace the action type

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

For each existing reaction:

A. NODE + CHANGE_TO
- verify destination exists
- verify source/destination are compatible variants of the same COMPONENT_SET
- normalize to COMPONENT STATE / FAST
- if CHANGE_TO is being used for screen navigation, do not normalize it; report a structural defect instead

B. NODE + NAVIGATE
- verify destination exists and is a prototype screen FRAME or otherwise valid intended prototype destination
- if current transition is DISSOLVE/SMART_ANIMATE and no directional relationship is explicit, normalize to SCREEN / DEFAULT
- if the current transition is directional and clearly intentional, preserve it unless the user explicitly requested normalization
- if a directional transition is explicitly requested, apply SPATIAL / EXPLICIT ONLY

C. NODE + OVERLAY
- preserve destination/action semantics
- normalize only an existing supported transition to OVERLAY / CONSERVATIVE when lossless

D. NODE + SCROLL_TO or SWAP
- do not guess a motion token
- preserve as-is unless the user explicitly requested a supported transition and the semantics are clear

E. BACK / CLOSE / URL
- preserve as-is

Do not add a missing reaction.
Do not remove a reaction.
Do not change a destination to make a transition fit.

FLOAT TOLERANCE

Figma may read 0.10 seconds back as approximately 0.10000000149.

Treat small float32 differences as equivalent:
- 0.10 token: accept 0.095 to 0.105
- 0.15 token: accept 0.145 to 0.155
- 0.20 token: accept 0.195 to 0.205

Do not rewrite a reaction solely because its read-back float differs within these tolerances.

NO-OP BEHAVIOR

If every eligible existing reaction already matches the motion tokens:
- make zero writes
- report that the motion system is already normalized
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
- motion scope
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
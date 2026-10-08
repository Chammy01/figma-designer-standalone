---
description: Create or update native Figma interaction-state component sets with production isolation
agent: figma-designer
subagent: false
---

FIGMA INTERACTION STATES TASK — STANDALONE V1.2

Run health_check before making changes.

Follow AGENTS.md, the figma-designer agent instructions, and rules/figma-design-rules.md.

This task creates or upgrades a nondestructive interaction-state library from the existing Figma design using native COMPONENT_SET variants where appropriate.

USER SCOPE / TARGET

$ARGUMENTS

Treat the user input above as the requested scope. Resolve named Figma nodes/screens from the live document; do not rely on stale IDs from another file.



PHASE 2 CAPABILITIES

The connected Figma MCP supports:
- native COMPONENT creation
- native COMPONENT_SET creation through combine_as_variants
- variant properties
- prototype reactions through set_reactions
- CHANGE_TO navigation between sibling variants in the same COMPONENT_SET

Use these capabilities directly.

Do not fabricate variants with nested frames.
Do not describe ordinary sibling COMPONENT nodes as variants unless they are children of a real COMPONENT_SET.
Do not use SWAP as a substitute for CHANGE_TO when the interaction is between variants of the same component set.

STRICT WRITE ISOLATION

The production design is READ-ONLY for this command.

Before the first write operation:
1. inspect the current document
2. identify the canonical top-level production root or roots
3. identify the canonical top-level frame named `Figma Designer — Component States`
4. record a baseline snapshot of every non-library top-level node and its descendant IDs
5. for the targeted production subtree, also record key properties needed to detect mutation, including type, name, parent, bounds, text content where applicable, fills, strokes, typography, child order, and descendant count

WRITE ALLOWLIST:
- the canonical top-level frame named `Figma Designer — Component States`
- descendants inside that state-library frame
- newly created state-library nodes
- existing state-library COMPONENT nodes that are being combined into a native COMPONENT_SET
- reactions on COMPONENT variants inside that state-library frame
- clearly empty or broken leftovers created by THIS SAME states run inside that library frame

WRITE DENYLIST:
- every production root
- every production descendant
- unrelated page-root nodes
- unrelated component libraries
- existing nodes outside `Figma Designer — Component States`

Do not, even as cleanup or repair:
- convert a production control into a component
- move a production node
- delete a production node
- replace a production node
- reparent a production node
- rename a production node
- fix duplicate production content
- repair unrelated layout defects
- delete stray page-root content outside the state library
- make any aesthetic improvement outside the state library

If you notice an unrelated defect, REPORT IT ONLY. Do not fix it.

Instead:
1. inspect the production control read-only
2. reproduce its visual language inside the state library
3. create or reuse the state examples there
4. convert only state-library examples into native COMPONENT nodes
5. combine matching state COMPONENT nodes into one native COMPONENT_SET
6. add only conservative, semantically valid reactions inside that COMPONENT_SET

If any required operation would need a production write, stop that family and report the limitation rather than modifying production.

STATE LIBRARY

Create or reuse exactly one top-level frame named:

Figma Designer — Component States

This is a FRAME on the current Figma page. It is not a page name.
It must be a direct page-level sibling of the production root or roots, not a child inside a production Auto Layout tree.

Before creating a new library frame:
- inspect the current Figma page for an existing FRAME with this exact name
- reuse the existing canonical frame when one exists
- if duplicates exist, do not delete them automatically unless the user explicitly asked for cleanup
- report duplicate state-library frames as a warning

Keep state families visually separated and readable.
Do not allow the state library to overlap or alter the production design.

EXISTING FAMILY REUSE

Before creating a family:
1. inspect the state-library frame
2. call get_local_components when useful
3. search for an existing matching COMPONENT_SET
4. search for existing standalone state COMPONENT nodes that belong to the family

If a correct native COMPONENT_SET already exists:
- reuse it
- do not create a duplicate set
- preserve its component IDs
- add only missing states or missing allowed reactions

If matching standalone COMPONENT states already exist inside the state library:
- preserve their IDs
- complete only genuinely missing states
- combine the family with combine_as_variants exactly once
- do not recreate valid states merely to obtain a component set

If an operation times out after partial success:
- inspect before retrying
- continue from the actual document state
- never rerun the entire family blindly

COMPONENT FAMILY NAMING

Before combining, standalone state components may use:

Control / Role / State

Examples:

Button / Primary / Default
Button / Primary / Hover
Button / Primary / Pressed
Button / Primary / Disabled

Link / Navigation / Default
Link / Navigation / Hover
Link / Navigation / Focus
Link / Navigation / Active

Input / Email / Default
Input / Email / Focus
Input / Email / Error
Input / Email / Disabled

Toggle / Notifications / Off
Toggle / Notifications / On
Toggle / Notifications / Disabled

For a native variant family:
- COMPONENT_SET name = `Control / Role`
- variant property name = `State`
- component child names after combining = `State=<Value>`

Examples:

COMPONENT_SET: Button / Primary
- State=Default
- State=Hover
- State=Pressed
- State=Disabled

COMPONENT_SET: Link / Navigation
- State=Default
- State=Hover
- State=Focus
- State=Active

Do not rename production nodes to achieve this naming scheme.

STATE CLASSIFICATION

Only create states that make semantic sense.

BUTTON
Prefer:
- Default
- Hover
- Pressed
- Disabled

Add Loading only when the control genuinely represents an async action.

TEXT LINK / NAVIGATION LINK
Prefer:
- Default
- Hover
- Focus
- Active when meaningful

Keep link states link-like.
Do not turn plain text navigation into button-like filled pills unless the existing design already does that.

TEXT INPUT / TEXTAREA
Prefer:
- Default
- Focus
- Error
- Disabled

Add Filled or Success only when useful.

TOGGLE
Prefer:
- Off
- On
- Disabled

Use separate disabled-on/off states only when that distinction is materially useful.

CHECKBOX
Prefer:
- Unchecked
- Checked
- Indeterminate when relevant
- Disabled

RADIO
Prefer:
- Unselected
- Selected
- Disabled

TAB
Prefer:
- Inactive
- Hover
- Active

Do not duplicate full page content for tab states.

DROPDOWN
Prefer:
- Closed
- Open
- Selected
- Disabled

The Open state may contain a compact representative menu.

MODAL
Create the visible modal component and meaningful internal control states.
Do not create an invisible `Closed` variant merely to mimic prototype state unless the user explicitly requests a modal-state model.

VISUAL CONSISTENCY

Derive every state family from the existing product design.

Preserve its:
- typography
- color system
- radii
- border language
- shadows
- spacing
- density
- icon language

Do not introduce a new design direction.
Do not invoke anti-slop or polish guidance as permission to redesign the source control.
This task extends the established design system.

STATE DIFFERENTIATION

Make states visibly meaningful but restrained.

Hover:
- modest text, fill, stroke, underline, or elevation change

Pressed:
- clear pressed feedback
- avoid dramatic scaling

Disabled:
- reduced contrast
- reduced false emphasis
- preserve legibility

Focus:
- visible accessible focus treatment
- a focus stroke or ring may paint slightly outside component bounds
- do not damage structural sizing merely to eliminate a harmless painted-bounds overhang

Error:
- semantic error treatment
- preserve readability

Success:
- semantic success treatment only when the control actually benefits from it

NATIVE VARIANT CREATION

For each family that has two or more compatible state COMPONENT nodes:
1. verify every candidate is a local COMPONENT inside `Figma Designer — Component States`
2. verify none is already a member of another COMPONENT_SET
3. determine the intended family container inside the state library
4. call combine_as_variants once with all state component IDs
5. use name = `Control / Role`
6. use propertyName = `State`
7. pass variantValues in the same order as componentIds
8. pass parentId when there is a clear intended family container inside the state library; otherwise allow the tool to choose the nearest safe common ancestor
9. do not delete former wrapper frames merely because combining moved their component children
10. inspect the resulting COMPONENT_SET immediately

After combining, verify:
- exactly one native COMPONENT_SET exists for that family
- every intended original component ID still exists
- every variant's componentSetId equals the new set ID
- every variant reports the expected `State=<Value>` property
- the set remains inside `Figma Designer — Component States`

PROTOTYPE REACTIONS — CONSERVATIVE DEFAULTS

Before writing reactions:
- call get_reactions on each source variant you intend to modify
- preserve unrelated existing reactions
- never add duplicate reactions
- prefer set_reactions mode `append` for a genuinely missing reaction
- do not use `replace` unless the user explicitly asked to replace existing prototype behavior

For BUTTON families with Default, Hover, Pressed, and Disabled variants, wire the proven interaction chain:

Default:
- trigger: ON_HOVER
- action type: NODE
- navigation: CHANGE_TO
- destination: Hover variant
- transition: SMART_ANIMATE
- duration: 0.1 seconds
- easing: EASE_OUT

Hover:
- trigger: ON_PRESS
- action type: NODE
- navigation: CHANGE_TO
- destination: Pressed variant
- transition: SMART_ANIMATE
- duration: 0.1 seconds
- easing: EASE_OUT

Pressed:
- add no automatic reverse reaction by default

Disabled:
- add no reactions

Figma's ON_HOVER CHANGE_TO behavior reverts when the pointer leaves the interactive component, so do not fabricate a mouse-leave reaction.

For TEXT LINK / NAVIGATION LINK families:
- Default ON_HOVER -> Hover using CHANGE_TO with SMART_ANIMATE 0.1s EASE_OUT is allowed when both variants exist
- do not automatically wire Focus or Active unless the user explicitly requests that interaction behavior

For toggles, checkboxes, radios, tabs, dropdowns, inputs, and other families:
- create the native COMPONENT_SET
- do not invent interaction mappings merely because variants exist
- wire additional reactions only when the requested behavior is unambiguous or explicitly requested

Never add reactions to Disabled variants.
Never add a reaction whose destination is outside the same COMPONENT_SET when using CHANGE_TO.

IMPLEMENTATION

Useful MCP tools include:
- inspect_node_as_html
- write_html
- create_component
- create_component_from_html
- get_local_components
- combine_as_variants
- get_reactions
- set_reactions

Use create_component only on state-library frames or nodes created for the state library.
Every actual state must end as a native Figma COMPONENT.
Every multi-state family should end as a native COMPONENT_SET when structurally compatible.
Keep children editable.

Respect known parser constraints:
- explicit text widths
- no structured multiline content via br
- buttons use actual containers
- prefer Auto Layout where practical
- verify important strokes
- inspect after creation
- avoid relying on HTML entities such as &lsquo; in generated descriptive text; use normal plain text instead

PARTIAL-WRITE RECOVERY

write_html and other bridge operations can time out after partially creating content.

If a write, conversion, combination, or reaction operation fails or times out:

1. inspect the state-library frame
2. inspect get_local_components and get_reactions as relevant
3. determine exactly which families, states, sets, and reactions already exist
4. preserve valid completed work
5. create only missing states
6. combine only families that are not already valid COMPONENT_SETs
7. add only missing reactions
8. remove only clearly empty or broken leftovers created by THIS SAME states run
9. do not rerun the whole family blindly
10. inspect again

Never duplicate a complete state family merely because one operation timed out.
Never call combine_as_variants twice on a family that already became a valid COMPONENT_SET.

LAYOUT

Preserve the source control's dimensions when practical.

If exact source dimensions cause the state sheet to overflow:
- prefer wrapping or reorganizing the library layout
- modestly adapting display-copy width is acceptable only when necessary
- do not change production-control dimensions
- report meaningful dimensional adaptation in the final summary

For page-wide automatic generation:
- create at most six meaningful component families by default
- prioritize controls that establish the product's interaction language
- repeated copies of the same control pattern count as one family

VALIDATION

After generation:

1. inspect `Figma Designer — Component States`
2. verify every intended state is a native COMPONENT
3. verify every compatible multi-state family is a real COMPONENT_SET
4. verify COMPONENT_SET names and State variant properties
5. verify original state component IDs were preserved when existing components were combined
6. inspect every reaction that was added or reused
7. verify button Default has at most one intended ON_HOVER -> Hover CHANGE_TO reaction
8. verify button Hover has at most one intended ON_PRESS -> Pressed CHANGE_TO reaction
9. verify Disabled variants have no newly added reactions
10. verify every CHANGE_TO destination belongs to the same COMPONENT_SET
11. compare every non-library top-level node and recorded production descendant against the pre-write baseline
12. verify production root IDs and child order are unchanged
13. verify the targeted production control's type, name, parent, bounds, text, fills, strokes, typography, and child structure are unchanged
14. verify no unrelated page-root node was added, deleted, moved, renamed, or modified
15. verify no production root was replaced
16. check obvious text overflow
17. check obvious frame overflow
18. check family spacing and library growth
19. distinguish structural bounds from harmless painted focus-ring bounds
20. report duplicate state-library frames if any exist

If any non-library mutation is detected:
- do not hide it
- do not make additional unrelated fixes
- report exactly what changed
- mark the task as a production-isolation failure

FINAL REPORT

Keep the report concise but specific.

Report:
- state-library frame ID
- families created or reused
- COMPONENT_SET IDs
- component/variant IDs and State properties
- reactions added or reused
- any partial-write recovery performed
- any former wrapper frames left behind after combining
- any intentional display-size adaptation
- whether the source target remained untouched
- whether the complete non-library production baseline remained unchanged
- any duplicate state-library warning
- any MCP limitation encountered

End the report with exactly one of these machine-readable lines:

FIGMA_PRODUCTION_GUARD: PASS

or

FIGMA_PRODUCTION_GUARD: FAIL

Use PASS only if no write outside the canonical `Figma Designer — Component States` frame occurred and the before/after production comparison found no mutation.

Do not claim a family is a native variant set unless inspection confirms a real COMPONENT_SET.
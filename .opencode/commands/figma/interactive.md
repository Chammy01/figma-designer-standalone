---
description: Upgrade the Figma runtime screens into a working interactive interface
agent: figma-designer
subagent: false
---

FIGMA WORKING INTERFACE TASK — STANDALONE V1.2

Run health_check before making changes.

Follow AGENTS.md, the figma-designer agent instructions, `rules/figma-standalone-rules.md`, and any project design rules.

USER SCOPE / TARGET

$ARGUMENTS

Treat the user input above as the requested interface scope and behavior intent. Resolve named Figma nodes/screens from the live document. Do not rely on stale IDs from another file or session.

GOAL

Upgrade the current runtime from a narrow clickable prototype into the strongest truthful WORKING INTERFACE that Figma can represent.

The target architecture is:

production screens (strictly read-only)
-> `Figma Designer — Component States` (native component/state source)
-> `Figma Designer — Interactive App` SECTION (working Figma runtime)
-> motion normalization
-> read-only interface QA
-> browser export

This command is not a redesign pass. Preserve the production visual language and existing runtime screen fidelity.

CANONICAL RUNTIME CONTAINER

The canonical runtime container is exactly:

`Figma Designer — Interactive App`

It must be a direct page-level SECTION.

LEGACY V1 MIGRATION

The prior runtime name was:

`Figma Designer — Prototype Flows`

At the beginning of this command:

1. inspect all direct page-level nodes
2. count exact-name `Figma Designer — Interactive App` nodes
3. count exact-name `Figma Designer — Prototype Flows` nodes
4. identify their node types

Migration rules:

A. Canonical SECTION already exists
- reuse it
- do not create another
- do not rename it

B. Canonical absent, exactly one legacy SECTION exists
- fingerprint it first
- rename that SECTION in place to `Figma Designer — Interactive App`
- preserve its ID, children, child order, screen IDs, screen bounds, reactions, and geometry
- immediately re-read and verify only the container name changed

C. Canonical absent, exactly one legacy FRAME exists
- this is migration debt
- if the frame clearly contains runtime screen FRAMEs and migration can be done without changing their IDs/reactions/absolute geometry, create one page-level SECTION named `Figma Designer — Interactive App`, reparent only the intended runtime children, verify positions/reactions, then remove the legacy FRAME only when empty
- otherwise STOP and report FAIL rather than performing an ambiguous rebuild

D. Both canonical and legacy containers exist
- STOP destructive work
- report ownership ambiguity
- do not merge or delete either automatically

E. Neither exists
- create exactly one page-level SECTION named `Figma Designer — Interactive App`
- clone only the production screens required by the requested interface scope
- keep each runtime screen as a native FRAME direct child of the SECTION when practical

STRICT PRODUCTION GUARD

Production is strictly read-only.

Before the first write:
- identify every production root
- record a fingerprint for every production root including ID, name, type, bounds, direct child order, descendant count, relevant text/style summary, and reactions as practical
- record the same for unrelated page-level roots that this command does not own

Never modify production to make the interactive runtime easier to build.

WRITE ALLOWLIST

This command may write only:

1. inside `Figma Designer — Interactive App`
2. the canonical runtime SECTION name during the one-time migration described above
3. EXISTING reaction arrays on variants inside `Figma Designer — Component States` only when ALL of the following are true:
   - the interaction semantics are unambiguous
   - the reaction is necessary for a matching interactive control
   - the existing variant remains structurally/style-identical
   - the complete pre-write reaction list is read first
   - unrelated existing reactions can be preserved losslessly
   - the write adds/corrects only the justified reaction behavior

Do not create new component families in this command. Missing component families belong to `/figma/states`.

WRITE DENYLIST

- production nodes or production reactions
- unrelated page-level nodes
- component-set membership changes
- deleting valid component variants
- redesigning component visuals
- inventing product screens/content/data/options
- broad cleanup outside the runtime SECTION

INTERACTION INVENTORY — REQUIRED

Before upgrading controls, inspect every runtime screen and build an interaction inventory.

Identify likely controls by structure, copy, visual treatment, source-production counterpart, and existing component families. Include at minimum:

- buttons
- text/navigation links
- inputs/search fields
- selects/filters/dropdowns
- tabs
- toggles
- checkboxes/radios
- cards with clear click affordances
- back/close controls
- modal/dialog triggers
- pagination or segmented controls
- any existing node with a reaction

For every meaningful control record:
- runtime node ID
- visible label/name
- runtime screen ID
- matching production node if identifiable
- matching COMPONENT_SET if any
- existing node type (FRAME/TEXT/INSTANCE/etc.)
- existing reactions
- intended behavior supported by source/user context

Then classify the intended result as exactly one of:

WORKING_ACTION
WORKING_STATE
FIGMA_LIMITED
INTENTIONALLY_INERT

Do not skip controls merely because they currently have zero reactions.

CONTROL COMPONENTIZATION

When an existing COMPONENT_SET clearly corresponds to a runtime control, prefer replacing only the runtime clone control with an INSTANCE of the correct family.

For each replacement:

1. inspect the existing runtime control and its production counterpart
2. capture visible text, size, position, Auto Layout parent/index, fills, strokes, radii, and relevant typography
3. identify the intended COMPONENT_SET and intended starting variant
4. instantiate the starting variant
5. IMMEDIATELY resolve the created instance's actual source component ID
6. resolve that source component's `componentSetId`
7. verify it equals the intended family ID
8. if it does not match, remove only the incorrect same-run instance and do not continue with it
9. apply safe text/visibility overrides when supported
10. preserve the source control's intended geometry; resize the runtime instance when necessary without changing the component source
11. insert/reorder it at the exact intended child index
12. delete the cloned placeholder only after the correct instance is verified
13. re-read geometry and child order

IMPORTANT: `instantiate_by_name` is ambiguous when several component children share names such as `State=Default`. Never trust the name result without source/set resolution.

AUTO LAYOUT ORDER

Do not use `move_to_anchor` as proof of Auto Layout child reordering.

When child order matters:
- use a real reorder operation if available
- otherwise reparent/rebuild the local runtime children safely
- re-read positions afterward

Do not accept a visually inverted button/link order simply because node creation succeeded.

INTERACTION IMPLEMENTATION RULES

A. BUTTONS

If a matching button family exists:
- use the Default INSTANCE in the runtime
- preserve inherited hover/press behavior from the component family
- add runtime navigation/action only when a real behavior exists
- do not add actions to Disabled variants

If a real destination screen exists:
- use NODE + NAVIGATE to that runtime screen
- default transition DISSOLVE 0.15s EASE_OUT

B. NAVIGATION / TEXT LINKS

When a matching Link family exists:
- componentize the runtime control
- preserve truthful hover/focus/active behavior available in that family

If a real destination runtime screen exists:
- add NODE + NAVIGATE

If no destination exists:
- keep visual state behavior working
- classify as WORKING_STATE when meaningful state behavior exists
- otherwise INTENTIONALLY_INERT
- do not invent a destination screen

C. SEARCH / TEXT INPUTS

When a matching input family exists:
- use an INSTANCE in the runtime
- make focus/active visual behavior work when the component variants and MCP support it

Do not claim unrestricted free-form typing unless the Figma runtime actually supports and verifies it.
If true text entry is unavailable:
- preserve realistic focus feedback
- optionally simulate a specific predefined filled state only when the source/user request defines the value
- classify the unsupported typing behavior as FIGMA_LIMITED

Do not invent search results or query values.

D. FILTERS / SELECTS / DROPDOWNS

When a matching select/filter family exists:
- use an INSTANCE
- make available hover/focus/selected states truthful

If real option labels/content are visible in production, existing runtime content, or explicitly supplied by the user:
- prefer a native overlay/menu implementation when supported
- wire open -> choose -> close/selected behavior only from those real options

If no option list is defined:
- do not invent options
- provide only truthful state behavior supported by the family
- classify the missing full selection behavior as FIGMA_LIMITED or INTENTIONALLY_INERT as appropriate

E. TOGGLES / CHECKBOXES / RADIOS

When semantics and variants clearly define states:
- wire state changes with CHANGE_TO inside the same COMPONENT_SET
- preserve selected/checked state where Figma's runtime supports it
- do not invent business consequences beyond the visual control state

F. TABS / SEGMENTED CONTROLS

Wire active/inactive state and visible content only when the corresponding content already exists or was explicitly requested.
Do not fabricate missing tab panels.

G. OVERLAYS / MODALS / MENUS

Use Figma overlay actions only when the overlay content is real and semantically supported.
Place runtime-only overlay content inside the canonical Interactive App ownership zone or another unambiguous system-owned runtime scope supported by Figma.
Do not invent modal/menu content just to exercise an overlay action.

H. BACK / CLOSE

Use BACK or CLOSE only when the control clearly represents that behavior and the prototype runtime semantics support it.

I. CARDS / ROWS

If the production design clearly communicates a clickable row/card and a real destination exists, wire it.
If only a nested text link is the affordance, do not make the entire card clickable unless the source design/user request supports that.

COMPONENT-LIBRARY REACTION EXTENSION

The component library is structurally read-only, but this command may append a missing variant reaction when needed for truthful working-state behavior.

Before any library reaction write:
- call get_reactions on the exact source variant
- inspect destination variant and verify same componentSetId
- preserve every unrelated existing reaction
- avoid duplicate equivalent reactions

Examples that MAY be justified when the family semantics are unambiguous:
- Link Default ON_HOVER -> Hover
- Input Default ON_CLICK -> Focus when the Figma reaction model supports it cleanly
- Filter Default ON_HOVER -> Hover
- a clearly defined toggle Off ON_CLICK -> On and On ON_CLICK -> Off

Do not guess mappings such as Filter click -> Selected if the selected value/menu semantics are not actually defined.

REACTION SAFETY

For every reaction written:
- read the complete existing source reaction array first
- prefer append for a genuinely missing reaction when supported
- use replace only when preserving/reconstructing the entire array losslessly
- immediately read back
- verify trigger, action, destination, transition, and unrelated reactions

CHANGE_TO rules:
- destination must be a compatible variant in the same COMPONENT_SET
- transition SMART_ANIMATE 0.10s EASE_OUT unless existing explicit semantics require otherwise

NAVIGATE rules:
- destination must be a runtime screen FRAME, never the production frame
- transition DISSOLVE 0.15s EASE_OUT unless explicit spatial semantics exist

Do not point runtime navigation back into production.

VARIABLES / CONDITIONALS

Use Figma variables/conditionals only when:
- the connected MCP exposes the necessary operations
- the interaction semantics are defined by the source or user request
- the implementation can be read back and validated

Variables can be appropriate for persisted toggles, selected tabs/filters, or other stateful behavior.

If variable support is unavailable, use native component/overlay behavior where truthful and report the limitation. Do not claim persistence that was not implemented.

WRITE_HTML / TOOL TIMEOUT RECOVERY

A timeout is an unknown outcome, not proof of failure.

After any timed-out write:
1. re-read the affected runtime/container subtree
2. wait for node counts/state to stabilize when work may still be in flight
3. compare intended vs actual results
4. preserve valid completed work
5. retry only the missing operation
6. remove only clear same-run duplicates/broken leftovers inside the writable ownership zone

Never blindly rerun a whole screen or interaction family.

GEOMETRY VALIDATION

Compare geometry in consistent coordinate spaces.
Child bounds may be parent-relative while SECTION/root bounds may be page-absolute.

For every componentized control verify:
- no unintended sibling reflow
- no screen overflow caused by replacement
- no overlap created by replacement
- control remains inside expected Auto Layout/frame bounds

INTERACTION COVERAGE GATE

At the end, rescan every runtime screen and produce a coverage table.

For every meaningful control report:
- runtime ID
- role/label
- source component set (or none)
- classification: WORKING_ACTION / WORKING_STATE / FIGMA_LIMITED / INTENTIONALLY_INERT
- implemented reactions/state behavior
- destination/overlay if any
- limitation/reason when not fully actionable

FAIL the command if ANY of these are true:
- an obvious interactive control has a matching native component family but remains a decorative non-instance without a justified reason
- a required real destination exists but the runtime control is left unwired
- a runtime navigation points to production rather than runtime
- an instance resolves to the wrong component family
- a CHANGE_TO leaves its source component set
- duplicate equivalent reactions were introduced
- duplicate controls/overlays/screens were created by retries
- production changed
- unrelated page-level content changed

Do NOT fail merely because a behavior is genuinely impossible in Figma or undefined in the source. Classify and report it truthfully.

POST-WRITE VALIDATION

After all work:

1. verify exactly one `Figma Designer — Interactive App` SECTION exists
2. verify no ambiguous legacy runtime container remains after a successful migration
3. verify runtime screens remain native FRAMEs with stable IDs when reused
4. verify all expected instances resolve to correct source components/component sets
5. read back all runtime/library reactions touched by this command
6. verify no invalid/missing destination IDs
7. verify runtime screens do not point into production
8. verify component library structure/variant IDs remain intact
9. verify production fingerprints are unchanged
10. verify unrelated page-level fingerprints are unchanged
11. verify runtime geometry/ordering is sane
12. verify interaction coverage classification is complete

FINAL REPORT

The FIRST non-empty line must be exactly one of:

FIGMA_INTERACTIVE: PASS
FIGMA_INTERACTIVE: WARN
FIGMA_INTERACTIVE: FAIL

Use PASS only when:
- the runtime container is canonical and unambiguous
- production is unchanged
- all meaningful controls were inventoried
- every control that can truthfully be interactive in Figma has been upgraded
- real destinations are wired
- no incorrect component-family mappings or invalid reactions exist
- any remaining limitations are intrinsic Figma/runtime limitations or intentionally undefined behavior, not missing implementation work

Use WARN when the working interface is structurally valid but meaningful behavior remains Figma-limited or source behavior is materially undefined.

Use FAIL for production mutation, invalid/ambiguous runtime architecture, wrong component mappings, broken destinations, duplicate artifacts, or required interactions that were implementable but left broken.

After the result marker report:
- runtime SECTION ID/name/type
- migration performed, if any
- runtime screens
- interaction inventory count
- componentized controls and source/set IDs
- library reactions added/changed
- runtime reactions added/changed
- WORKING_ACTION controls
- WORKING_STATE controls
- FIGMA_LIMITED controls with exact limitation
- INTENTIONALLY_INERT controls with reason
- duplicate/orphan checks
- geometry/order checks
- production fingerprints before/after
- total writes and recovery actions

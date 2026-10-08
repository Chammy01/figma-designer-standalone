---
description: Create or update a focused journey inside the working Figma interface
agent: figma-designer
subagent: false
---

FIGMA JOURNEY FLOW TASK — STANDALONE V1.2

Run health_check before making changes.

Follow AGENTS.md, the figma-designer agent instructions, `rules/figma-standalone-rules.md`, and any project design rules.

USER SCOPE / TARGET

$ARGUMENTS

Treat the user input above as the requested journey. Resolve all source/destination screens from the live document; do not rely on stale IDs from another file/session.

PURPOSE

This command creates or updates a focused navigation journey inside the canonical working runtime. It does not by itself certify that the whole interface is interactive. `/figma/interactive` performs the full control-by-control working-interface pass.

Canonical architecture:

production screens (read-only)
-> `Figma Designer — Component States` (read-only)
-> `Figma Designer — Interactive App` SECTION (writable runtime screens)

CANONICAL RUNTIME SECTION

Use exactly one direct page-level SECTION named:

`Figma Designer — Interactive App`

If it already exists, reuse it.

Legacy migration:
- if the canonical section is absent and exactly one direct page-level SECTION named `Figma Designer — Prototype Flows` exists, rename it in place to `Figma Designer — Interactive App` before other flow writes and verify its ID/children/reactions/bounds remain unchanged
- if both legacy and canonical containers exist, stop and report ambiguity
- if only a legacy FRAME exists, do not perform a broad conversion in this focused flow command; instruct the interface migration to be handled by `/figma/interactive`

STRICT WRITE ISOLATION

Before writes:
1. inspect all page-level nodes
2. identify production roots
3. identify `Figma Designer — Component States`
4. identify canonical/legacy runtime containers
5. fingerprint every page-level subtree outside the runtime ownership zone
6. inspect requested production source/destination screens and relevant controls

WRITE ALLOWLIST:
- `Figma Designer — Interactive App` SECTION
- descendants inside it
- cloned runtime screens inside it
- runtime instances/helper labels inside it
- reactions on runtime descendants
- same-run broken leftovers inside it
- the one-time safe legacy SECTION rename described above

WRITE DENYLIST:
- production roots and descendants
- production reactions
- component library nodes and reactions
- unrelated page-level content

Do not repair unrelated defects.

FLOW DISCOVERY

Before building:
- inspect source production screens
- inspect existing runtime screens
- inspect relevant component sets with get_local_components
- inspect existing reactions
- identify explicit destinations that already exist in production/runtime

Do not infer a destination from button copy alone.
Do not invent authentication, checkout, confirmation, settings, modal, or other product screens unless explicitly requested.

SCREEN CREATION

Prefer cloning an existing production screen into `Figma Designer — Interactive App` rather than rebuilding it.

Rules:
- production remains untouched
- runtime screens remain editable native FRAMEs
- preserve production visual fidelity
- keep runtime screen names stable and descriptive
- avoid full-screen copies solely for hover/press/focus states; those belong to component variants

Suggested naming:

`App / <Journey> / 01 — <Screen Name>`
`App / <Journey> / 02 — <Screen Name>`

Existing `Flow / ...` names from V1 may be preserved during migration; renaming them is optional and must not cause unnecessary churn.

If a requested destination does not exist:
- create a runtime-only destination only when the user explicitly requests that missing screen and supplies enough semantics/content to do so safely
- otherwise leave the action unwired and report the missing destination

COMPONENT INSTANCE INTEGRATION

For the specific journey controls, use an existing matching COMPONENT_SET when safe.

When instantiating:
1. identify intended family and base variant
2. instantiate
3. immediately resolve the created instance's real source component ID
4. resolve its `componentSetId`
5. continue only if it matches the intended family

Never trust `instantiate_by_name` alone when multiple children are named `State=Default`.

Preserve control:
- label
- dimensions
- alignment
- visual appearance
- Auto Layout child order

Do not use `move_to_anchor` as a reliable Auto Layout reorder operation. Use a true reorder/reparent/rebuild method and verify geometry afterward.

SCREEN NAVIGATION

Before adding a reaction:
- get_reactions on the source runtime node
- verify the destination runtime screen exists
- avoid duplicates
- preserve unrelated reactions

For screen navigation:
- trigger should match intended behavior, commonly ON_CLICK
- action: NODE
- navigation: NAVIGATE
- destination: runtime screen FRAME, never production
- transition: DISSOLVE 0.15s EASE_OUT unless the user explicitly requires a justified spatial transition

CHANGE_TO is reserved for compatible variants inside one COMPONENT_SET.

Do not add external URL/BACK/CLOSE actions unless explicitly justified.

PARTIAL-WRITE RECOVERY

A timeout is indeterminate.

After a timeout:
1. re-read the runtime SECTION
2. wait for counts/state to stabilize if work may still be in flight
3. determine what actually succeeded
4. preserve valid work
5. retry only missing operations
6. remove only same-run broken duplicates inside the runtime SECTION

Never blindly clone a screen or append a reaction again after a timeout.

LAYOUT

Organize runtime screens readably inside the SECTION.
Keep runtime screens from overlapping each other, production, or the component library.
Keep screen FRAMEs fully inside the SECTION bounds.
Compare bounds in matching coordinate systems.

VALIDATION

After writes verify:
- exactly one canonical `Figma Designer — Interactive App` SECTION exists
- every intended runtime screen exists as a native FRAME
- all intended destinations exist
- all navigation targets runtime screens, not production
- all instances used by this journey resolve to expected component families
- no duplicate equivalent reactions exist
- component library is unchanged
- production fingerprints are unchanged
- unrelated page-level fingerprints are unchanged
- no screen overflow/overlap was introduced

FINAL REPORT

Report:
- runtime SECTION ID/type/name
- migration performed, if any
- journey name
- production source/destination roots
- runtime screen IDs/names
- instances integrated with resolved source component/component-set IDs
- reactions added/reused
- intentionally unwired controls and why
- recovery actions
- geometry checks
- protected-root fingerprints before/after

End with exactly one:

FIGMA_PRODUCTION_GUARD: PASS
FIGMA_PRODUCTION_GUARD: FAIL

PASS requires that all writes stayed inside the canonical runtime ownership zone (except the safe legacy SECTION rename) and every protected subtree remained unchanged.

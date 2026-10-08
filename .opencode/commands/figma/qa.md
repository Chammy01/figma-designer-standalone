---
description: Run strictly read-only working-interface QA on the Figma document
agent: figma-designer
subagent: false
---

FIGMA WORKING INTERFACE QA — STANDALONE V1.2

This is a STRICTLY READ-ONLY validation pass.

Run health_check first.
Follow AGENTS.md, the figma-designer agent instructions, `rules/figma-standalone-rules.md`, and any project design rules.

Do not modify Figma in any way.
Do not create, delete, rename, move, resize, restyle, reparent, reorder, clone, instantiate, detach, patch, convert, clean up, or repair any node.
Do not add, replace, append, remove, or normalize reactions.

USER SCOPE / TARGET

$ARGUMENTS

Treat the user input above as the requested QA scope. Resolve all nodes from the live document.

GOAL

Determine whether the current Figma runtime behaves as a coherent WORKING INTERFACE within Figma's actual capabilities, not merely whether one navigation path is clickable.

Canonical architecture:

production screens (read-only source)
-> `Figma Designer — Component States` (native COMPONENT_SET library)
-> `Figma Designer — Interactive App` SECTION (working runtime)

LEGACY NAME

`Figma Designer — Prototype Flows` is legacy V1.

Classification:
- canonical Interactive App only: normal
- legacy Prototype Flows only: WARN; interface migration has not completed
- both legacy and canonical runtime containers: FAIL for ambiguous ownership unless the user explicitly scoped a migration investigation

RESULT LEVELS

The FIRST non-empty line must be exactly one of:

FIGMA_INTERFACE_QA: PASS
FIGMA_INTERFACE_QA: WARN
FIGMA_INTERFACE_QA: FAIL

PASS: no blocking structural, interaction, coverage, destination, geometry, duplicate, or production-integrity defect.
WARN: runtime is structurally valid, but one or more meaningful behaviors are genuinely Figma-limited or materially undefined by the source/user request.
FAIL: implementable intended controls are broken/decorative, architecture is ambiguous, destinations are invalid, component mapping is wrong, production changed, or runtime behavior is misleading.

A. READ-ONLY FINGERPRINT

At QA start record a lightweight fingerprint of every direct page-level subtree:
- ID
- name
- type
- bounds
- direct child order
- descendant count
- reactions/style summary where practical

At QA end inspect again.
ANY mutation during QA is FAIL.

B. PAGE ARCHITECTURE

Identify:
- production roots
- exactly one `Figma Designer — Component States` FRAME when the system uses component states
- exactly one `Figma Designer — Interactive App` SECTION
- legacy runtime container if any
- unrelated page-level roots

Verify:
- production roots are not descendants of system artifacts
- component sources are not reparented into runtime screens
- runtime screen FRAMEs remain inside the Interactive App SECTION
- instances may reference component library sources
- no duplicate canonical runtime SECTION
- no stray diagnostic/probe/wrapper artifacts at page level

C. PRODUCTION INTEGRITY

Production must remain the accepted source design.

Check as practical:
- root IDs
- node counts
- hierarchy
- bounds
- names
- text content
- fills/strokes/radii/typography
- child order
- production reactions

Production runtime behavior must not have been added merely to make the interactive copy work unless the user explicitly requested production reactions.

D. COMPONENT LIBRARY INTEGRITY

Inventory every COMPONENT_SET and COMPONENT.

Verify:
- native COMPONENT_SET types
- expected component children remain COMPONENTs
- each variant reports expected variantProperties
- registry `componentSetId` matches the real parent family
- no orphan/loose components that should belong to a family
- no duplicate family names or duplicate State values in one family
- no accidental source-component movement into the runtime SECTION

Inspect all component reactions and report them.

E. RUNTIME SCREEN INVENTORY

Enumerate every meaningful screen FRAME in `Figma Designer — Interactive App`.

For each screen report:
- ID
- name
- bounds
- production source if identifiable
- direct runtime role/journey
- navigation participation

Check:
- duplicate screen names/sequence ambiguity
- unexpected duplicate full-screen clones
- screen overlap
- overflow outside SECTION
- empty/broken screens
- orphan screens

F. INTERACTION INVENTORY — REQUIRED

Do not validate only nodes that already have reactions.

Inspect each runtime screen for likely meaningful controls, including:
- buttons
- links/navigation
- inputs/search
- filters/selects/dropdowns
- tabs
- toggles
- checkboxes/radios
- clear clickable cards/rows
- back/close
- modal/menu triggers
- pagination/segmented controls
- all existing INSTANCE nodes
- all nodes with reactions

For every meaningful control determine:
- runtime node ID
- label/role
- node type
- source production counterpart if identifiable
- matching component family if any
- resolved source component/componentSetId when an INSTANCE
- reactions/state behavior
- real destination/overlay if any

Classify each as:

WORKING_ACTION
WORKING_STATE
FIGMA_LIMITED
INTENTIONALLY_INERT
BROKEN

BROKEN conditions include:
- matching component family exists but obvious interactive runtime control remains a decorative clone without justification
- real destination exists but intended navigation is missing
- wrong component family instance
- interaction destination is invalid
- state behavior is semantically wrong
- intended control is visually interactive but silently does nothing despite implementable behavior

G. INSTANCE INTEGRITY

For every runtime INSTANCE used as an interactive control:
- resolve the actual source component ID
- resolve source component `componentSetId`
- verify expected family by registry, not name alone
- verify instance is not detached when inherited interaction behavior is required
- verify text/visibility overrides preserve semantics
- compare runtime geometry/ordering with the source layout

Do not trust `State=Default` name matching alone.

H. REACTION GRAPH

Inspect all reactions in:
- all component variants
- every runtime screen descendant
- overlays/helpers that participate in the runtime

For every reaction record:
- source node ID
- trigger
- action type/navigation
- destination
- transition type/duration/easing

Validate:
- destinations exist
- CHANGE_TO remains within one compatible COMPONENT_SET
- NAVIGATE targets runtime screen FRAMEs, not production
- no duplicate equivalent reactions
- no broken loops that prevent intended progress
- BACK/CLOSE/OVERLAY/URL/SCROLL_TO/SWAP actions are semantically plausible when present
- no invented external URL without user/source support

I. MOTION CONTRACT

Component CHANGE_TO:
- SMART_ANIMATE
- 0.10s EASE_OUT
- float tolerance 0.095–0.105

Ordinary screen NAVIGATE:
- DISSOLVE
- 0.15s EASE_OUT
- float tolerance 0.145–0.155

Directional transitions:
- explicit-only
- valid direction required
- expected default 0.20s EASE_OUT when authored by this system

Do not claim Figma dynamically follows OS reduced-motion preferences. The Figma-side policy is conservative authoring-time motion.

J. WORKING-INTERFACE COVERAGE

Produce totals for:
- meaningful controls
- WORKING_ACTION
- WORKING_STATE
- FIGMA_LIMITED
- INTENTIONALLY_INERT
- BROKEN

PASS requires BROKEN = 0.

A control may be INTENTIONALLY_INERT only when no behavior/destination/options/data are actually defined.
A control may be FIGMA_LIMITED only when the missing real behavior cannot be faithfully implemented with the available Figma/MCP runtime.

Examples:
- free-form search typing may be FIGMA_LIMITED if the runtime cannot accept arbitrary text
- a nav link with no destination screen may be INTENTIONALLY_INERT but should still be WORKING_STATE if a hover/focus component family can truthfully provide state feedback
- a primary CTA with a real destination that remains unwired is BROKEN

K. OVERLAYS / VARIABLES / STATEFUL BEHAVIOR

When overlays or variables are present:
- verify destinations/collections/values exist
- verify open/close/selection behavior is coherent
- verify state does not point into production
- verify no invented values are masquerading as source data

If the connected runtime does not expose variable inspection, report that limitation rather than claiming verified persistence.

L. REACHABILITY

From each apparent start screen, traverse navigation edges including reactions on descendant controls.

Report:
- reachable screens
- unreachable screens
- orphan screens
- dead-end screens
- broken destinations

Do not repeat the old bug of checking only screen-level reactions; reactions frequently live on descendant INSTANCE controls.

M. INTENTIONALLY UNDEFINED / FIGMA-LIMITED CONTROLS

List every non-working action explicitly with reason.

Do not treat truthful limitations as hidden success.
Do not treat missing invented functionality as a defect.

N. GEOMETRY / ORDER / DUPLICATES

Check:
- runtime screens fully inside SECTION
- no full-screen overlap
- no component-library overflow that indicates broken layout
- no zero-size/broken text/control nodes
- no duplicate runtime sections
- no duplicate screens
- no duplicate component sets/variants
- no duplicate control instances caused by retries
- no empty wrappers from partial writes
- Auto Layout child order matches intended source order

Compare bounds in matching coordinate spaces.

O. FINAL READ-ONLY GUARANTEE

Re-read page-level fingerprints.
Confirm zero writes occurred during QA.
Any mutation is FAIL.

FINAL REPORT

After the first-line result marker, report concisely:
- page architecture
- production integrity
- component library counts/integrity
- runtime SECTION ID/type
- runtime screens
- meaningful-control count
- WORKING_ACTION controls
- WORKING_STATE controls
- FIGMA_LIMITED controls and exact limitation
- INTENTIONALLY_INERT controls and reason
- BROKEN controls
- complete reaction/motion summary
- reachability/orphans
- overlays/variables if present
- geometry/order/duplicate checks
- zero-write confirmation
- page fingerprints unchanged confirmation

Never emit PASS when BROKEN > 0 or when runtime ownership/production integrity is ambiguous.

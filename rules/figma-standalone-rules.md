# Figma Designer Standalone Rules

## Purpose

These rules define the project-wide quality, interaction, and safety contract for the standalone Figma Designer system.

## Natural-language intent routing

After a Figma task, ordinary conversation uses the existing primary `figma-designer`
agent. Specialist commands remain canonical, independent manual/debug/test entry
points. No `/figma/route`, `/figma/intent`, `/figma/auto`, `/figma/continue` or aliases.
The OpenCode prompt hook selects by requested outcome and conversation context,
not keywords alone, then expands one existing command's full instructions, or the
internal Prototype Planner with its eligible canonical contracts. This is
contract reuse, not a claim that a slash command was programmatically executed.

Before acting: determine current task context, inspect live evidence as needed,
classify outcome, determine ownership, select the narrowest workflow, verify live
targets/artifacts, clarify only material ambiguity and apply the full chosen contract.
An unverified prerequisite alone does not change a clear capability family. A bounded
request to make tabs/filters work selects interactive; that workflow inspects and
clarifies missing behavior before authoring rather than inventing it.
Keep a compact internal INTENT, TARGET, OWNERSHIP, PREREQUISITES and AMBIGUITY record.
No verbose reasoning dump; a short scope/status line suffices.

| Intent | Canonical workflow | Ownership / prerequisites |
| --- | --- | --- |
| PRODUCTION_REVISION | `/figma/revise` | Requested production subtree only; preserve unrelated screens/IDs. |
| DESIGN_CRITIQUE | `/figma/critique` | Strictly read-only; existing persistent guard active, approved read aliases, no Code Mode; recommendations only. |
| COMPONENT_STATE_AUTHORING | `/figma/states` | Production read-only; canonical component-state library writes only. |
| FLOW_WIRING | `/figma/flow` | Identifiable source and existing explicit destination; runtime writes only, production/library read-only. |
| WORKING_INTERACTION | `/figma/interactive` | Defined working controls beyond one edge; production read-only, runtime and narrowly justified existing state-reaction updates only. |
| MOTION | `/figma/motion` | Eligible transition objects on existing reactions only; no node/trigger/destination/interaction architecture changes. |
| QA | `/figma/qa` | Correctly built/wired? Strictly read-only; not an aesthetic review. |
| BROWSER_GENERATION | `/figma/browser` | Figma read-only; only `.figma-designer/browser-prototype/` output, validated source prerequisites. |
| BROWSER_TEST | `/figma/browser-test` | Existing browser artifacts; no generation unless separately requested; report missing artifacts. |
| PROTOTYPE_PLANNER | Internal orchestration, no slash command | Explicit broad interactive outcome requiring multiple existing families; `rules/figma-prototype-planner.md` orders only necessary states/runtime/flow/motion phases, then read-only QA. Production remains read-only. |

"Make the button pop more" normally means production emphasis, not animation.
"Make the button animate when hovered" uses states first if the hover state/reaction
is missing; report motion as later work, never silently run a multi-command campaign.
Motion with no eligible reactions reports the state/interaction prerequisite.
Flows with missing destinations report them; never invent screens or product logic.
Working interactions retain WORKING_ACTION / WORKING_STATE / FIGMA_LIMITED /
INTENTIONALLY_INERT classification, source component/set verification and truthful limits.

Retain current target/root, recent production scope/screens, relevant state/runtime
artifacts, unresolved limitations and user terminology. "This/it" can use recent
unambiguous context without asking which document, but re-inspect IDs from the live
file. Missing/stale targets require reinspection, not guessed replacements.
"Fix this" may use a recent explicit issue and target. Otherwise clarify what changes.
"Check the buttons" asks visual quality versus interaction correctness when context
does not decide. "Make it better" asks visual, interaction or both; no broad writes.
Ask that focused question in ordinary chat and end the turn, without a blocking
question tool/form. A plain reply starts a new routed request; this is essential
when the answer selects critique, whose guard must activate before its tools run.
"Make it work" may use the planner when context establishes an existing prototype
and intended behavior; otherwise clarify missing semantics rather than inventing them.
"What did you change?", "Why this layout/component?" and capability questions explain
without authoring. "What would you improve visually?" is read-only critique/advice.

Keep adaptive briefing separate: pending answers continue the original design task,
with all answers/history/budgets preserved. A completed design's local revision does
not restart briefing. A genuinely new vague screen may enter design and adaptive briefing.

Select one narrow workflow unless a broad prototype outcome clearly needs multiple
families. "Make this app interactive", "Wire up this onboarding flow" and explicit
states/navigation/motion requests may use PROTOTYPE_PLANNER; inspect required behavior
and ask only material clarifications before writing. Known prerequisite order needs
no interview. No new `/figma/prototype`, `/figma/plan`, `/figma/make-interactive` or
other aliases. Follow `rules/figma-prototype-planner.md`; do not invent product logic,
merge specialist write permissions or add browser/future runtime capabilities.
Ownership always overrides
routing convenience; one sentence does not merge writable zones.

"Review it and fix the problems" starts read-only critique and presents findings.
Do not execute recommendations or start authoring while the critique guard is active.
Carry explicit bounded revision authorization forward for a separate request after
critique is fully idle; ask only for genuinely missing scope, not repeated permission.
Steering/queued messages cannot unlock the guarded turn. Never reset/bypass its lifetime.
Provider schemas, approved read aliases, execution/permission enforcement and persistent
guard storage stay intact. Provider/route-parse failures stop read-only with BLOCKED,
not an assumed authoring route. Specialist timeout reconciliation, duplicate protection,
reaction semantics, source verification and output truthfulness remain authoritative.

## Architecture

Product, browser, and external developer harness architectures are strictly distinct:
- **Product Architecture**: App → OpenCode → workflows (`.opencode/agents/figma-designer.md` as sole primary agent) → local Figma MCP executable → localhost WebSocket bridge → Figma Desktop development plugin → editable native layers in the design document. All sessions run under an explicit workspace-wide finite capability profile (`rules/browser-workspace-capabilities.mjs`): exact approved 108 Figma MCP operations, safe reads (`read`, `glob`, `grep`, `question`, critique reads), finite file tools (`write`, `edit`, `patch`) restricted to active Build sessions targeting `.figma-designer/browser-prototype/`, and fixed workflow tools (`figma_browser_test_report`, `figma_qa_report`, `figma_browser_build_begin`, `figma_browser_build_finish`). Generic shell, Code Mode `execute`, Node, PowerShell, delegation, and formatters are denied across all workspace sessions. Mutating callbacks hold atomic shared Build-write leases through `finally`. Formatter execution is disabled at highest priority (`OPENCODE_CONFIG_CONTENT` with `formatter: false`); unmanaged engines fail closed on the Build-write precondition.
- **Browser Architecture**: Browser generation and regression testing use local Node and Playwright, completely isolated from Figma write operations. Source capture and binding use fixed tools `figma_browser_build_begin` and `figma_browser_build_finish`. Source snapshot `figma-source.json` is strictly collector-owned and never model-authored. Application `BROWSER_TEST` runs `scripts/browser-test-canonical.mjs` directly (bypassing model execution and preserving `workspaceSessionId`). OpenCode natural Test allows only safe reads and the fixed once-per-turn `figma_browser_test_report` tool.
- **Developer Harness Architecture**: OMP is the current external developer harness. Native Orca is obsolete; do not search for, install, invoke, or require it. An absent executable is expected and not a blocker.
## Canonical page-level ownership

For new standalone documents:

- Production screen/root frames: product-owned, normal page-level content.
- `Figma Designer — Component States`: system-owned page-level FRAME.
- `Figma Designer — Interactive App`: system-owned page-level SECTION containing the working Figma runtime screens and runtime-only overlays/helpers when needed.

Never nest production roots inside either system artifact.

`Figma Designer — Prototype Flows` is the legacy V1 runtime name. `/figma/interactive` may migrate one unambiguous legacy container to `Figma Designer — Interactive App` without rebuilding valid screens.

## Production isolation

State generation must not modify production.
Flow generation must not modify production or the component library.
Interactive-interface generation must not modify production.
Motion must not alter production and may change only eligible transition objects on existing reactions.
QA must make zero Figma writes.
Critique must make zero Figma writes, including production, components, reactions, and motion. Recommendations are report text only.
Browser generation must make zero Figma writes.

## Working-interface standard

A finished Figma runtime is more than a clickable path.

Every meaningful visible control in `Figma Designer — Interactive App` must be classified and reported as one of:

- `WORKING_ACTION`: executes a real supported action.
- `WORKING_STATE`: has truthful hover/press/focus/selected/toggle/etc. behavior.
- `FIGMA_LIMITED`: strongest truthful simulation is present, but Figma cannot fully represent the real app behavior.
- `INTENTIONALLY_INERT`: behavior/destination/options/data are genuinely undefined and are not invented.

If a matching native component family exists and truthful behavior is possible, leaving the control as a decorative non-instance is a defect.

Do not invent destinations, data, option lists, search results, validation content, modal content, authentication states, or business logic merely to make more things clickable.

## Native interaction model

Use native COMPONENT_SET variants when compatible states exist.
Use variant property `State` unless the source design provides a stronger semantic property.

For standard buttons, conservative defaults are:

- Default: ON_HOVER -> Hover via CHANGE_TO
- Hover: ON_PRESS -> Pressed via CHANGE_TO
- Pressed: no automatic reverse reaction by default
- Disabled: no reactions

For text/navigation links:

- Default ON_HOVER -> Hover is allowed.
- Add navigation only when a real destination exists.
- Focus/Active behavior should be created only when the component family and intended runtime semantics support it.

For inputs/selects/toggles/tabs:

- implement truthful visual state behavior when the intended state transition is clear
- use overlays/variables only when supported by the current tool/runtime and backed by real source semantics
- never pretend an input accepts unrestricted text if the Figma runtime implementation does not actually do so

## Instance validation

`instantiate_by_name` can resolve the wrong component when many variants share a child name such as `State=Default`.

After every name-based instantiation:

1. resolve the instance's actual source component ID
2. resolve that component's `componentSetId`
3. compare it with the intended family
4. continue only when it matches

Do not trust instance/component names alone.

Do not use `clone_node` on a COMPONENT as an instance workflow: the tested API may return another COMPONENT. Use the verified instance workflow.

Runtime componentization must preserve accepted production appearance: fills, strokes, font size/weight, padding, radius, label placement, Auto Layout order, and state appearance as well as outer geometry. If a legal per-instance override is unavailable, report the fidelity limitation; do not detach the instance or claim exact fidelity.

## Semantic motion

Use the authoritative token registry in rules/figma-motion-semantics.mjs and the
interpretation rules in rules/figma-motion-semantics.md. STATE/FEEDBACK use STATE_FAST;
ordinary navigation uses NAV_DEFAULT; justified spatial navigation uses NAV_SPATIAL;
existing overlays use OVERLAY_DEFAULT. Values/tolerances are centralized there.
SCROLL_NATIVE preserves existing SCROLL_TO, including null/current transition.
Only explicitly requested animated scrolling selects SCROLL_SMOOTH, after verifying
an existing owned child target and prepared native scroll context. Missing context
is FIGMA_LIMITED: SCROLL_CONTEXT_PREPARATION; no preparation/write workaround. Motion
audit is read-only without explicit change authorization. Limited enter/exit/shared
element intents never authorize new architecture. Planner passes semantic intent;
single motion requests stay in motion and retain the transition-only write contract.

## Authoring constraints

- Prefer editable native layers and Auto Layout.
- Use explicit text widths when wrapping matters.
- Use stacked text nodes instead of relying on `<br>` for structure.
- Use real padded containers for buttons.
- Use padding/itemSpacing rather than unsupported margin behavior.
- Verify important fills/strokes after generation.
- If a requested font weight is unavailable, use a verified loaded weight and report it.
- Inside Auto Layout, use child order rather than manual XY placement.
- `move_to_anchor` is not a reliable Auto Layout reorder operation. Use a real reorder/reparent/rebuild method.
- Compare geometry in consistent coordinate spaces; parent-relative child bounds must not be compared directly with page-absolute root bounds.

## Partial-write recovery

If a write or conversion times out, the outcome is indeterminate rather than failed.

When a compatible runtime returns an operationId, inspect get_operation_receipt
before considering another mutation. COMMITTED preserves the existing result;
IN_PROGRESS, UNKNOWN or an uncertain failure never proves retry safe. Reusing a
retained committed ID is only valid for the identical request; do not generate a
new ID to discover whether an uncertain write happened. Optional preconditions and
get_document_revision can guard known targets. Receipts are bounded and document
identity may be session-scoped; reconcile actual nodes when evidence is incomplete.
No operation envelope bypasses critique/QA read-only guards or ownership rules.

1. inspect the live document
2. wait for node counts/state to stabilize when the job may still be in flight
3. determine exactly what succeeded
4. preserve valid completed work
5. continue only the missing step
6. do not duplicate completed screens, states, sets, instances, overlays, or reactions
7. remove only same-run broken leftovers inside the command's writable ownership zone

## Browser interface

Output only to `.figma-designer/browser-prototype/`.
Required files:

- `index.html`
- `styles.css`
- `app.js`
- `figma-browser.json`
- `figma-source.json` (collector-owned; captured via `figma_browser_build_begin` and finalized via `figma_browser_build_finish`, never model-authored)

Browser Build uses fixed no-argument source tools (`figma_browser_build_begin`, `figma_browser_build_finish`) and finite `write`, `edit`, and `patch` tools scoped strictly to `.figma-designer/browser-prototype/`. All mutating callbacks hold atomic shared Build-write leases through `finally`. Generic shell, Node, PowerShell, Code Mode, and formatters are denied.

Browser Test observes only; it never repairs, regenerates, or formats inputs. The app invokes the canonical runner directly via `scripts/browser-test-canonical.mjs`. In OpenCode, Test uses the fixed no-argument `figma_browser_test_report` tool at most once per turn.

Use stable `data-figma-*` hooks for automated testing.
No remote scripts, CDNs, remote fonts, analytics, fetch/XHR dependencies, or dynamically loaded code.
Use hash routing for static screen navigation.
Support `prefers-reduced-motion` in the browser implementation.
Map native Figma navigation to semantic anchors when practical so keyboard Enter works without synthetic click emulation.
## Visual quality

Derive styling from the user's brief and the live Figma source. Avoid generic AI-looking patterns, unnecessary gradients, excessive pills, random decoration, fake dashboards, and gratuitous glassmorphism unless explicitly requested.

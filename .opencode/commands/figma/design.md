---
description: Create an intentional native Figma design through planning, inspection and focused polish
agent: figma-designer
subagent: false
---

FIGMA DESIGN TASK — GENERATION V2 / V1.2.3

Run health_check first and inspect the current document before writing.
Read the figma-designer agent, `rules/figma-standalone-rules.md`, and
`rules/figma-design-rules.md`. Apply its Design V2 passes in order.

USER REQUEST

$ARGUMENTS

GOAL

Create or extend production design only. Do not create `Figma Designer — Component States` or `Figma Designer — Interactive App` during this command unless the user explicitly asks for those system artifacts.

DESIGN V2 WORKFLOW

Before any authoring write, complete passes 1–6: interpret product/purpose/content/
audience/style/priorities/constraints; plan information architecture; derive art
direction from the brief; map compositions and section rhythm; establish typography;
and establish color/surface/spacing roles. Keep a compact decision record, not a
long reasoning dump. A short user update should state the intended direction and scope.

Pass 7 builds native editable structure section-by-section and establishes justified
reuse. Pass 8 checks anti-generic patterns against the brief. Pass 9 re-reads stable
generated roots and records evidence-based issues. Pass 10 permits at most one
focused polish pass, then final verification. Skipping polish is valid when no
supported issue exists. Necessary partial-write/layout recovery is not an excuse
to repeat aesthetic redesign; unresolved quality issues go in the report.

Apply V1.2.2 critique principles internally, not the critique command. Do not invoke
/figma/critique automatically during generation: its persistent read-only guard
would block the later authoring pass. Never disable, reset, alter or bypass that
guard. If a prior critique is still running/queued, finish it and use a new design
request after idle. Suggest critique only after generation has completed.

The user brief overrides default aesthetic preferences. Do not replace warm,
colorful, handcrafted, editorial, retro, playful, dense or utilitarian requests with
generic modern/minimal SaaS. Preserve valid unconventional choices during inspection.
No new MCP capability is required; use existing authoring and read tools.

RULES

- Treat the currently open Figma document as the only source of truth.
- On a blank page, create the requested production screen/frame hierarchy from scratch.
- On an existing page, inspect before editing and limit writes to the requested production scope.
- Build with native editable Figma layers and Auto Layout where practical.
- Prefer section-by-section construction and inspect important sections after writing.
- Preserve IDs of existing production roots whenever practical.
- Record page/root IDs and child order before writing. Extend/reuse the requested root; do not accidentally create a second production root. For a genuinely new screen, place one intentional root separately and report it.
- For local revisions, patch/focus changes instead of rebuilding entire screens.
- Do not create fake components/variants just to simulate interactivity.
- Do not add production reactions unless the user explicitly requested production behavior in this design command.
- Use explicit text widths where needed; do not rely on `<br>` for structured multiline layouts.
- Buttons must be real padded containers/frames with direct text children, not text pretending to be a button.
- Use itemSpacing/padding rather than relying on unsupported margin semantics.
- If a font/weight is unavailable, use the nearest verified loaded weight and report the substitution.
- Verify actual main/source COMPONENT IDs and componentSetId after instantiation; instantiate_by_name is ambiguous. clone_node on a COMPONENT may create another COMPONENT, not an INSTANCE. Inspect the actual type and preserve ordering/appearance. No new state architecture or reactions are implied by static reuse.
- If a bridge write times out, treat the result as indeterminate: re-read the live document, wait for node counts/state to stabilize, and continue only missing work. Never rerun the whole screen blindly.
- `move_to_anchor` is not a reliable Auto Layout reorder operation; use a true reorder/reparent/rebuild method when order matters.
- Compare geometry in matching coordinate systems; child bounds may be parent-relative while roots are page-absolute.
- Do not repair unrelated page content.

VALIDATION

After writing:
1. inspect every created/changed production root
2. verify child order, bounds, text overflow, obvious overlap, and screen separation
3. confirm no system component/runtime container was created unintentionally
4. audit brief fidelity: no unrequested signup/features; repeated functional controls
   have verified reuse or a concrete reason to remain independent, not a deferred pass
5. report production screen/root IDs and any partial-write recovery

Report concisely using DESIGN GENERATION V2, Created, Art direction, Sections/screens,
Polish (applied with affected IDs/evidence, or skipped and why), Limitations/substitutions,
Production root IDs, and Next (/figma/critique, /figma/revise as later requests).
Do not dump internal reasoning or claim rendered/responsive testing without evidence.
Retain FIGMA_DESIGN: PASS for compatibility and end with FIGMA_DESIGN_V2: PASS only
after final verification confirms native/editable structure, requested content/order,
no duplicate roots, no incomplete writes, and preserved unrelated work. If reliable
completion is blocked, emit both FAIL markers with the concrete remaining issue.

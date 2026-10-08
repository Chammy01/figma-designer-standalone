---
description: Create a new production Figma design from a natural-language brief
agent: figma-designer
subagent: false
---

FIGMA DESIGN TASK — STANDALONE V1.2

Run health_check first and inspect the current document before writing.
Follow the figma-designer agent instructions and `rules/figma-standalone-rules.md`.

USER REQUEST

$ARGUMENTS

GOAL

Create or extend production design only. Do not create `Figma Designer — Component States` or `Figma Designer — Interactive App` during this command unless the user explicitly asks for those system artifacts.

RULES

- Treat the currently open Figma document as the only source of truth.
- On a blank page, create the requested production screen/frame hierarchy from scratch.
- On an existing page, inspect before editing and limit writes to the requested production scope.
- Build with native editable Figma layers and Auto Layout where practical.
- Prefer section-by-section construction and inspect important sections after writing.
- Preserve IDs of existing production roots whenever practical.
- For local revisions, patch/focus changes instead of rebuilding entire screens.
- Do not create fake components/variants just to simulate interactivity.
- Do not add production reactions unless the user explicitly requested production behavior in this design command.
- Use explicit text widths where needed; do not rely on `<br>` for structured multiline layouts.
- Buttons must be real padded containers/frames with direct text children, not text pretending to be a button.
- Use itemSpacing/padding rather than relying on unsupported margin semantics.
- If a font/weight is unavailable, use the nearest verified loaded weight and report the substitution.
- If a bridge write times out, treat the result as indeterminate: re-read the live document, wait for node counts/state to stabilize, and continue only missing work. Never rerun the whole screen blindly.
- `move_to_anchor` is not a reliable Auto Layout reorder operation; use a true reorder/reparent/rebuild method when order matters.
- Compare geometry in matching coordinate systems; child bounds may be parent-relative while roots are page-absolute.
- Do not repair unrelated page content.

VALIDATION

After writing:
1. inspect every created/changed production root
2. verify child order, bounds, text overflow, obvious overlap, and screen separation
3. confirm no system component/runtime container was created unintentionally
4. report production screen/root IDs and any partial-write recovery

End with:

FIGMA_DESIGN: PASS

Use FAIL instead only if the requested production design could not be completed safely.

---
description: Revise an existing production Figma design with minimal scoped edits
agent: figma-designer
subagent: false
---

FIGMA REVISION TASK — STANDALONE V1.2

Run health_check first.
Follow the figma-designer agent instructions and `rules/figma-standalone-rules.md`.

USER REQUEST

$ARGUMENTS

Before editing:
- inspect the relevant existing Figma nodes
- identify the smallest affected subtree
- inspect ancestors when layout constraints matter

Preserve existing production root and section IDs whenever practical.
Prefer patch_html or focused property updates for existing content.
Do not rebuild the whole page for a local revision.
Do not modify `Figma Designer — Component States`, `Figma Designer — Interactive App`, or legacy `Figma Designer — Prototype Flows` unless the user explicitly asks to revise those system artifacts.
Do not repair unrelated defects.

If a write times out, inspect the actual document and wait for state to stabilize before retrying.
Do not use `move_to_anchor` as proof of Auto Layout reordering.

After editing:
- re-inspect affected nodes
- verify layout and text overflow
- verify section/screen order when insertions occurred
- report any root IDs that were replaced

End with exactly one marker:
FIGMA_REVISION: PASS
FIGMA_REVISION: FAIL

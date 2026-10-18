# Handoff

## Project

`figma-designer-standalone`

## Current Objective

Make the already-verified shared AI-memory workflow durable in Git, then implement automated checkpoint/resume behavior.

## Verified Working

### Global Memory

Located at:

`E:\AI-Memory`

All required global memory files are present and readable.

### Project Memory

Located at:

`./ai-memory/`

All six project-memory files are present and readable.

### Codex

Verified to:

- load applicable `AGENTS.md`
- read global memory
- read project memory
- inspect Git state
- recognize project-specific Figma reliability rules

### OpenCode

Verified to:

- load project instructions
- read global memory
- read project memory
- inspect Git state
- access Graphify
- recognize project-specific Figma reliability rules

### Graphify

Verified:

- version `0.9.92`
- 2,394-node code graph
- `graphify query` works
- `GRAPH_REPORT.md` exists
- Codex integration installed
- OpenCode integration installed
- Git hooks installed
- merge driver registered

### Obsidian

Verified:

- main vault at `E:\AI-Memory`
- project entry created
- live project memory exposed through junction
- Graphify Obsidian export generated

## Important Current Gap

`ai-memory/` is currently untracked by Git.

The memory works locally, but a fresh clone would not inherit it.

Recommended next step:

Track the six project-memory files in Git before implementing automation.

## Working Tree Warning

The tracked binary file:

`design-references/1.5-agent-studio/bedroom-base.jpg`

is modified and not explained by current memory.

Do not revert, overwrite, or include it in a setup commit until its intent is confirmed.

## Current Development Context

Observed repository history indicates active Agent Studio design/release work rather than memory-foundation implementation.

Recent themes include:

- Agent Studio composition and status ownership
- application asset-root handling
- presence-only update behavior
- v1.2.1 beta release work

## Recovery Procedure

If taking over after another harness stopped unexpectedly:

1. Read all global and project memory.
2. Inspect `git status`.
3. Inspect `git diff`.
4. Identify changes newer than the last memory checkpoint.
5. Validate unfinished work before editing it.
6. Query Graphify for affected systems when useful.
7. Update `CURRENT_TASK.md` and this file after reconstructing the actual state.

## Next Recommended Action

Stage only:

`ai-memory/`

Then review the staged diff before committing.

Do not include the modified JPG or unrelated working-tree changes in that commit.

## Handoff Quality Rule

Update this file after meaningful progress rather than only at a clean session ending.

The handoff should remain useful after a sudden usage-limit cutoff or harness failure.

# Current Task

## Project

`figma-designer-standalone`

## Active Objective

Make the shared AI-memory workflow durable and automate checkpoint/resume behavior now that Codex, OpenCode, Graphify, and Obsidian are connected and verified.

## Current Status

Checkpoint saved and cross-harness continuation verified. The Codex → OpenCode recovery test passed on 2026-10-18. Abrupt/interrupted-session recovery remains untested.

## Completed

- Global AI memory established at `E:\AI-Memory`
- Project-local `ai-memory/` created
- Codex reads global and project memory
- OpenCode reads global and project memory
- Graphify `0.9.92` installed
- Graphify code graph built and queried successfully
- Graphify architecture report generated
- Graphify Codex integration installed
- Graphify OpenCode integration installed
- Graphify Git hooks installed
- Graphify merge driver registered
- Obsidian vault created at `E:\AI-Memory`
- Project memory exposed live inside Obsidian
- Graphify exported into Obsidian
- Codex read-only startup verification passed
- OpenCode read-only startup verification passed
- Codex → OpenCode cross-harness recovery test passed 2026-10-18; see `HANDOFF.md` for the reconstructed evidence set

## Current Priority

Preserve continuity with the installed `ai checkpoint` / `ai resume` workflow. All six memory files are tracked in commit `aedddf46ef884effa88ae4957376a18fe1054132`. Do not implement a duplicate CLI.

Cross-harness continuation is now verified. The remaining recovery gap is abrupt/interrupted-session recovery, which is a different scenario.

## Important Working Tree Constraint

Do not alter or revert:

`design-references/1.5-agent-studio/bedroom-base.jpg`

The file is modified but its intent has not yet been established.

## Next Actions

1. Read this checkpoint and `HANDOFF.md` before continuing product work.
2. Test abrupt/interrupted-session recovery separately. The Codex → OpenCode continuation test passed; do not treat it as interruption coverage.
3. Preserve the V1.5 HOLD and indeterminate-run lock; a memory checkpoint does not resolve Figma execution.

## Deferred Decisions

Decide separately whether to commit:

- `graphify-out/`
- `.opencode/plugins/graphify.js`
- `.codex/` project hook/config files

Do not bundle these decisions into the project-memory commit without inspection.

## Relevant Paths

Global memory:

`E:\AI-Memory`

Project:

`E:\GitHub\figma-designer-standalone`

Project memory:

`E:\GitHub\figma-designer-standalone\ai-memory`

## Completion Criteria

The shared workflow is considered operational when:

- project memory is version-controlled
- checkpoint/resume commands are available
- memory updates are synchronized with Git evidence
- Graphify refresh is part of the checkpoint flow
- Obsidian Graphify export can be refreshed from the checkpoint flow
- a second harness can continue unfinished work without previous chat history — **met 2026-10-18** by the Codex → OpenCode recovery test
- abrupt interruption mid-write leaves recoverable state — not yet tested

## Checkpoint — 2026-10-18 (Asia/Manila)

User requested `ai checkpoint` only. No Figma operations, product changes, commit or push are authorized by this checkpoint. Shared CLI: `E:\AI-Memory\bin\ai.cmd`; local snapshot: `.ai-state/CHECKPOINT.json`. Graphify update and Obsidian export succeeded; export reconstructed communities from the current 4,245-node graph because the analysis sidecar was stale. Detailed recovery constraints are in `HANDOFF.md`.

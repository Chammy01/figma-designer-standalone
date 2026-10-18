# Current Task

## Project

`figma-designer-standalone`

## Active Objective

Make the shared AI-memory workflow durable and automate checkpoint/resume behavior now that Codex, OpenCode, Graphify, and Obsidian are connected and verified.

## Current Status

In progress.

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

## Current Priority

Make `ai-memory/` durable by tracking it in Git.

This is important because untracked memory survives local harness switching but does not automatically survive:

- a fresh clone
- a clean checkout on another machine
- repository transfer
- deletion of the local working copy

## Important Working Tree Constraint

Do not alter or revert:

`design-references/1.5-agent-studio/bedroom-base.jpg`

The file is modified but its intent has not yet been established.

## Next Actions

1. Stage only the project memory files first.
2. Review the staged diff.
3. Commit the project memory once verified.
4. Implement `ai checkpoint`.
5. Implement `ai resume`.
6. Test interrupted-session recovery.
7. Test a real Codex-to-OpenCode handoff.

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
- a second harness can continue unfinished work without previous chat history

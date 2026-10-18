# Start Here

## Project

`figma-designer-standalone`

## Purpose

This repository contains the standalone Figma automation pipeline.

The project is intended to support reliable AI-assisted design automation, structured Figma generation, validation, and continuation across different AI harnesses.

## Before Working

Before making substantial changes:

1. Read the global AI memory:
   - `E:\AI-Memory\USER_CONTEXT.md`
   - `E:\AI-Memory\WORKING_STYLE.md`
   - `E:\AI-Memory\TOOLING.md`
   - `E:\AI-Memory\GLOBAL_PROTOCOL.md`

2. Read the remaining project memory:
   - `./ai-memory/PROJECT_STATE.md`
   - `./ai-memory/CURRENT_TASK.md`
   - `./ai-memory/HANDOFF.md`
   - `./ai-memory/DECISIONS.md`
   - `./ai-memory/AI_PROTOCOL.md`

3. Inspect the repository state:
   - `git status`
   - `git diff`
   - recent commits when relevant

4. Use Graphify for repository structure and dependency discovery once Graphify is configured for this project.

## Project-Specific Reliability Notes

### Figma Write Operations

A `write_html` timeout must not automatically be treated as a failed write.

After a timeout:

1. Re-read the Figma document.
2. Inspect node counts and relevant state.
3. Wait for the document state to stabilize.
4. Retry only if the intended write clearly did not complete.

Blind retries can create duplicate nodes or duplicated design output.

### Auto Layout Ordering

`move_to_anchor` can change position but should not be trusted to reliably reorder Auto Layout children.

When child ordering matters, prefer rebuilding or reparenting the relevant structure.

### Geometry Validation

When validating geometry, confirm that coordinate systems are being compared correctly.

Child bounds may be parent-relative while root-level bounds may be page-absolute.

Do not treat values from different coordinate spaces as directly comparable.

### Component Instantiation

`instantiate_by_name` can be ambiguous when multiple components share the same visible name, such as `State=Default`.

After instantiating a component:

1. Resolve the source component ID.
2. Verify its `componentSetId`.
3. Continue only after confirming that the instance came from the intended component set.

Do not trust visible name matching alone.

## Source of Truth

Use the following order when determining actual project state:

1. Current repository files
2. Git status and diff
3. Relevant tests or validation output
4. Project AI memory
5. Graphify structural data
6. Prior conversation context

Project memory should help explain intent and continuity, but it must not override contradictory repository evidence.

## Multi-Agent Continuity

Assume work may move between Codex, OpenCode, Claude Code, Gemini CLI, or another compatible harness.

Important information must not exist only in one agent's conversation.

After meaningful progress:

- update the current task
- update the handoff
- update broader project state when necessary
- record significant decisions
- refresh Graphify when configured and relevant

## Recovery After an Interrupted Agent

If another agent stopped because of a usage limit, crash, or terminal interruption:

1. Read the latest project memory.
2. Inspect `git status`.
3. Inspect `git diff`.
4. Identify unfinished changes.
5. Validate the current Figma or repository state where relevant.
6. Continue only after reconstructing what actually happened.

Do not discard or overwrite unfinished work without first inspecting it.

## Memory Scope

This file is an orientation document.

Keep detailed live task state in:

- `CURRENT_TASK.md`
- `HANDOFF.md`

Keep durable architectural or workflow decisions in:

- `DECISIONS.md`

Keep the broader current project snapshot in:

- `PROJECT_STATE.md`

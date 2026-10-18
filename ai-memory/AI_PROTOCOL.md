# Project AI Protocol

## Project

`figma-designer-standalone`

## Purpose

This file defines project-specific operating rules for AI agents working in this repository.

It extends the global protocol at:

`E:\AI-Memory\GLOBAL_PROTOCOL.md`

Project-specific rules in this file take precedence over global defaults when they conflict.

## Startup Procedure

Before substantial work:

1. Read:
   - `E:\AI-Memory\USER_CONTEXT.md`
   - `E:\AI-Memory\WORKING_STYLE.md`
   - `E:\AI-Memory\TOOLING.md`
   - `E:\AI-Memory\GLOBAL_PROTOCOL.md`

2. Read:
   - `./ai-memory/START_HERE.md`
   - `./ai-memory/PROJECT_STATE.md`
   - `./ai-memory/CURRENT_TASK.md`
   - `./ai-memory/HANDOFF.md`
   - `./ai-memory/DECISIONS.md`
   - `./ai-memory/AI_PROTOCOL.md`

3. Inspect:
   - `git status`
   - `git diff`
   - recent commits when relevant

4. If continuing unfinished work, reconstruct actual state from repository evidence before editing.

5. Use Graphify for structural understanding once it is configured.

## Working Rules

- Inspect existing implementation before broad rewrites.
- Preserve working behavior unless a change is justified.
- Prefer incremental and testable modifications.
- Keep important task state outside chat history.
- Do not invent repository facts or prior decisions.
- Distinguish observed facts from assumptions.
- Keep unfinished work recoverable by another harness.

## Figma Reliability Rules

### `write_html`

Treat a timeout as indeterminate, not automatic failure.

After a timeout:

1. Re-read the document.
2. Inspect relevant node counts and state.
3. Wait for state to stabilize.
4. Retry only when evidence shows the intended write did not complete.

Do not blindly retry.

### Auto Layout Reordering

Do not rely on `move_to_anchor` to reorder Auto Layout children.

When order matters, prefer rebuilding or reparenting.

### Geometry Validation

Before comparing geometry:

1. determine the coordinate space of each bound
2. normalize or reconcile incompatible spaces
3. compare only compatible values

Do not directly compare parent-relative child bounds with page-absolute root bounds.

### Component Instantiation

After `instantiate_by_name`:

1. resolve the source component ID
2. verify its `componentSetId`
3. proceed only after confirming the intended component set

Visible names alone are not sufficient.

## Memory Update Rules

### `CURRENT_TASK.md`

Update when:

- a new task begins
- the objective changes
- a major subtask finishes
- the blocker changes
- the next action changes materially

### `HANDOFF.md`

Update after meaningful progress and before planned harness switches.

Keep it useful even if the current harness stops unexpectedly.

Include when relevant:

- active objective
- completed work
- unfinished work
- changed areas
- blockers
- test or validation status
- next recommended action

### `PROJECT_STATE.md`

Update only when the broader project state materially changes.

Examples:

- a major feature is completed
- architecture changes
- a milestone changes
- a major subsystem is added or removed

### `DECISIONS.md`

Add entries only for durable decisions likely to matter to future agents.

Do not store routine implementation details as permanent decisions.

## Checkpoint Behavior

After meaningful progress:

1. ensure changes are written to disk
2. inspect current Git state
3. update `CURRENT_TASK.md`
4. update `HANDOFF.md`
5. update `PROJECT_STATE.md` when needed
6. record new durable decisions when needed
7. refresh Graphify when configured and relevant

The workflow must not depend on a clean session ending.

## Sudden Interruption Recovery

If another harness stopped unexpectedly:

1. read all project memory
2. inspect `git status`
3. inspect `git diff`
4. identify modified files and incomplete work
5. inspect relevant Figma state if the task involved live document changes
6. run relevant validation or tests when possible
7. query Graphify when available
8. reconstruct the actual state
9. update memory once the recovered state is understood
10. continue without discarding unfinished changes unless evidence supports doing so

## Source of Truth

Use this priority for implementation state:

1. repository files
2. Git state
3. tests and validation
4. project memory
5. Graphify
6. previous conversation context

For explicit current instructions, the user's latest instruction has highest priority.

## Graphify Rules

Once configured:

- use Graphify for dependency discovery
- use it for relationship tracing
- use it for impact analysis
- prefer targeted graph queries before broad repository scans
- refresh the graph after meaningful structural changes

Graphify output is derived data and may be regenerated.

## Obsidian Rules

Obsidian is the human-facing navigation layer.

It may expose:

- global memory
- project memory
- decisions
- task state
- handoffs
- architecture notes
- Graphify-derived knowledge

Do not treat Obsidian as authoritative for code state.

## Secrets

Never store secrets in project memory.

Do not write:

- passwords
- API keys
- access tokens
- private keys
- recovery codes
- sensitive credentials

Use appropriate secret-management mechanisms instead.

## Multi-Harness Principle

Assume that Codex, OpenCode, Claude Code, Gemini CLI, or another compatible agent may continue the work.

The project should remain understandable and recoverable without access to the previous agent's private conversation history.

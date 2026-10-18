# Project State

## Project

`figma-designer-standalone`

## Current Status

This repository is an active standalone Figma automation project.

The project is being developed as an AI-assisted pipeline for generating, validating, and maintaining structured Figma designs while preserving reliable state across multiple AI harnesses.

Project memory is tracked at `aedddf46ef884effa88ae4957376a18fe1054132`. Shared `ai checkpoint` / `ai resume` / `ai status` automation is installed; checkpoint Graphify update and Obsidian export succeeded on 2026-10-18. The earlier stale analysis sidecar has been refreshed, and the following `ai checkpoint` completed without that warning.

V1.5.0 remains HOLD due to an indeterminate later request; see `HANDOFF.md`. V1.2.5 remains HOLD. Published Beta 3/Beta 4 checkpoints and approved runtime are untouched.

## Current Architecture Direction

The system should favor:

- repeatable design generation
- inspectable and verifiable Figma state
- deterministic component and layout handling where possible
- safe recovery after tool timeouts or interrupted agent sessions
- reusable automation rather than one-off manual fixes
- compatibility with multi-agent workflows

## Known Reliability Rules

### `write_html`

A timeout does not automatically mean the operation failed.

Required recovery behavior:

1. Re-read the Figma document.
2. Inspect node counts and relevant document state.
3. Wait for the state to stabilize.
4. Retry only if the intended write clearly did not complete.

Blind retries can create duplicate content.

### Auto Layout Reordering

`move_to_anchor` should not be relied on to reorder Auto Layout children.

When child ordering matters:

- rebuild the affected structure, or
- reparent nodes into the intended order.

### Geometry Validation

Geometry checks must account for coordinate-space differences.

Possible mismatch:

- child bounds may be parent-relative
- root bounds may be page-absolute

Validators should compare values only after confirming they are expressed in compatible coordinate systems.

### Component Instantiation

`instantiate_by_name` can be ambiguous when multiple components share the same visible name.

After instantiation:

1. Resolve the instance source component ID.
2. Verify its `componentSetId`.
3. Continue only after confirming the correct component set.

Visible names alone are not sufficient for verification.

## Multi-Harness Workflow

Verified working:

- Codex reads global memory and project memory.
- OpenCode reads the same global memory and project memory.
- Both harnesses can operate against the same repository and Graphify graph.
- Cross-harness continuation is verified. On 2026-10-18 OpenCode reconstructed the objective, dirty-tree state, HOLD status, reconciliation lock semantics, Graphify/Obsidian state, the unresolved `bedroom-base.jpg` constraint, and the next safe action without access to the previous Codex chat.
- Abrupt/interrupted-session recovery passed at the repository level. On 2026-10-18 a session killed after writing `recovery-test/INTERRUPTED_TEST.txt` was resumed from memory, `ai resume`, and Git evidence alone, and its interrupted step was completed.
- That test carried a procedure deviation. The second harness reconstructed the artifact and intended next action without prior chat, but edited the test file and the memory files before delivering the requested read-only verification report. The capability passed; the procedure was not followed exactly. It must not be cited as a clean read-only test.

Not yet verified:

- A kill that leaves no self-describing repository artifact. The 2026-10-18 test succeeded partly because the interrupted file stated its own pending next action; a silent partial write is untested.
- Interruption during a live Figma or `write_html` operation. Blocked behind the V1.5.0 reconciliation lock, requires explicit user authorization, and is not covered by any memory test.

## Global Memory

Global cross-project AI memory is located at:

`E:\AI-Memory`

## Project Memory

Project-local memory is located at:

`./ai-memory/`

Primary files:

- `START_HERE.md`
- `PROJECT_STATE.md`
- `CURRENT_TASK.md`
- `HANDOFF.md`
- `DECISIONS.md`
- `AI_PROTOCOL.md`

## Graphify

Graphify is installed and verified.

Current verified state:

- CLI version: `0.9.92`
- code graph built successfully
- `graphify-out/graph.json` exists
- graph contains 4,253 nodes and 8,399 edges
- analysis sidecar refreshed with `graphify cluster-only . --no-label`, producing 4,253 nodes, 8,399 edges, and 276 communities; the following `ai checkpoint` completed without the stale-sidecar warning
- `GRAPH_REPORT.md` exists
- `graph.html` exists
- Codex Graphify integration installed
- OpenCode Graphify integration installed
- Git hooks installed for post-commit, post-checkout, post-merge, and post-rewrite
- Graphify merge driver registered
- Graph queries verified working

## Obsidian

Obsidian is configured with the main vault at:

`E:\AI-Memory`

The project is represented under:

`E:\AI-Memory\Projects\figma-designer-standalone`

The live project `ai-memory` directory is exposed in the vault through a Windows directory junction.

Graphify has also been exported into:

`E:\AI-Memory\Projects\figma-designer-standalone\graphify`

## Current Development Context

Recent repository work is focused on Agent Studio design iteration and beta release work.

Recent commit themes include:

- correcting Agent Studio composition and status ownership
- keeping Studio assets within the application asset root
- avoiding conversation rebuilds for presence-only updates

Relevant release files include:

- `RELEASE_NOTES_v1.2.1-beta.3.md`
- `CHANGELOG.md`

## Working Tree Note

A tracked binary asset is currently modified:

`design-references/1.5-agent-studio/bedroom-base.jpg`

Its intent has not yet been established.

Do not revert, replace, or commit that asset until its purpose is confirmed.

## Source of Truth

When determining actual project state, use this order:

1. Current repository files
2. Git status and diff
3. Tests and validation output
4. Project memory
5. Graphify-derived structural information
6. Previous conversation context

## Recovery Expectations

The project should remain recoverable after:

- AI usage-limit interruptions
- terminal closure
- harness switching
- machine restart
- partial implementation
- tool timeouts

Another capable agent should be able to reconstruct the current state using:

- repository files
- Git state
- project memory
- Graphify
- validation or test results

## Setup Progress

Completed:

- Global AI memory
- Project-local AI memory
- Codex global/project memory integration
- OpenCode global/project memory integration
- Graphify installation
- Initial Graphify code graph
- Graphify architecture report
- Graphify Codex integration
- Graphify OpenCode integration
- Graphify Git hooks
- Obsidian vault
- Live project-memory exposure in Obsidian
- Graphify export to Obsidian
- Codex startup verification
- OpenCode startup verification
- Codex → OpenCode cross-harness recovery test (passed 2026-10-18)
- Abrupt/interrupted-session recovery test at repository level (capability passed 2026-10-18, with a recorded read-only procedure deviation)

Remaining:

- decide whether generated Graphify output should be committed or ignored — resolved in favour of ignoring (`efa72c4`)
- reconcile the unexplained modified JPG before any broad commit
- optional coverage: a kill leaving no self-describing repository artifact
- blocked coverage: interruption during a live Figma or `write_html` operation, pending lock release and user authorization

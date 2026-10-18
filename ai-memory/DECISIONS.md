# Decisions

## Project

`figma-designer-standalone`

## Purpose

This file records durable technical, architectural, and workflow decisions that future AI agents may need to understand.

Do not use this file for temporary task notes or routine implementation details.

---

## 2026-10-18 — Use Shared Global and Project AI Memory

### Decision

Use two memory layers:

1. Global memory at `E:\AI-Memory`
2. Project-specific memory at `./ai-memory/`

### Reason

The user works across multiple projects and may switch between different AI harnesses.

A shared global layer keeps stable user preferences and tooling rules reusable, while project-local memory preserves project-specific state and decisions.

### Consequences

- Global memory should remain stable and conservative.
- Project memory may update frequently.
- AI harnesses should read both layers before substantial work.
- Project-specific instructions override global defaults when necessary.

---

## 2026-10-18 — Project Memory Must Be Harness-Independent

### Decision

Important project knowledge must be stored in repository-accessible files rather than only in an AI provider's conversation history or proprietary memory.

### Reason

The user may switch between Codex, OpenCode, Claude Code, Gemini CLI, or another compatible harness.

### Consequences

- Another harness should be able to continue without access to the previous chat.
- Current task, handoff state, project state, and significant decisions must be persisted.
- Git and repository evidence remain more authoritative than stale memory notes.

---

## 2026-10-18 — Design for Sudden AI Harness Interruption

### Decision

The workflow must remain recoverable if an AI harness stops unexpectedly in the middle of a task.

### Reason

Usage limits, crashes, terminal closures, or provider interruptions can happen before a final handoff is written.

### Consequences

Recovery should use:

- project memory
- `git status`
- `git diff`
- repository files
- tests and validation
- Graphify when available

Handoff updates should occur after meaningful progress rather than only at session completion.

---

## 2026-10-18 — Graphify Is Derived Structural Knowledge

### Decision

Use Graphify for repository structure, relationships, dependencies, architecture discovery, and impact analysis.

Do not treat Graphify output as the authoritative source for project intent or human decisions.

### Reason

Graphify is well suited to machine-readable structural knowledge, while project memory is better suited to task context, decisions, and workflow state.

### Consequences

- Graphify may be regenerated.
- Project intent and decisions stay in `ai-memory/`.
- Agents should use Graphify to reduce unnecessary broad repository exploration.

---

## 2026-10-18 — Obsidian Is the Human Navigation Layer

### Decision

Use Obsidian as the human-readable navigation and knowledge layer for global memory, project memory, decisions, handoffs, architecture notes, and Graphify-derived knowledge.

### Reason

Obsidian provides backlinks, graph navigation, and convenient Markdown browsing without replacing the repository or Git.

### Consequences

- Obsidian is not the source of truth for code.
- Git and repository files remain authoritative.
- The memory system should remain usable even if Obsidian is closed or unavailable.

---

## 2026-10-18 — Treat `write_html` Timeout as Indeterminate

### Decision

A `write_html` timeout must not automatically be treated as a failed write.

### Reason

The Figma write may continue and complete even after the caller times out.

Blind retries can create duplicate nodes or duplicated design output.

### Consequences

After a timeout:

1. Re-read the Figma document.
2. Inspect node counts and relevant document state.
3. Wait for the state to stabilize.
4. Retry only if the intended write clearly did not complete.

---

## 2026-10-18 — Do Not Rely on `move_to_anchor` for Auto Layout Reordering

### Decision

Do not use `move_to_anchor` as the primary mechanism for reordering Auto Layout children.

### Reason

It can change position without reliably changing Auto Layout child order.

### Consequences

When ordering matters:

- rebuild the affected structure, or
- reparent nodes in the intended order.

---

## 2026-10-18 — Validate Geometry in Compatible Coordinate Spaces

### Decision

Geometry validators must verify that compared bounds use compatible coordinate systems.

### Reason

Child bounds can be parent-relative while root bounds can be page-absolute.

### Consequences

Normalize or otherwise reconcile coordinate systems before evaluating geometric correctness.

---

## 2026-10-18 — Verify Component Source After `instantiate_by_name`

### Decision

Do not trust visible component names alone after `instantiate_by_name`.

### Reason

Multiple components can share names such as `State=Default`.

### Consequences

After instantiation:

1. Resolve the source component ID.
2. Verify its `componentSetId`.
3. Continue only after confirming the intended component set.

---

## 2026-10-18 — Track Project AI Memory in Git

### Decision

The project-local `ai-memory/` directory should be version-controlled.

### Reason

Local untracked memory is sufficient for switching between AI harnesses on the same machine, but it does not survive a fresh clone, clean checkout on another machine, or repository transfer.

The project-memory files contain project workflow and architectural context and do not contain secrets.

### Consequences

- `ai-memory/` should be included in the repository.
- Memory changes become reviewable through Git history.
- Future clones inherit the same project context.
- Global user memory remains outside the repository at `E:\AI-Memory`.
- Secrets must never be added to project memory.

---

## Maintenance Rules

Add a new entry only when the decision is likely to matter to a future agent.

Do not rewrite historical decisions silently.

If a decision changes:

1. add a new dated decision
2. reference the previous decision
3. explain why it was superseded

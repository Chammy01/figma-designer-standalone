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

## 2026-10-18 — Preserve Uncertainty Across Memory Checkpoints

Green CI, memory checkpoints, and unchanged dashboard geometry do not resolve an indeterminate Figma request. Preserve V1.5 HOLD and its recovery lock until attributable native completion/receipt evidence supports the established recovery procedure. Do not resend requests, borrow old receipts, or edit recovery state to certify success. A checkpoint updates memory and derived repository data only.

---

## 2026-10-18 — Recovery Tests Are Only Valid for the Scenario Actually Tested

### Decision

Treat each recovery scenario as separately verified or unverified, and record which one a test covered. Mark a scenario complete only when an agent actually performed that recovery.

### Reason

Cross-harness continuation and abrupt interruption are different failures. On 2026-10-18 a Codex → OpenCode continuation test passed: OpenCode reconstructed objective, dirty-tree state, HOLD status, reconciliation lock semantics, Graphify/Obsidian state, an unresolved asset constraint, and the next safe action with no access to the previous chat. That result says nothing about a session killed mid-write, and it certified nothing about Figma document state.

Collapsing the two would let a completed test silently certify a scenario nobody exercised.

### Consequences

- Cross-harness continuation is recorded complete as of 2026-10-18.
- Abrupt/interrupted-session recovery remains open until a session is actually killed and resumed.
- A passing memory-recovery test never releases a product HOLD or a Figma reconciliation lock. Only native, attributable evidence does.
- Record the read-only or write scope of each test so later readers know what it could not have touched.

---

## 2026-10-18 — Recovery Coverage Is Scoped to Where the Interruption Happened

### Decision

Record abrupt/interrupted-session recovery as verified at repository scope, and keep live-Figma-write interruption explicitly unverified. An interrupted write leaves a self-describing artifact, so the resumed agent can detect the gap without chat history.

### Reason

On 2026-10-18 a session was terminated after writing `recovery-test/INTERRUPTED_TEST.txt`, which stated its own expected next action. A later session reconstructed HEAD, checkpoint recency, dirty-tree state, the HOLD and lock semantics from memory, `ai resume`, and Git alone, then completed the interrupted step. Nothing about that result extends to a kill inside a `write_html` call, where the repository holds no comparable artifact and only a bounded engine log does.

### Relation

Refines the 2026-10-18 decision "Recovery Tests Are Only Valid for the Scenario Actually Tested"; it does not replace it.

### Consequences

- Abrupt/interrupted-session recovery is complete as of 2026-10-18 for repository-level work, subject to the procedure deviation recorded below.
- Interruption during a live Figma write stays unverified and is blocked behind the V1.5.0 reconciliation lock; testing it requires explicit user authorization.
- Prefer test artifacts that describe their own pending next action. Silent partial writes remain the hard recovery case.

---

## 2026-10-18 — Separate Recovery Capability From Verification Procedure

### Decision

Record the 2026-10-18 abrupt/interruption test as a capability pass with a procedural deviation, and never cite it as a clean read-only verification.

### Reason

The second harness reconstructed the unfinished artifact and its intended next action from global memory, `ai-memory/`, `.ai-state/CHECKPOINT.json`, `ai resume`, and Git alone, with no prior chat available. That capability claim is sound.

The procedure did not match. The harness edited `recovery-test/INTERRUPTED_TEST.txt` and the four `ai-memory/` files before producing the read-only verification report that was actually requested. The edits preceded the report. A test whose procedure was out of order still proves what it exercised, but it cannot be described as a read-only test, and reporting it that way would overstate the guarantee for anyone relying on the memory entry.

### Relation

Adds a reporting constraint to "Recovery Tests Are Only Valid for the Scenario Actually Tested" and "Recovery Coverage Is Scoped to Where the Interruption Happened". Neither conclusion is reversed.

### Consequences

- Repository-level abrupt/interrupted-session recovery passed on capability. This stands.
- The deviation is recorded in `CURRENT_TASK.md`, `HANDOFF.md`, and `PROJECT_STATE.md`. Do not restate the test as clean.
- When a request is read-only or verification-only, deliver the read-only report before editing anything, even when the pending action is obvious and safe.
- A kill leaving no self-describing repository artifact remains unverified.
- Interruption during a live Figma or `write_html` operation remains unverified and blocked behind reconciliation lock `a700300a-db2f-45d8-944b-02c20964745b`.
- Memory-only recovery results never release a product HOLD or a reconciliation lock, deviation or not.

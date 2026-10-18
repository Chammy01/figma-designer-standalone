# Handoff

## Project

`figma-designer-standalone`

## Current Objective

Cross-harness continuity is proven; the remaining recovery work is abrupt/interrupted-session recovery testing. Do not resume Figma product work — V1.5.0 remains HOLD under the reconciliation lock.

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
- 4,245-node code graph (2026-10-18 query)
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

### Cross-Harness Recovery Test — 2026-10-18 (PASSED)

Codex → OpenCode continuation verified. OpenCode reconstructed the following with no access to the previous Codex chat, using only global memory, `ai-memory/`, `.ai-state/CHECKPOINT.json`, Git state, and Graphify:

- the current objective
- dirty working-tree state (all seven modified paths and three untracked trees)
- the V1.5.0 / V1.2.5 HOLD state
- the exact reconciliation lock semantics for run `a700300a-db2f-45d8-944b-02c20964745b`
- Graphify and Obsidian state
- the unresolved `bedroom-base.jpg` constraint
- the next safe action

The test was read-only. It made no Figma claim, no product claim, and no commit.

This completes the cross-harness continuation criterion. It does **not** complete abrupt/interrupted-session recovery, which is a separate scenario with no test evidence yet.

## Checkpoint Infrastructure

All six project-memory files are tracked at HEAD `aedddf46ef884effa88ae4957376a18fe1054132` (`Add shared AI project memory`). The installed `E:\AI-Memory\bin\ai.cmd` implements checkpoint/resume/status. Run it from the project root. `ai checkpoint` refreshed Graphify and the configured Obsidian export successfully. The local `.ai-state/` snapshot is excluded through Git local configuration. Export warned that the analysis sidecar was stale and reconstructed communities from `graph.json`; this is not a product test failure.

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

Test abrupt/interrupted-session recovery — a session killed mid-work and resumed — and keep that separate from the cross-harness continuation test that already passed. Do not mark interruption recovery complete without an actual test run.

Read the preserved product HOLD below before any future Figma work. Do not stage, reset, or clean unrelated working-tree changes.

## Handoff Quality Rule

Update this file after meaningful progress rather than only at a clean session ending.

The handoff should remain useful after a sudden usage-limit cutoff or harness failure.

## Product Recovery Checkpoint — 2026-10-18

- V1.5.0 Agent Studio remains **HOLD**. Historical product baseline `fb4444606a3eff347bea53c2d27f984de10f1658` passed all four jobs in [CI run 39090707475](https://github.com/Chammy01/figma-designer-standalone/actions/runs/39090707475). That run does not certify the newer memory commit.
- Run `a700300a-db2f-45d8-944b-02c20964745b` remains `RECONCILIATION_REQUIRED`. Saved offset and native context were both 58; no attributable later receipt/completion was found. A bounded engine log recorded HTTP 499 after receipt of the request. Never resend, borrow older receipts, edit recovery metadata to clear the lock, or infer retry safety from unchanged geometry. This was a later vague-business-website briefing request, not the completed dashboard generation.
- Disposable acceptance page `1053:758` contains one editable dashboard root `1053:1059` (314 nodes including page). Last retained fingerprint: `8830fd4bdf16f232d830301db8ea11d8b793375b7e67713461edf7d44aed4c79`. Re-read live before future work; this checkpoint makes no fresh document claim.
- Protected Page 1 recapture timed out natively. Final live QA/Browser acceptance is deferred while recovery is locked. Existing browser fidelity evidence has five MEDIUM stroke-width findings; native pixel parity remains UNVERIFIED. Do not hide findings or adjust thresholds to certify completion.
- Detailed ignored local evidence: `.figma-designer/presence/FINALIZATION_V1_5_0.md` and adjacent `final-*` reports, logs and images. These may be absent in a fresh clone; the safety constraints above must survive without them.
- V1.2.5 remains HOLD. Beta 3 and Beta 4 published assets remain immutable. Owned MCP 1.1.0 / protocol 2 / 108 tools is unchanged by checkpoint work.
- Preserve unrelated dirty `.gitattributes`, `AGENTS.md`, user-modified `design-references/1.5-agent-studio/bedroom-base.jpg`, and untracked `.codex/`, `.opencode/plugins/graphify.js`, `graphify-out/`. No blanket stage/reset/cleanup. No commit/push performed for this request.
- The 2026-10-18 cross-harness recovery test was repository-memory-only. It did not read, modify, or certify any Figma document state, so every constraint above still stands unchanged.

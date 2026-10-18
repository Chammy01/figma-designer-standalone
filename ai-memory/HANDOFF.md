# Handoff

## Project

`figma-designer-standalone`

## Current Objective

Cross-harness continuity is proven and abrupt/interrupted-session recovery is now exercised. Do not resume Figma product work — V1.5.0 remains HOLD under the reconciliation lock.

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
- dirty working-tree state, recorded at the time as seven modified paths and three untracked trees; later superseded by the ignore resolutions below, see `Working Tree Warning`
- the V1.5.0 / V1.2.5 HOLD state
- the exact reconciliation lock semantics for run `a700300a-db2f-45d8-944b-02c20964745b`
- Graphify and Obsidian state
- the unresolved `bedroom-base.jpg` constraint
- the next safe action

The test was read-only. It made no Figma claim, no product claim, and no commit.

This completes the cross-harness continuation criterion. It does **not** complete abrupt/interrupted-session recovery, which is a separate scenario.

### Abrupt/Interrupted-Session Recovery Test — 2026-10-18 (PASSED)

Scenario: a harness ran `ai checkpoint` at 14:49:43, wrote `recovery-test/INTERRUPTED_TEST.txt` at 14:52:28, and was terminated before recording completion. The file carried its own expected next action so a later session could detect the interruption without chat history.

A later OpenCode session recovered it with only global memory, `ai-memory/`, `ai resume` output, and Git evidence. It reconstructed:

- HEAD `efa72c4` and branch `main`
- the checkpoint at 14:49:43 and that it predated the interrupted file
- the single unexplained modified binary plus the new untracked `recovery-test/` path
- the V1.5.0 HOLD and the exact indeterminate-run lock semantics
- the intended next action, taken from the interrupted file itself

It then appended `RECOVERED_BY_SECOND_HARNESS` and updated project memory. The test made no Figma call and certified no document state; `recovery-test/` remains untracked and uncommitted.

#### Procedure deviation on this test — do not present it as a clean read-only test

The recovery capability passed. The read-only verification procedure was not followed exactly.

- The second harness did reconstruct the unfinished artifact and its intended next action using only global memory, `ai-memory/`, `.ai-state/CHECKPOINT.json`, `ai resume`, Git status/diff, and repository files. No prior chat was available or used.
- However, it edited `recovery-test/INTERRUPTED_TEST.txt` and the four `ai-memory/` files **before** producing the requested read-only verification report. The edits happened first; the read-only report followed.
- Therefore the reconstruction evidence is valid and the scenario is a genuine pass, but the procedure that produced it was out of order. Reporting this test as a clean read-only verification would misstate what happened.

This deviation does not invalidate repository-level recovery, and it changed no product, Figma, or asset state. It is recorded so a later reader does not infer a stricter guarantee than the run provides.

#### Coverage limits on this test

- A kill that leaves **no self-describing repository artifact** remains unverified. This run succeeded partly because the interrupted file stated its own pending next action. A silent partial write is the hard case and is untested.
- Interruption during a live Figma or `write_html` operation remains unverified. It is blocked behind reconciliation lock `a700300a-db2f-45d8-944b-02c20964745b` and requires explicit user authorization to attempt.

## Checkpoint Infrastructure

All six project-memory files are tracked at HEAD `aedddf46ef884effa88ae4957376a18fe1054132` (`Add shared AI project memory`). The installed `E:\AI-Memory\bin\ai.cmd` implements checkpoint/resume/status. Run it from the project root. `ai checkpoint` refreshed Graphify and the configured Obsidian export successfully. The local `.ai-state/` snapshot is excluded through Git local configuration. The analysis-sidecar warning seen on the 14:49:43 checkpoint has been resolved: the sidecar was refreshed with `graphify cluster-only . --no-label`, and the following `ai checkpoint` completed without the stale-sidecar warning.

## Working Tree Warning

The tracked binary file:

`design-references/1.5-agent-studio/bedroom-base.jpg`

is modified and not explained by current memory.

Do not revert, overwrite, or include it in a setup commit until its intent is confirmed.

`recovery-test/` is untracked evidence from the interruption test. `.codex/`, `.ai-state/`, and `graphify-out/` are excluded locally; `.opencode/plugins/graphify.js` is committed. The earlier "seven modified paths and three untracked trees" description referred to the state before those resolutions and is superseded by `git status`.

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
5. Reconstruct and state the evidence **before** editing anything. If the request is read-only or verification-only, produce that report first and change nothing until it is delivered.
6. Query Graphify for affected systems when useful.
7. Update `CURRENT_TASK.md` and this file after reconstructing the actual state.

## Next Recommended Action

Both recovery scenarios are now exercised and both passed on capability. No further recovery testing is required for memory continuity.

Two cases remain unverified: a kill that leaves no self-describing repository artifact, and an interruption during a live Figma or `write_html` operation, which is blocked behind the reconciliation lock and needs explicit user authorization.

When reporting the 2026-10-18 interruption test, state the procedure deviation recorded above. Do not present it as a clean read-only verification.

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
- Preserve unrelated dirty `.gitattributes`, `AGENTS.md`, user-modified `design-references/1.5-agent-studio/bedroom-base.jpg`, and untracked `.codex/`, `.opencode/plugins/graphify.js`, `graphify-out/`. No blanket stage/reset/cleanup. No commit/push performed for this request. `.gitattributes` and `AGENTS.md` were since committed (`8b25dec`), `.opencode/plugins/graphify.js` in `1074113`, and `graphify-out/` was ignored in `efa72c4`; only the JPG and `recovery-test/` remain dirty and uncommitted.
- The 2026-10-18 cross-harness recovery test and the 2026-10-18 abrupt/interruption test were both repository-memory-only. Neither read, modified, or certified any Figma document state, so every constraint above still stands unchanged.

# Current Task

## Project

`figma-designer-standalone`

## Active Objective

V1.5.2 Complete Monochromatic UI/UX Overhaul: VERIFIED AND DELIVERED.
Complete redesign of application shell, navigation, Studio layout, composer, conversation, inspection views (QA, Browser, Prototype, Runs, Settings), and recovery states under a cohesive Deep Cool Slate (220° Hue) monochromatic design system.

## Current Status

V1.5.2 verification completed:
- 716 node test cases pass
- 153 Bun test cases pass (hardening, variants, live source)
- 31 app UI test cases pass (including V1.5.2 monochromatic tokens and focus rings)
- 8 browser integration / motion test cases pass
- 9 Playwright fidelity test cases pass
- 25 desktop test cases pass
- 35 setup regressions pass
- Native MCP release check pass (108 tools, variants, invalid reaction rejection)
- Desktop packaging verified (portable zip, setup exe, win-unpacked, 801 payload files)
- Visual acceptance captured across all required viewports (1320x860, 900x650) and states (working, waiting, completed, recovery, error)
- User-owned `design-references/1.5-agent-studio/bedroom-base.jpg` remains untouched throughout.
Native Orca removal actively progressing from baseline `0c513890cad08dc923fdb5a5f75e0f8b502c52cf`. Obsolete root legacy script (`orca.ps1`) and old agent (`.opencode/agents/web-designer.md`) deleted; canonical `figma-designer` agent updated with construction/revision discipline. Local/template configuration defaults (`opencode.json`, `opencode.example.json`), setup requirements, allowlists, tests, and documentation aligned to canonical OpenCode runtime. Desktop upgrade policy (`desktop/policy.mjs`) configured to remove obsolete files on upgrade. Local Native Orca installation, updater, profile, hooks, shortcut, User PATH, uninstall registry entry, and auto-hooks across OMP, OpenCode, Codex, and Qoder cleanly removed without elevation, preserving all other settings.

Verification status:
- Verified: 588 npm contracts pass.
- Verified: 328 plugin + 153 hardening/source Bun tests pass.
- Verified: Go tests and Go vet pass.
- Verified: MCP 1.1.0 / protocol 2 / 108 tool probe pass.
- Verified: Browser 8 integration/motion and 9 fidelity cases; all 30 UI cases exercised passing across focused runs (final Studio 13/13); 33 setup fixtures including exact legacy-default migration; clean source/archive and 232-entry release ZIP setup; clean-source release/privacy gates; 794-file desktop validation and real packaged smoke on System32-only PATH/no ORCA variables. Advisor and final exclusion audit PASS (zero ambiguous active dependencies).
- Source commit `413a41305c4882af7090f52202ec25ece66ace79` pushed; hosted run39210955888 passed node-contracts/plugin/go/desktop, including full browser/UI and installer/upgrade/uninstall/portable gates.
- Live Browser export completed through canonical `finish` after preserving generated output from a normally cancelled free-model run. Source binding STABLE and source/local/overall freshness CURRENT. Browser Test truthfully FAIL: known5 MEDIUM strokes plus one normal-motion intermediate-frame sample; functional navigation/history/hooks/locality pass. Live QA WARN (6reads/0writes, no broken controls); native page fingerprint remains `a68cfd586576aa6f2d199c8edd4e46c541b5d7e9a22508a16781e8fff3712be6`.
- Prior service exit127 was resolved only through the user's explicit normal Keep Current Figma confirmation: run `6b819bcd-8356-4343-8c4f-578b3d2ed574` stays FAILED/UNVERIFIED with USER_ACCEPTED_CURRENT_STATE. Later run `0718248c-0b22-432b-a2be-e3af890a6929` stays CANCELLED; no active run or uncertainty lock, no replay/metadata edits. Remaining gate: final documentation-head exact CI and report. Detailed evidence: removal audit.

Invariants:
- Requested Gemini role models (advisor/planner) unavailable through OMP dispatcher (no model override for worker roles; no native `plan` role); assigned roles operated honestly without invoking Native Orca tools or skills.
- Preserved: historical recovery evidence (USER_ACCEPTED_CURRENT_STATE, run IDs, receipts, fingerprints) and V1.2.5 HOLD.
- Preserved: Beta 3/4 published assets remain immutable; MCP 1.1.0 / protocol 2 / 108 tools (including `combine_as_variants`) and recovery/receipt/QA/fidelity semantics preserved.
- Preserved: unrelated modified binary `design-references/1.5-agent-studio/bedroom-base.jpg` untouched.
- Historical inventories frozen except explicit historical scope metadata. No release publication.

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
- Abrupt/interrupted-session recovery passed 2026-10-18: a harness was killed after writing `recovery-test/INTERRUPTED_TEST.txt`; a later session reconstructed state from memory plus Git and completed the interrupted step. Recovery capability passed; the read-only verification procedure was not followed exactly — see `HANDOFF.md`

## Current Priority

Preserve continuity with the installed `ai checkpoint` / `ai resume` workflow. All six memory files are tracked in commit `aedddf46ef884effa88ae4957376a18fe1054132`. Do not implement a duplicate CLI.

Both recorded recovery scenarios are now exercised. Recovery capability passed in both. Two cases remain unverified and neither is closed by memory work: a kill that leaves no self-describing repository artifact, and a kill during a live Figma write. The 2026-10-18 interruption test also carried a procedure deviation that must not be smoothed over when this result is reported.

## Important Working Tree Constraint

Do not alter or revert:

`design-references/1.5-agent-studio/bedroom-base.jpg`

The file is modified but its intent has not yet been established.

`recovery-test/` is untracked evidence from the interruption test. Keep or discard deliberately; do not stage it in an unrelated commit.

## Next Actions

1. Read this checkpoint and `HANDOFF.md` before continuing product work.
2. Preserve the V1.5 HOLD and indeterminate-run lock; a memory checkpoint does not resolve Figma execution.
3. If deeper recovery coverage is wanted, the untested cases are a kill leaving no self-describing repository artifact, and a kill during a live Figma or `write_html` operation. The second requires releasing the reconciliation lock first and is not authorized by memory work.

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
- abrupt interruption mid-work leaves recoverable state — **met 2026-10-18** by the `recovery-test/` interruption scenario, with a recorded read-only procedure deviation

## Checkpoint — 2026-10-18 (Asia/Manila)

User requested `ai checkpoint` only. No Figma operations, product changes, commit or push are authorized by this checkpoint. Shared CLI: `E:\AI-Memory\bin\ai.cmd`; local snapshot: `.ai-state/CHECKPOINT.json`. Graphify update and Obsidian export succeeded; export reconstructed communities from the current 4,245-node graph because the analysis sidecar was stale. Detailed recovery constraints are in `HANDOFF.md`.

Historical note: the stale-sidecar warning above belongs to this specific checkpoint. The sidecar was later refreshed with `graphify cluster-only . --no-label` (4,253 nodes, 8,399 edges, 276 communities) and the following `ai checkpoint` completed without the warning. Current sidecar state is tracked in `PROJECT_STATE.md`.

## Active Recovery Feature — 2026-10-18

User authorized implementation of confirmed USER_ACCEPTED_CURRENT_STATE recovery. Preserve old FAILED/UNVERIFIED outcome; never replay or claim retry safety. Implement durable acceptance before unlocking, fresh session boundary, bounded privacy-safe history and confirmation UI. Current actual base 0335d5e; unrelated modified bedroom-base.jpg excluded. Source implementation and tests in progress; live acceptance and new exact-head CI pending. Do not manually edit live recovery metadata.

## Recovery continuation — 2026-10-19

Implementation remains uncommitted on 0335d5e. User resumed after stopping Computer Use. Prior 79 focused / 586 npm tests passed, but later source edits need rerun. Full browser tests exposed an obsolete recovery-copy assertion (updated); package failed because running desktop held a DLL (desktop now absent). Added acceptance-versus-reconciliation checkpoint serialization. Build/regression and live confirmation are pending. Preserve old run UNVERIFIED; no replay or manual recovery-file edits. New contract: docs/USER_ACCEPTED_CURRENT_STATE_V1_5_0.md.

## Live recovery progress — 2026-10-19

The new UI Check Again kept old run a700300a-db2f-45d8-944b-02c20964745b unresolved. The explicit Keep Current Figma confirmation was then executed as authorized by the user task: old state FAILED, recovery USER_ACCEPTED_CURRENT_STATE, original outcome UNVERIFIED; no replay. Durable metadata created a new workspace 36cfd25e-3c33-4a32-9ff4-d9a3cd10cc5c and fresh session ses_eaf6b32d7ffeWCrsja2GjGWACv. Resolution left page fingerprint 8830fd4bdf16f232d830301db8ea11d8b793375b7e67713461edf7d44aed4c79 unchanged, one root1053:1059/314 nodes. Fresh run a70990e6-b264-421b-b777-be6dc06e4e6b COMPLETED: only heading1053:1108 changed to Project Overview (native setter also renamed that text layer); no nodes added/removed. Receipt dbc900fad658f9cbcb7ef04a54bf3a10 verified COMMITTED, applied1/failed0. QA now running. Evidence .figma-designer/presence/recovery/. No commits yet; package/restart/finalCI pending.

QA completed read-only (0 writes), unchanged page fingerprint7b41848fd6a5263b775efd12811f19e6822090b1efa92d236ec4c9d8c77d0e52; canonical FAIL because disposable dashboard has no runtime SECTION. Do not repair or relabel that finding. Protected Page1 recapture now succeeds and matches a68cfd586576aa6f2d199c8edd4e46c541b5d7e9a22508a16781e8fff3712be6. Browser acceptance uses the already-existing runtime1023:1802 on Page1, read-only; UI page selection changed only view. No new runtime/prototype objects authorized.

## Latest source/CI — 2026-10-19

Source90cc143 CI39161490548 exposed a real shutdown/checkpoint race (ENOTEMPTY during test workspace cleanup); node-contracts failed, desktop skipped, plugin/Go passed. Fixed in0c105a4b51ded9748c92df660db5857fbda72629: track workPending, reject submits after closed, await final worker checkpoint on close. Added regression;588npm contracts and30UI cases pass. NewCI39162090680 node-contracts/plugin/Go green, desktop pending. Latest package now rebuilding in recovery-candidate from refreshed payload including0c105a4. Running desktop remains the earlier recovery build until liveBrowser finishes and a normal restart activates the final package. Browser56e5731b-4636-40f7-9582-63138bf454fe still active; metadata-only SQLite read of that exact native session confirmed recent read/shell/edit tool completions and no pending permissions. No credentials or reasoning were inspected. Do not resend.

## Native Orca Clean Removal and Verification — 2026-10-19

Audit reference: `docs/ORCA_REMOVAL_AUDIT.md`.

Architecture boundary clarified: OMP is the external developer harness for developers and agents; OpenCode is the product runtime (`Figma Designer App -> OpenCode -> Figma Designer workflows -> Figma Designer MCP -> Figma Desktop plugin`). Native Orca is obsolete and cleanly removed.

Summary of changes and verified state:
1. **Files Removed**: `orca.ps1` and `.opencode/agents/web-designer.md` deleted with zero active dependencies remaining across repository.
2. **Agent & Config Migration**: Section-by-section construction and revision guidance migrated to `.opencode/agents/figma-designer.md`. `opencode.json` and `opencode.example.json` updated to select `figma-designer`. Setup script, test fixtures, router tests, and release check updated.
3. **Desktop Upgrade Policy**: `desktop/policy.mjs` removes formerly shipped `orca.ps1` and `.opencode/agents/web-designer.md` from the user writable workspace upon upgrade, preventing duplicate agent discovery while preserving `.figma-designer/` outputs, recovery state, and user data.
4. **Local Environment Sanitization**: Native Orca per-user installation (`%LOCALAPPDATA%/Programs/orca`), updater, profile (`%APPDATA%/orca`), hooks, shortcut, User PATH entry, and HKCU uninstall registry entry removed without elevation. Auto-hooks in OMP, OpenCode, Codex (`hooks.json`), and Qoder removed while strictly preserving all other configuration. Command discovery confirms zero `orca*` commands.
5. **Verified Test Gates**:
   - 588 npm contracts pass
   - 328 plugin + 153 hardening/source Bun tests pass
   - Go tests + vet pass
   - MCP 1.1.0 / protocol 2 / 108 tool probe pass
6. **Pending Gates**: Browser validation, desktop rebuild/smoke, source setup tests, CI, and independent review.
7. **Invariants Preserved**:
   - Historical recovery state and evidence preserved; V1.2.5 HOLD maintained.
   - Published Beta 3 and Beta 4 assets remain immutable.
   - Owned MCP 1.1.0 / protocol 2 / 108 tools (`combine_as_variants`) preserved.
   - Historical inventory/provenance JSON records preserved.
   - Unrelated user-modified `bedroom-base.jpg` excluded and untouched.
   - Requested Gemini role models unavailable through OMP dispatcher; no Native Orca invoked.

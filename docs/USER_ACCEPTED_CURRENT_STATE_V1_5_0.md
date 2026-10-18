# User-accepted current Figma state — V1.5.0 recovery

Acceptance date: 2026-10-19 (Asia/Manila). Implementation commits: 90cc143 and 0c105a4.

## Meaning and safety

USER_ACCEPTED_CURRENT_STATE resolves a workflow lock, not the old request's outcome. The user accepts the current file as the starting point. The old request remains FAILED / UNVERIFIED and is never replayed. It is neither RECOVERED_COMPLETED nor RETRY_SAFE.

The recovery surface offers Check Again and Keep Current Figma & Continue. A separate confirmation explains that the old request cannot be verified and will not be retried. Cancel makes no change. Technical details remain collapsed. Presence changes from RECOVERING to IDLE; history distinguishes the unconfirmed change from acceptance.

POST /api/run/:id/accept-current-state requires same-origin JSON with confirmation KEEP_CURRENT_FIGMA. Only the exact latest FAILED / RECONCILIATION_REQUIRED run qualifies. Active tasks, provider operations, session creation, reconciliation checkpoints, another resolution and closing all block acceptance. It is not an arbitrary state-mutation API.

## Durable ordering

1. Construct a candidate with recovery USER_ACCEPTED_CURRENT_STATE, manualResolution {type, at}, and a fresh acceptedWorkspaceId. Keep the live run and uncertainty lock unchanged.
2. Atomically checkpoint the candidate. A save failure retains the old recovery, session and lock.
3. Apply the saved candidate, retaining FAILED, then clear uncertainty.
4. Discard the old session and establish the fresh workspace boundary. Create an empty OpenCode session without submitting any prompt. If creation fails, the boundary stays empty and the next fresh request creates a session. Restart never restores the old session for an accepted record.

No engine.submit, MCP operation or Figma write occurs in resolution. Reconciliation and its entire checkpoint are serialized against acceptance. App shutdown rejects new submissions and drains the existing worker's final checkpoint without changing engine timeout/retry policy.

Recovery store v2 retains up to 50 metadata-only records and reads v1 checkpoints. It validates manual resolution metadata and retains accepted unverified history after later completed tasks. Prompts, results, credentials and tool payloads are excluded. Restored activity is reconstructed without duplicate entries.

## Implementation

- app/server/runs.mjs: eligibility, serialization, durable acceptance, fresh boundary, worker tracking.
- app/server/recovery-store.mjs: bounded v2 history, v1 migration, privacy and restart validation.
- app/server/index.mjs: guarded endpoint, durable application store, checkpoint drain on close.
- app/server/ai.mjs: provider/model exclusion during resolution.
- app/server/agent-activity.mjs and app/shared/agent-activity.mjs: owned messages and safe technical fields.
- app/web/app.js and app/web/agent-presence.js: explicit confirmation, honest journal, fresh-workspace presence and enabled recovery controls.
- scripts/figma-manual-recovery.test.mjs plus application/presence tests: server, concurrency, durability, restart, API and UI coverage.

## Tests and build

Final source: 588 npm contracts; 328 plugin tests; 153 hardening/variants/source tests; 8 browser integrations; 9 fidelity fixtures; 30 app/validation/presence UI cases. This is 1,116 distinct JS/TS/browser cases. Repeated built-plugin and desktop executions are not additional distinct cases. Go tests/vet, 33 setup fixtures, isolated source/release/privacy/hash checks, clean source archive and release-ZIP extraction also passed.

Tests cover exact/latest IDs, completed/active rejection, explicit confirmation/cancel, session/provider/checkpoint concurrency, no submission/MCP write, save-before-unlock ordering, save failure, session outage, fresh requests, bounded privacy-safe persistence, restart/no replay, historical labels, same-origin guards and shutdown drain.

An initial image-load assertion and browser-motion timing sample failed under concurrent package load. Full reruns passed; the image test now waits for decode. CI 39161490548 on 90cc143 exposed a real late-checkpoint shutdown race (ENOTEMPTY during fixture cleanup). Commit 0c105a4 fixes it and adds a regression. CI 39162090680 passed node-contracts, plugin, go and desktop on exact implementation head 0c105a4b51ded9748c92df660db5857fbda72629. A subsequent documentation/continuity head must also pass all four jobs before the final milestone marker.

## Live acceptance

| Case | Evidence |
| --- | --- |
| A — normal check | Old run a700300a-db2f-45d8-944b-02c20964745b stayed RECONCILIATION_REQUIRED. Original session still has exactly 58 messages; no new completion proof was manufactured. |
| A — confirmation | The requested confirmation was executed in the real desktop UI. Old state stays FAILED; recovery USER_ACCEPTED_CURRENT_STATE; manualResolution timestamp 2026-10-18T19:54:51.532Z. Zero replay, zero Figma writes, durable checkpoint and cleared lock. |
| A — boundary | New workspace 36cfd25e-3c33-4a32-9ff4-d9a3cd10cc5c; new session ses_eaf6b32d7ffeWCrsja2GjGWACv. Old session context was not reused. |
| B — current document | One root 1053:1059 on disposable page 1053:758; 314 nodes before/after resolution; fingerprint unchanged. |
| C — fresh task | Run a70990e6-b264-421b-b777-be6dc06e4e6b completed through INSPECTING, DESIGNING, CHECKING, COMPLETED. Only heading 1053:1108 became Project Overview; the native setter also changed that text layer's name. No other node properties changed, no IDs replaced, no nodes added/removed. |
| C — receipt | dbc900fad658f9cbcb7ef04a54bf3a10 verified COMMITTED; update_node_props; applied 1, failed 0, no created nodes. |
| D — QA | Run f6f50284-860e-4121-8008-6d1ef54d3969 completed in CHECKING with zero writes and unchanged page fingerprint. Canonical FAIL is retained: the visual dashboard has no Interactive App runtime. Nothing was repaired or relabeled. |
| E — Browser | Used existing protected-page runtime 1023:1802 read-only; no runtime was added to the dashboard. Build 56e5731b-4636-40f7-9582-63138bf454fe completed with FIGMA_BROWSER_BUILD: PASS and observed PREVIEWING. Served preview loads its expected start screen. |
| E — Browser Test | Run dee2f013-fd2e-4b6b-aa38-e98618394d42 completed with CHECKING and truthful FAIL. Navigation, pointer/Enter, history, deep links, control hooks, reduced motion and local resources passed. Fidelity retains five MEDIUM PROPERTY_strokeWidth findings; 199 font and 86 complex-paint limitations remain. Native/pixel parity and live visual regression remain UNVERIFIED. |
| F — restart | Normal close and validated portable relaunch retained all five unique run IDs, manual timestamp and FAILED/unverified history; fresh task stays COMPLETED. No active task or returning lock. New native session's last sequence remains 1145, and the original session remains at 58 messages. Model selection retained. |
| Connection | Post-restart plugin CONNECTED, bridge COMPATIBLE, runtime VERIFIED. Loaded recovery modules match final implementation source. |
| Visual checkpoint | PASS at 1320×860 and 900×650: composer visible, no horizontal overflow, actual PREVIEWING observed. Existing art remains unchanged. |

## Integrity

Resolution fingerprint: 8830fd4bdf16f232d830301db8ea11d8b793375b7e67713461edf7d44aed4c79 before and after acceptance.

After the approved heading edit, disposable page fingerprint: 7b41848fd6a5263b775efd12811f19e6822090b1efa92d236ec4c9d8c77d0e52. It remains unchanged through QA, Browser/Test and restart; 314 nodes and one root.

Protected Page 1 recapture succeeded before and after restart: a68cfd586576aa6f2d199c8edd4e46c541b5d7e9a22508a16781e8fff3712be6, 2,385 nodes, original eight roots. No timeout result was promoted to PASS.

## Browser Test procedure deviation

The first model-orchestrated Browser Test made eight edit-tool calls to repair six newly generated HIGH text/hook defects before its final runner invocation. It must not be described as artifact-read-only. Figma was unchanged, and eight browser runner modules matched repository source; no threshold was weakened.

After export stabilized, an independent direct invocation of the canonical runner compared SHA-256 hashes of app.js, index.html, styles.css, figma-browser.json and figma-source.json before/after. All five were unchanged. That read-only rerun returned exit 1 / FAIL with exactly the five MEDIUM stroke-width findings and CURRENT source freshness. The original retained repository report (SHA e6bc9daf2d29a83d3fbbfeaea13d8467dec1e66642bb88e0fbdfae75385e632e) was also preserved. Browser Test orchestration needs a separate artifact-write guard; this recovery milestone does not certify universal model compliance.

## Package and rollout

The candidate was built separately to preserve the active live run, then promoted to release-staging/desktop after its prior staging executable stopped. The old generated unpacked directory was retained as a reversible backup. Unmodified validation scripts checked the alternate candidate through a temporary harness, and the standard desktop-validate command passed after promotion. Portable extraction matched all 795 files. Portable smoke passed startup, single instance, zero startup tasks, and owned service/engine cleanup after force close. Hosted desktop CI also passed installer, upgrade, uninstall, portable and path-limit checks.

- Setup SHA-256: a6ab30fa2c8efb63d5ffb15d0410fca5172cec2510b56783cd3debdc24f91ecf
- Portable ZIP SHA-256: 8456038bf13d205cf27f416c6458d52a5ba4fdcf59166185b11b51048ccbf98a

Candidate only, unsigned, no public release. Beta 3's five assets and Beta 4's six assets match retained IDs, sizes, timestamps and digests. V1.2.5 remains HOLD. MCP remains 1.1.0 / protocol 2 / 108 tools, including combine_as_variants; all three approved runtime hashes are unchanged. The user-modified reference JPG is untouched and excluded from commits.

## Continuity and next work

Private detailed evidence is under .figma-designer/presence/recovery/ and is not required in a fresh clone to understand these constraints. The accepted original outcome remains UNVERIFIED permanently unless new attributable evidence is separately established; never replay it.

No more Figma authoring is needed for this task. Confirm all four CI conclusions on the final documentation head before issuing the final milestone marker. Recommended next work: enforce artifact-read-only Browser Test orchestration, then make an explicit fidelity-adapter policy decision about fractional strokes; do not weaken thresholds or silently change source designs.

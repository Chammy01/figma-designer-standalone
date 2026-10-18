# User-accepted current Figma state — V1.5.0 recovery

The explicit confirmation resolves a workflow lock. It does not establish what happened to the old request.

## Contract

`POST /api/run/:id/accept-current-state` requires same-origin JSON with `confirmation: "KEEP_CURRENT_FIGMA"`. Only the latest FAILED / RECONCILIATION_REQUIRED run qualifies, with no task, provider operation, session creation, reconciliation checkpoint or other resolution in progress.

The UI presents Check Again and Keep Current Figma & Continue. A separate confirmation explains that the old request will not be retried. Cancel makes no change. Technical details remain collapsed.

## Durable ordering

1. Construct a candidate with recovery USER_ACCEPTED_CURRENT_STATE, manualResolution `{type, at}`, and a fresh acceptedWorkspaceId. The live run and uncertainty lock remain unchanged.
2. Atomically save the candidate. Failure leaves the old recovery/session and lock intact.
3. Apply the saved candidate while retaining run.state FAILED; clear uncertainty.
4. Replace the old workspace/session boundary. Create an empty OpenCode session without submitting any prompt. If creation fails, the boundary remains empty and the next fresh request must create its own session. Restart also discards the old session for an accepted run.

Reconciliation and its checkpoint are serialized against acceptance. No engine.submit, MCP operation or Figma write occurs in the resolution path. The original input is not used as continuation context.

Recovery store v2 retains up to 50 metadata-only runs, reads existing v1 records, validates acceptance metadata, and retains the accepted unverified record after later completed tasks. Prompts, output, credentials and tool payloads are not persisted. History reconstructs one uncertainty entry and one acceptance entry; it never calls the old request completed or retry-safe.

## Activity

Before: RECOVERING — I couldn't confirm the last change.

After: IDLE — I'll continue from the design that's currently in Figma.

Journal: Outcome Unverified; Resolution Kept current Figma state. Advanced fields: recovery USER_ACCEPTED_CURRENT_STATE, runState FAILED, resolutionSource USER, originalOutcome UNVERIFIED.

## Validation

Deterministic tests cover availability, latest/exact ID, confirmation and cancel, active/provider/session/checkpoint concurrency, zero submission/MCP writes, durability ordering and failure, session-creation outage, fresh requests, restart with later completed history, privacy, and same-origin guards. Live acceptance and exact-head hosted CI are pending; milestone remains HOLD until recorded.

Original run: a700300a-db2f-45d8-944b-02c20964745b. Original outcome remains UNVERIFIED. Never replay it or borrow evidence from older completed tasks.

MCP 1.1.0 / protocol 2 / 108 tools is unchanged. V1.2.5 remains HOLD. Beta 3 and Beta 4 remain immutable. Native protected-page recapture must be reported UNVERIFIED_TIMEOUT if it still fails; disposable-page integrity is separate.

## Live evidence so far (2026-10-19, Asia/Manila)

Normal Check Again retained RECONCILIATION_REQUIRED. The explicit confirmation recorded USER_ACCEPTED_CURRENT_STATE while the old run stayed FAILED/UNVERIFIED. A new empty session was established. The resolution itself left the disposable page unchanged: one root1053:1059, 314nodes, fingerprint8830fd4bdf16f232d830301db8ea11d8b793375b7e67713461edf7d44aed4c79. No submit/replay/MCP write occurs in this path.

Fresh task a70990e6-b264-421b-b777-be6dc06e4e6b completed through INSPECTING, DESIGNING, CHECKING and COMPLETED. Only text1053:1108 changed from Overview to Project Overview (including the setter’s native text-layer rename). No nodes were added/removed. Operation dbc900fad658f9cbcb7ef04a54bf3a10 read back COMMITTED, applied1/failed0.

QA f6f50284-860e-4121-8008-6d1ef54d3969 completed with truthful canonical FAIL: the disposable visual dashboard has no Interactive App runtime. It made zero writes; before/after fingerprint7b41848fd6a5263b775efd12811f19e6822090b1efa92d236ec4c9d8c77d0e52 matched. The finding is not repaired or relabeled. Browser acceptance therefore reads the existing runtime1023:1802 on Page1 rather than adding prototypes to the dashboard. Fresh protected-page recapture succeeded with the original fingerprinta68cfd586576aa6f2d199c8edd4e46c541b5d7e9a22508a16781e8fff3712be6.

Offline current-source checks:587npm contracts;328plugin;153hardening/variants/source;8browser integration;9fidelity fixtures;30app/validation/presence UI. Go tests/vet and isolated source/release/privacy/runtime checks passed. An initial motion-timing sample and an image-load assertion failed under concurrent package load; a full rerun passed. The image assertion now waits for native image decode, with no product or fidelity-threshold change. Earlier package attempts were blocked by a running DLL or superseded by final source; candidate rebuild/restart and exact-head CI remain pending.

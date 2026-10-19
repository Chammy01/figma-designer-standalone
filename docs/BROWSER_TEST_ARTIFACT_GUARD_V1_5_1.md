# Browser Test artifact-read-only guard — V1.5.1

## Contract

**Browser Test observes; it never repairs, regenerates or formats inputs.** Following a security audit, the workspace operates under an explicit user-authorized workspace-wide positive capability restriction:

1. The exact approved 108 Figma catalog operations remain available for direct design and prototyping work.
2. Finite bounded file mutation tools (`write`, `edit`, `patch`) are permitted exclusively during active Browser Build sessions, restricted to the prototype directory, and forbidden from modifying collector-owned source snapshots (`figma-source.json`).
3. Arbitrary shell-based Build source capture and binding scripts are replaced by fixed no-argument tools: `figma_browser_build_begin` and `figma_browser_build_finish`.
4. Generic shell, Code Mode `execute`, Node, PowerShell, delegation, formatters, and unknown tools are denied across ALL workspace sessions.
5. Natural OpenCode Browser Test is restricted to safe read tools and the fixed no-argument `figma_browser_test_report` tool once per turn.
6. Application `BROWSER_TEST` executes the canonical runner directly, bypassing model interaction while preserving `workspaceSessionId`.

Test failures are findings, not repair authorization. Fidelity conversion, comparator thresholds, native source, semantic motion, reaction behavior, MCP and releases are unchanged.

Audit and preimplementation analysis: [preimplementation audit](BROWSER_TEST_ARTIFACT_GUARD_AUDIT_V1_5_1.md).
## Enforcement boundaries

- **Application BROWSER_TEST direct bypass model:** Explicit `BROWSER_TEST` runs the fixed `scripts/browser-test-canonical.mjs` launcher directly. It bypasses model prompt execution entirely, preserves `workspaceSessionId`, and does not let a model repair or regenerate files first. The runner child process communicates over IPC, holding its TEST lease through teardown, live source collection, before/after SHA comparison, and trusted application policy finalization until acknowledgement (`browserTestAck`). The structured report remains available even when browser acceptance is FAIL.
- **Natural OpenCode manual/AUTO workflow:** Persistent session guard activates after intent routing. Only safe inspection tools (`read`, `glob`, `grep`, `question`, critique reads) and the no-argument `figma_browser_test_report` tool are permitted. Execution and permission hooks reject every other tool before dispatch. At most one test execution is allowed per guarded turn.
- **Workspace-wide capability profile (`rules/browser-workspace-capabilities.mjs`):** OpenCode tool transforms strip generic shell, Code Mode `execute`, Node, PowerShell, delegation, formatters, and unknown tools across all sessions in the workspace. All remaining tools have `codemode: false`.
- **Finite Build file mutations:** The `write`, `edit`, and `patch` tools are restricted strictly to active Build sessions (`isBuild(sessionID)`). All mutation targets are validated: they must lie inside `.figma-designer/browser-prototype/` as `PROTECTED_INPUT`. The collector-owned source snapshot `figma-source.json` is explicitly denied for model-authored mutations. Patch payloads must conform strictly to `*** Begin Patch` / `*** End Patch` with explicit `*** (Add File|Update File|Delete File|Move to): <path>` directives.
- **Fixed Build source tools:** Fixed no-argument tools `figma_browser_build_begin` and `figma_browser_build_finish` replace arbitrary shell invocations, ensuring Figma remains read-only and source snapshots are written exclusively by collector logic.
- **Formatter execution disabled at highest priority:** The owned-engine configuration injects `OPENCODE_CONFIG_CONTENT` with `formatter: false`. Because this environment variable outranks project and global configuration files, formatters cannot execute after file writes. If an unmanaged engine lacks this setting, the Build-write precondition fails closed.
- **Lease-atomic mutating callbacks:** Every mutating operation (file mutation and Figma mutation) acquires an atomic shared Build-write member lease (`acquireBrowserBuildWrite`) and releases it in `finally`. Admission is atomic with TEST at the execution boundary.
- **Bounded diagnostic exporters:** Native export operations `figma_save_screenshots` (max 64 items) and `figma_export_frames_to_pdf` are authorized only for diagnostic destinations under `.figma-designer/browser-test/`, and are strictly prohibited from writing over the canonical report `figma-browser-test.json`.
- **Freeze and cross-process lease:** Cross-process browser-artifact lease (`.figma-designer/browser-artifacts.lock`) is acquired before inventory and SHA capture. It is retained through browser/server teardown, final source read, integrity comparison, report persistence, and trusted application-policy finalization. Launcher IPC acknowledges final policy evidence before the runner releases its lease.
- **Integrity backstop:** Complete protected inventory and SHA-256 before/after comparison. No contents are stored in snapshots and no changed input is silently restored. Contradictions between acceptance and integrity fail closed.

Deterministic product boundary: This is a deterministic product/workflow capability boundary, not an operating-system sandbox against unrelated same-user programs or a developer editing the repository outside the product. Such unexpected input drift is reported by the hash backstop, not silently undone. No retrospective historical shell certification is claimed for earlier detached runs.
## Path inventory

All paths are workspace-relative.

| Path | Classification / owner |
| --- | --- |
| `.figma-designer/browser-prototype/index.html` | PROTECTED_INPUT; Build |
| `.figma-designer/browser-prototype/styles.css` | PROTECTED_INPUT; Build |
| `.figma-designer/browser-prototype/app.js` | PROTECTED_INPUT; Build, including embedded motion runtime |
| `.figma-designer/browser-prototype/figma-browser.json` | PROTECTED_INPUT; finalized manifest, screen/control/motion metadata and source binding |
| `.figma-designer/browser-prototype/figma-source.json` | PROTECTED_INPUT; collector projection, export identity and fingerprint |
| Every other prototype file, including `assets/**`, future metadata, fingerprints, snapshots, scripts and temporary-looking names | PROTECTED_INPUT; never an implicit Test output |
| `.figma-designer/browser-prototype/figma-browser-test.json` | WRITABLE_TEST_OUTPUT; exact canonical report only |
| `.figma-designer/browser-test/screenshots/start-screen.png` | WRITABLE_TEST_OUTPUT; actual canonical start-screen capture |
| `.figma-designer/browser-test/screenshots/[a-z0-9-]{1,80}.png` | WRITABLE_TEST_OUTPUT; bounded diagnostic screenshot names |
| `.figma-designer/browser-test/diagnostics/[a-z0-9-]{1,80}.{json,log,zip}` | WRITABLE_TEST_OUTPUT; explicitly allowed diagnostic formats, not source evidence |
| `.figma-designer/browser-test/temporary/[a-z0-9-]{1,80}.tmp` | TEMPORARY_TEST_OUTPUT; currently no canonical scratch file is required |
| OS temporary `playwright_chromiumdev_profile-*`, `playwright-artifacts-*` | TEMPORARY_TEST_OUTPUT; Playwright-owned browser profile/artifacts, cleaned on normal browser close |
| Native screenshot buffers | TEMPORARY_TEST_OUTPUT; in-memory reference capture, never a source rewrite |
| `.figma-designer/app/recovery.json`, `.figma-designer/app/events.json` | Application-owned orchestration output, separate from frozen browser inputs |
| `.figma-designer/browser-artifacts.lock/` | Coordination metadata; not a model-writable Test output |

Protected and allowed output sets do not overlap. The exact report exception does not exempt nested files with the same basename, backup files, `.tmp` files inside the prototype tree, assets or unreferenced local files. Diagnostic directories are outside the tree so screenshots cannot invalidate local artifact freshness.

## Normalization and authorization

Central implementation: `rules/browser-test-artifact-guard.mjs`.

Normalize Windows separators, workspace-relative paths and `.` segments; canonicalize existing ancestors with `realpath`. Compare Windows paths case-insensitively. Reject parent traversal, outside-workspace absolute paths, UNC/device paths, alternate streams, trailing-dot/space ambiguity and reserved Windows names. Reject symlinks/junctions and hardlinked files rather than guessing their effects. Existing and not-yet-created destinations follow the same policy. Move/rename/copy authorization checks both source and destination.
Generic shell, Code Mode, Node, and PowerShell tools are denied workspace-wide across all sessions, not filtered by command keywords. Consequently redirection, Node filesystem calls, PowerShell file APIs, formatter scripts, and copy/rename replacement cannot execute through any session tool. They are tested on disposable fixture paths, never against the production export. Unknown operations fail closed even if their arguments look harmless.

Only trusted runner/application output code calls `writeBrowserTestOutput`, which revalidates the destination before writing. Browser Build authorization is distinct and cannot write through an active TEST lease. Mutating callbacks hold atomic shared Build-write leases through `finally`.
## Build → freeze → test

1. Explicit Build may capture source, generate browser output and finalize manifest binding.
2. Build completes and releases its narrow BUILD lease. A source capture failure remains unavailable/stale; Test does not fix it.
3. Test acquires TEST exclusion; missing required inputs or ambiguous paths fail capture.
4. Enumerate every protected input, in stable path order. Store relative path, byte size and SHA-256.
5. Run the existing browser, source-freshness, motion and fidelity checks.
6. Close browser/server and finish live source inspection while still frozen.
7. Repeat inventory/hash capture; compare paths, sizes and hashes, including additions/deletions.
8. Persist structured results and allowed diagnostics, then release exclusion. Model interpretation cannot authorize any repair.

Atomic directory creation provides cross-process exclusion, not a global app mutex. Nested Build source collectors keep the parent lease alive until they finish. There is no timeout-based lease stealing. An abandoned or unreadable lease fails closed; do not delete it until ownership/in-flight work has been independently established. Restart never uses a lease as authorization to replay Build or Test.

## Structured result

```json
{
  "artifactIntegrity": {
    "status": "UNCHANGED | CHANGED | UNVERIFIED",
    "protectedFileCount": 5,
    "changedFileCount": 0,
    "changedFiles": [],
    "blockedWriteAttempts": 0,
    "blockedWriteEvidence": []
  },
  "artifactSnapshots": {
    "before": { "status": "CAPTURED", "files": [] },
    "after": { "status": "CAPTURED", "files": [] }
  },
  "policyCode": null
}
```

Each snapshot file contains only `relativePath`, `size`, `sha256`. Changed-file metadata is bounded to 64 rows with before/after size/hash or null; `changedFileCount` retains the total. No file contents are included. Capture failure is UNVERIFIED, never UNCHANGED. A protected change forces FAIL and `BROWSER_TEST_ARTIFACT_INTEGRITY_VIOLATION`. Unverifiable capture/finalization forces FAIL and `BROWSER_TEST_ARTIFACT_INTEGRITY_UNVERIFIED`. Denied mutations force policy FAIL with `BROWSER_TEST_ARTIFACT_WRITE_BLOCKED`, even when protected bytes remain UNCHANGED. A competing Build/Test returns `BROWSER_ARTIFACTS_BUSY` and cannot overwrite the active runner's report.

Blocked evidence, at most 32 records plus a numeric total:

```json
{
  "workflow": "BROWSER_TEST",
  "category": "WRITE",
  "relativePath": ".figma-designer/browser-prototype/index.html",
  "blocked": true,
  "timestamp": "ISO-8601",
  "operationClass": "WRITE"
}
```

Categories are allowlisted. `relativePath` is either a fixed known input or null, never an echoed arbitrary argument. No commands, contents, prompts, credentials, reasoning or absolute machine paths are recorded. Late denied repairs cannot trigger another runner; they update only the report from their own completed test, with matching generation identity.

## Agent Studio and restart

Normal presentation remains CHECKING: **“I'm testing the preview and comparing it with the design.”**

Blocked mutation primary: **“I stopped a change to the test files.”** Detail: **“The test evidence needs to stay unchanged so the result remains trustworthy.”** Technical policy codes stay in advanced/error details, not primary copy.

Only new fixed-runner checks carry `CANONICAL_BROWSER_TEST_V1_5_1` execution provenance. Their bounded structured integrity/validation survives restart without replay. An interrupted fixed check is UNVERIFIED; historical model-orchestrated Browser Test recovery remains quarantined under the existing reconciliation semantics. No legacy indeterminate request is relabeled safe.

## Observed initial smoke evidence

The canonical live runner returned exit 1 / FAIL with `artifactIntegrity.status = UNCHANGED`, five protected inputs, zero changed files and zero blocked attempts. The report and a 118,733-byte start-screen PNG were produced without modifying inputs. Source/local/overall freshness remained CURRENT. Fidelity remained FAIL with exactly five MEDIUM stroke-width findings; the first normal-motion NAV_DEFAULT intermediate-frame sample remained FAIL. Native/render pixel parity remained UNVERIFIED.
| Protected input | Bytes | SHA-256 before = after |
| --- | ---: | --- |
| `app.js` | 12840 | `3aa33bb103e705a0325eac74571977b3aff3593c1e929a3533e0f0d2e63b8ba9` |
| `figma-browser.json` | 23360 | `6a1bc790fa74fc66782117e7f4b70f57cd2b5ed260be1162ef7662cbf459c6f4` |
| `figma-source.json` | 5124512 | `c2842ee98ef6dcafffdfb15e86b49325f81ba1bc27ffe4f8446302144eb1ca4f` |
| `index.html` | 111884 | `d47c951cc01b612780e182afe516bb07caf3aae9bf1878d3399ed19bd8b005c4` |
| `styles.css` | 3139 | `ab4d184d11c152ab729ac8bef6610424a3681ac833624ff7158294a5fdc9f518` |

These hashes identify the initial guarded smoke before the separately requested fresh Build source-binding phase; they are not substituted for later acceptance evidence.

## Scope invariants

MCP remains 1.1.0 / protocol 2 / 108 tools, with `combine_as_variants`. No MCP catalog, native runtime, fidelity threshold, motion timing or source conversion policy is changed. V1.2.5 remains HOLD. No release publication, Beta 3/4 modification or obsolete external harness integration is part of this milestone.

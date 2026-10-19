# Browser Test artifact guard audit — V1.5.1

## Scope and evidence

Audited baseline: `6a0695d0318b447829596ec13131f77270ee8e32`. OMP is the external development harness. Product execution uses OpenCode; browser verification uses Node/Playwright. No MCP/runtime/protocol, fidelity conversion or motion change is authorized.

Following security finding, user explicitly authorized a workspace-wide positive capability restriction: preserve the exact approved Figma catalog authoring (108 operations) plus finite bounded file mutation tools (`write`, `edit`, `patch`), replace Build shell collection by fixed no-argument `figma_browser_build_begin` and `figma_browser_build_finish` tools, and deny generic shell/CodeMode/Node/PowerShell/delegation/unknown tools across ALL workspace sessions.

Deterministic product boundary: no operating-system sandbox is claimed against external same-user programs. No retrospective historical shell certification is claimed for earlier detached runs. Existing unrelated user-owned dirty `design-references/1.5-agent-studio/bedroom-base.jpg` remains untouched.
## Audit questions

| Question | Verified answer |
| --- | --- |
| 1. Build entrypoint | App `BROWSER` → `OpenCodeClient.submit` → `/api/session/:id/command`, name `figma/browser`; manual `/figma/browser`. Build shell collection is replaced by fixed no-argument tools `figma_browser_build_begin` and `figma_browser_build_finish` (aliasing `beginExport`/`finishExport`). Model authoring of `index.html`, `styles.css`, `app.js`, and `figma-browser.json` uses finite `write`/`edit`/`patch` tools scoped strictly to `.figma-designer/browser-prototype/`. `figma-source.json` is collector-owned and strictly forbidden from model-authored file mutations. |
| 2. Test entrypoint | App `BROWSER_TEST` bypasses model execution entirely and runs the fixed canonical launcher `scripts/browser-test-canonical.mjs` directly. In OpenCode manual `/figma/browser-test` and AUTO routing, the session uses the fixed no-argument `figma_browser_test_report` tool once per turn. |
| 3. Build ownership | `index.html`, `styles.css`, `app.js`, `figma-browser.json`, collector-owned `figma-source.json`, and necessary local `assets/`, all beneath `.figma-designer/browser-prototype/`. |
| 4. Immutable Test inputs | Every file under the prototype tree except the exact canonical report. This includes source evidence, unused assets and auxiliary files, not merely manifest references. |
| 5. Current writable outputs | Canonical report `.figma-designer/browser-prototype/figma-browser-test.json`, diagnostic screenshots (`.figma-designer/browser-test/screenshots/[a-z0-9-]{1,80}.png`), and bounded diagnostic artifacts (`.figma-designer/browser-test/diagnostics/[a-z0-9-]{1,80}.(json|log|zip|pdf)`). Diagnostic outputs live strictly outside the protected prototype directory. |
| 6. Model tools | Workspace-wide finite capability profile (`rules/browser-workspace-capabilities.mjs`): tools are positively allowlisted across all sessions. Only safe read tools (`read`, `glob`, `grep`, `question`, critique reads), the exact 108 approved Figma tools, finite file mutation tools (`write`, `edit`, `patch`) for active Build sessions, and fixed tools (`figma_browser_test_report`, `figma_qa_report`, `figma_browser_build_begin`, `figma_browser_build_finish`) exist. All other tools are removed. |
| 7. Mutation-capable tools | Generic shell, Node, PowerShell, Code Mode `execute`, delegation, formatters, and unknown tools are stripped and denied across ALL sessions in the workspace. Finite `write`/`edit`/`patch` tools are restricted strictly to active Build sessions (`isBuild(sessionID)`) targeting the prototype directory with disabled formatter execution. |
| 8. Generic shell | Denied workspace-wide. Neither Build nor Test nor design sessions have access to generic shell, bash, cmd, exec, or terminal tools. Build source capture and binding use dedicated fixed tools rather than shell scripts. |
| 9. File API bypasses | Shell-based file API bypasses (Node fs, PowerShell, redirection, replacement copy/rename/delete) are closed by stripping shell tools completely. File mutations through `write`, `edit`, and `patch` are validated path-by-path against the prototype root, rejecting `figma-source.json`, traversals, links, and device names. |
| 10. Build/regeneration from Test | Blocked at tool transform, execute.before hook, and permission evaluate hook. Test turns permit only safe reads and the fixed test tool. No shell or delegation tools exist to spawn regeneration. |
| 11. Concurrency | Atomic lock directory `.figma-designer/browser-artifacts.lock` with `owner.json` tokens and member leases `build-<uuid>.lease`. Build sessions hold BUILD exclusion; mutating callbacks acquire an atomic member lease released in `finally`. Test holds TEST exclusion across freeze, teardown, and trusted report persistence until IPC ACK. |
| 12. Previous eight edits | `docs/USER_ACCEPTED_CURRENT_STATE_V1_5_0.md:67–71` records eight historical edit-tool calls before final runner invocation under earlier unconstrained sessions. No retrospective historical shell certification is claimed for past runs; the new finite capability profile prevents pre-test mutation moving forward. |
| 13. Strongest boundary | App invokes `scripts/browser-test-canonical.mjs` directly (bypassing model execution, preserving `workspaceSessionId`). OpenCode natural Test allows only safe reads and the fixed once-per-turn `figma_browser_test_report` tool. Fixed no-argument source `begin`/`finish` replace shell scripts. Formatter is disabled at highest priority in owned-engine configuration, and unmanaged engines fail closed. |
| 14. Reusable precedent | Critique/QA persistent per-session storage, activation after intent routing, steering/queued-turn retention, direct non-Code-Mode tools, `execute.before` rejection and permission denial. Browser workspace capabilities integrate with existing session hooks and atomic lease controls. |

## Exhaustive artifact classification

Paths below are workspace-relative. Pattern rules are exhaustive: no unrecognized file beneath the prototype tree is exempted. A file being unexpected is not permission to overwrite it.

| Path / object | Classification | Ownership |
| --- | --- | --- |
| `.figma-designer/browser-prototype/index.html` | PROTECTED_INPUT | Build |
| `.figma-designer/browser-prototype/styles.css` | PROTECTED_INPUT | Build |
| `.figma-designer/browser-prototype/app.js` | PROTECTED_INPUT | Build; embeds generated motion runtime |
| `.figma-designer/browser-prototype/figma-browser.json` | PROTECTED_INPUT | Build final source binding, screens, controls, motion registry and runtime metadata |
| `.figma-designer/browser-prototype/figma-source.json` | PROTECTED_INPUT | Build source collector; projection, fingerprints, exportRunId |
| `.figma-designer/browser-prototype/assets/**` | PROTECTED_INPUT | Build assets and any associated exported metadata |
| Any other file/directory beneath `.figma-designer/browser-prototype/`, except exact report | PROTECTED_INPUT | Includes generated scripts, source snapshots, fingerprints, runtime manifests, motion/state registries, screen/asset metadata, temporary-looking names and future files |
| `.figma-designer/browser-prototype/figma-browser-test.json` | WRITABLE_TEST_OUTPUT | Canonical Test only; excluded from input hashing |
| Native screenshot buffers and browser ephemeral context/profile | TEMPORARY_TEST_OUTPUT | Browser test; no approved source-evidence rewrite |
| `.figma-designer/app/recovery.json`, `.figma-designer/app/events.json` | WRITABLE_TEST_OUTPUT | Application orchestration metadata, not generated browser inputs; existing app-owned writes remain separate |
| `.figma-designer/app/qa-result.json` | BUILD_ONLY_OUTPUT | Separate QA workflow; Browser Test does not write it |
| Runner/rules/package files and offline fidelity goldens | BUILD_ONLY_OUTPUT | Repository development inputs, never writable by Browser Test |

There is no separate on-disk generated motion registry today: `scripts/figma-browser-motion-runtime.mjs` supplies runtime source embedded in `app.js`; motion declarations live in the manifest. Both generated representations are protected. All source collector disk writes occur in Build `beginExport` / `finishExport`; `collectLiveSource` itself performs bridge reads, not source file writes.

The scout's suggestion to exempt `*.tmp`/`*.partial` inside the prototype tree was rejected: current runner creates none, and that would overlap future protected inputs. No UNKNOWN classification remains.

## Existing runner and integrity gap

`artifactHashes` (`scripts/figma-browser-freshness.mjs:26–40`) recursively binds every file except the exact report, rejects symlinks and outside-root real paths. It hashes contents but not file sizes and does not reject hardlink aliases. Runner captures at line 121 and compares at lines 324–325, before browser/server teardown and final source collection. Errors can skip that comparison. The report has no `artifactIntegrity` structured field. Thus existing hashing is useful as freshness evidence but neither prevents pre-run model repairs nor covers the full Test lifetime.

Fidelity (`scripts/figma-browser-fidelity.mjs`) reads the bound projection and measures DOM/CDP; native captures remain in-memory. Motion (`scripts/figma-browser-motion-check.mjs`) inspects browser state. Neither module owns filesystem repairs. Preserve these implementations and thresholds.

## Enforcement contract

1. Central implementation in `rules/browser-test-artifact-guard.mjs` and `rules/browser-workspace-capabilities.mjs`.
2. Workspace-wide finite capability profile: editor transform strips generic shell, Code Mode `execute`, Node, PowerShell, delegation, formatters, and unknown tools across ALL workspace sessions. Permitted tools are strictly: safe reads (`read`, `glob`, `grep`, `question`, critique reads), exact approved 108 Figma operations, finite file tools (`write`, `edit`, `patch`) under active Build sessions, and fixed tools (`figma_browser_test_report`, `figma_qa_report`, `figma_browser_build_begin`, `figma_browser_build_finish`).
3. Fixed Build source capture (`figma_browser_build_begin`) and binding (`figma_browser_build_finish`) tools accept only empty inputs `{}` and execute collector-owned operations. Model file mutations cannot write `figma-source.json`.
4. All mutating callbacks (`write`, `edit`, `patch`, Figma mutating operations) hold atomic shared Build-write member leases (`acquireBrowserBuildWrite`) through execution `finally`.
5. Formatter execution is disabled at highest priority in owned-engine configuration (`OPENCODE_CONFIG_CONTENT` with `formatter: false`). If an unmanaged engine lacks this setting, Build file mutations fail closed.
6. Direct canonical BROWSER_TEST bypass model: App `BROWSER_TEST` runs `runCanonicalBrowserTest` directly without model execution, preserving `workspaceSessionId`. OpenCode natural Test allows only safe reads and the fixed no-argument `figma_browser_test_report` tool once per turn.
7. The test runner process retains its TEST lease through browser/server teardown, live source collection, before/after SHA comparison, and trusted application policy finalization until IPC acknowledgement (`browserTestAck`).
8. Missing inputs or capture failures yield UNVERIFIED and cannot PASS. Any protected input change yields `BROWSER_TEST_ARTIFACT_INTEGRITY_VIOLATION`. Contradictions between acceptance and integrity fail closed.
9. Path normalization enforces case-insensitive Windows comparisons, canonicalizes ancestors, and rejects parent traversal, drive/UNC/device/ADS names, symlinks/junctions, and hardlink aliases.
10. Bounded diagnostic exporters (`figma_save_screenshots` up to 64 targets, `figma_export_frames_to_pdf`) must target `.figma-designer/browser-test/` and are strictly forbidden from writing over the canonical report.
## Truth to preserve

The saved live report is FAIL: five MEDIUM `PROPERTY_strokeWidth` findings, plus one NAV_DEFAULT normal-motion intermediate sample at endpoint opacities. Native/render pixel parity is UNVERIFIED. The prior direct rerun demonstrated unchanged five-file hashes, not model-turn immutability. V1.2.5 remains HOLD; published Beta 3/4 and MCP 1.1.0 / protocol 2 / 108 tools remain untouched.

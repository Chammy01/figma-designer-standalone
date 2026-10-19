# Native Orca removal audit

Baseline: `0c513890cad08dc923fdb5a5f75e0f8b502c52cf`. No Git history or published Beta 3/4 assets may be rewritten. Inventory precedes deletion. Native Orca was not executed.

## Authoritative architecture

OMP is the external developer harness, not the product runtime. Native Orca is obsolete; agents must not search for, install, invoke or require it. Its absence is expected, not a blocker.

Product: Figma Designer App → OpenCode → Figma Designer workflows → Figma Designer MCP → Figma Desktop plugin.

Browser validation: Figma Designer → local Node/Playwright browser pipeline. Current generated state is `.figma-designer/`; browser artifacts are `.figma-designer/browser-prototype/` and use `data-figma-app`, `data-figma-screen`, `data-figma-node`, `data-figma-destination`.

## Classification and dependency decisions

A = active legacy dependency; B = obsolete active file; C = generated/ignored state; D = historical documentation; E = release/provenance history; F = unrelated substring. Explicit statements that Native Orca is obsolete/not required are retained as architectural exclusions, not dependencies.

| Path / occurrence group | Class | Purpose and reference relationship | Replacement / decision |
| --- | --- | --- | --- |
| `orca.ps1` (all occurrences, including `ORCA_*`, native command discovery, `.orca`, `orca-browser*`, `data-orca-*`, old ownership names and command output) | B | Standalone legacy command dispatcher; references old agent and native browser. No application/runtime/setup caller executes it. Included by active allowlists only. | Remove entire script after allowlist/config cutover; no compatibility wrapper. Use App/OpenCode workflows and existing Node browser runners. |
| `.opencode/agents/web-designer.md` | A/B | Orca-branded primary agent, selected by both OpenCode configs and required by setup. | Migrate section-by-section construction/inspection and completion guidance to canonical `figma-designer`; remove obsolete file. |
| `opencode.json`, `opencode.example.json` (`default_agent`) | A | Select removed legacy agent for ordinary chat. | Select `figma-designer`; preserve model, MCP path, numeric timeout and connector alias. |
| `setup.ps1` required files | A | Requires obsolete agent even though current runtime does not need it. | Require canonical agent only; preserve existing-config safety. |
| `scripts/setup.test.ps1` fixture files | A | Copies obsolete agent into setup scenarios. | Remove obsolete fixture input; prove setup on restricted PATH with no Native Orca variables. |
| `scripts/release-check.ps1` config policy | A | Requires obsolete default-agent name. | Check canonical agent; preserve model/timeout policy. |
| `scripts/figma-intent-router.test.mjs` other-agent example | A | Uses removed agent as an unrelated routing example. | Use generic built-in `build` example; preserve routing behavior. |
| `docs/SOURCE_ALLOWLIST.json`, `docs/RELEASE_ALLOWLIST.json` | A | Ship obsolete script and agent; desktop payload consumes release allowlist. | Remove both entries; include removal audit. No published assets changed. |
| `docs/ARCHITECTURE.md`, `docs/COMMANDS.md`, `docs/INSTALLATION.md` | A | Current-facing instructions retain old default and both architectures. | Document single canonical agent and current runtime, separate OMP developer harness. |
| `AGENTS.md`, `.opencode/agents/figma-designer.md`, `.opencode/commands/figma/{browser-test,doctor,setup,version}.md`, `rules/figma-standalone-rules.md` | exclusion | Explicitly say Native Orca is not required or must not be invoked. | Retain/strengthen architectural exclusion; no Native Orca discovery or installation guidance. |
| `.gitignore` `.orca/` | C | Prevents accidental inclusion of retired generated state. | Retain as explicitly retired state exclusion, not a supported output directory. |
| `scripts/package-release.ps1` forbidden `.orca` path | exclusion | Rejects legacy state from package inputs. | Retain explicit rejection; it is not a runtime dependency. |
| `scripts/figma-browser-test.mjs` `nativeOrcaRequired: false` | exclusion | Legacy branding in current report; no consumer found in repository search. | Remove obsolete report field; preserve schema/version, results and QA/fidelity semantics. |
| `docs/SOURCE_CONTENTS.json`, `docs/SOURCE_INVENTORY.json`, `docs/RELEASE_INVENTORY.json`, `docs/SOURCE_PROVENANCE.json`, `docs/PRIVACY_FINDINGS.json` | E | Frozen original Beta source/release inventory, hashes, provenance and privacy findings. They describe original bytes, not current package inputs. | Preserve historical records and hashes; label their historical scope where ambiguous. Active package truth is current allowlists and freshly generated payload inventory. |
| `vendor/figma-mcp/internal/tools_schema_test.go` COMPONENT_SET extension comment | E | Historical upstream attribution in pinned runtime source. | Preserve pinned upstream source; no catalog/variant changes. |
| `.opencode/skills/impeccable/scripts/live-browser.js` (`ForCapture`, `ErrorCard`) | F | Case-insensitive substring matches in unrelated capture/error UI symbols. | Preserve unrelated code. |

## Removal plan and invariants

1. Audit repository dependencies and local ownership; report local findings before deletion.
2. Migrate valid legacy design discipline into canonical agent; change both config defaults and their setup/release consumers. Remove obsolete agent/script and active package entries.
3. Remove confirmed generated legacy state and safely attributable local Native Orca-only installation/config; preserve ambiguous files, OMP/OpenCode/MCP/plugin data and historical evidence. Remove only exact attributable PATH entries; never escalate privileges.
4. Run application, Studio, recovery, provider/model, Browser Build/Test, fidelity, QA/critique, desktop/package/source setup/privacy/plugin/Go tests and Go vet. Exercise actual app/MCP/browser/package surfaces without Native Orca. Preserve existing truthful FAIL findings and HOLDs.
5. Classify remaining matches, obtain independent read-only review, update continuity, commit/push and require exact-head `node-contracts`, `plugin`, `go`, `desktop` success. No release publication.

## Local audit and verification

Pre-removal audit found the per-user Native Orca installation at `%LOCALAPPDATA%/Programs/orca`, CLI launchers under `resources/bin`, updater `%LOCALAPPDATA%/orca-updater`, profile `%APPDATA%/orca`, hooks `%USERPROFILE%/.orca/agent-hooks`, and `%APPDATA%/Microsoft/Windows/Start Menu/Programs/Orca.lnk`. The exact CLI-only User PATH entry was present; Machine PATH had none. No Native Orca startup-folder entry or scheduled task was found. A daemon PID record was stale: live process inspection before removal found no running Native Orca executable.

Removed those installation/updater/profile/hook/shortcut paths without executing Native Orca or its uninstaller, and removed only the exact matching User PATH entry. Removed the confirmed stale per-user uninstall registration `HKCU/Software/Microsoft/Windows/CurrentVersion/Uninstall/2b325ec9-0ed1-575f-ad70-e08307aee879` after checking DisplayName and exact uninstaller path. No elevation used.

Additional confirmed Native Orca-only active integrations removed:
- `%USERPROFILE%/.omp/agent/extensions/{orca-agent-status,orca-prefill,orca-titlebar-spinner}.ts` (auto-loaded status/prefill/spinner bridges only; OMP retained).
- `%USERPROFILE%/.config/opencode/plugins/orca-opencode-status.js` and `orca-opencode-status-tui/tui.js` (OpenCode retained).
- `%USERPROFILE%/.codex/hooks.json` (all nine hooks targeted the removed Native Orca wrapper), plus exactly their nine trust records in `config.toml`; the project Graphify hook trust record, canonical Codex auth/sessions and other config remain.
- The eleven Native Orca hook registrations in `%USERPROFILE%/.qoder/settings.json`; unrelated providers, model, MCPs and project trust remain.

User/Machine `ORCA_*` variables were absent. The inherited OMP process marker `ORCA_PI_STATUS_OWNED` was cleared from the smoke/verification process environment; fresh children use no `ORCA_*`. The already-running parent harness cannot have its OS environment retroactively changed, so restart it to unload its previously loaded extensions. Native hook endpoint files contained additional `ORCA_AGENT_HOOK_*` names, now removed with their owner directories. No current product configuration consumes them.

Command discovery after cleanup resolved zero `orca`, `orca.exe`, `orca.cmd` or `orca.ps1` commands. The independently located `E:/Orca` project workspace and unrelated checkouts were preserved. Repository `.orca/` state was absent. Removed the audited disposable `.figma-designer/overlays/clean-node-source/` source-setup fixture (not a live product installation or published asset); adjacent overlay evidence is preserved. Current generated package workspaces are rebuilt below; historical previous-recovery unpacked evidence and external published Beta assets remain untouched.

Desktop upgrade migration removes only the two formerly shipped regular files (`orca.ps1` and `.opencode/agents/web-designer.md`) from the writable workspace, refusing links/directories. This prevents an upgrade from leaving a second discoverable agent. It preserves `.figma-designer/` output and all recovery/user data. Literal filenames in this migration and absence regression checks are removal records, not executable dependencies.

Baseline count definition: 12 tracked active/obsolete caller, config, packaging and current-instruction paths contain 334 matching lines for `orca|web-designer` (including two explicit non-dependency exclusion statements); 332 lines are removal targets. The ignored local `opencode.json` adds one legacy default-agent line. The obsolete root script accounts for 319 matching lines. Historical inventory/provenance records, explicit exclusion statements and unrelated substrings are excluded from active dependency counts.

Unrelated modified `design-references/1.5-agent-studio/bedroom-base.jpg` is excluded from all changes and commits.

Requested role models cannot be selected by this OMP task dispatcher: its model override is restricted to historical consultation and no `plan` role is installed. Available OMP reconnaissance/reviewer/task roles are used; no Native Orca coordination tool is invoked.

## Post-removal reference classification

Repository-wide case-insensitive search was repeated after source cutover. Active legacy dependencies: **0**; no current runtime, setup or workflow invokes Native Orca. Searches of `app`, `desktop`, `scripts`, `rules`, `.opencode`, setup and package configuration found no `ORCA_CLI_COMMAND`, `ORCA_DEV_REPO_ROOT`, `data-orca-*` or `orca-browser` implementation.

| Remaining group | Classification / reason |
| --- | --- |
| `AGENTS.md`, canonical agent, setup/doctor/browser-test/version instructions, architecture/installation/standalone rules | Explicit obsolete/not-required prohibition, not an installation or discovery instruction. |
| This audit, changelog and `ai-memory/` task/handoff/decision records | Removal/migration history, retaining the evidence needed to explain the cutover. |
| `desktop/policy.mjs`, `scripts/figma-desktop.test.mjs` | Explicit removal migration and upgrade regression: delete/check absence of formerly shipped files; never run them. |
| `scripts/setup.test.ps1`, `scripts/source-bootstrap.test.ps1`, `scripts/desktop-smoke.mjs`, `scripts/figma-browser-integration.test.mjs` | Absence regression: scrub retired variables, resolve-only checks or verify obsolete files excluded from actual archive/package. No command invokes Native Orca. |
| `.gitignore`, `scripts/package-release.ps1` | Explicit retired-state exclusion to prevent reintroduction into source/packages. |
| Source/release allowlist reference to this audit | Ships migration documentation, not a runtime file. |
| `docs/{SOURCE_CONTENTS,SOURCE_INVENTORY,RELEASE_INVENTORY,SOURCE_PROVENANCE,PRIVACY_FINDINGS}.json` | Historical original Beta provenance/inventory/privacy records. Entry hashes preserved; ambiguous inventory scope labels explicitly historical. |
| `vendor/figma-mcp/internal/tools_schema_test.go` | Historical upstream COMPONENT_SET attribution; pinned source preserved. |
| `.opencode/skills/impeccable/scripts/live-browser.js` | F: `ForCapture` / `ErrorCard` substrings, unrelated to Native Orca. |

No remaining match is an ambiguous active dependency. Historical `release-staging/previous-recovery-unpacked-*` evidence and external published release folders are not current workspace/package inputs and are preserved.

The independent advisor identified an existing-source configuration gap: preserving
an old `web-designer` default after deleting that agent could falsely report setup
readiness. Fixed with a narrow one-time `-Configure` migration of that exact field;
without the flag setup fails with an explicit migration instruction. The regression
uses an existing config with a custom model, timeout and user setting and verifies
that every unrelated value survives. Re-review: `ORCA_REMOVAL_REVIEW: PASS`.

The live local bridge exposed a pre-existing test-isolation issue: synthetic browser
fixtures attempted real Figma source reads and hit their child deadline. Their
child-only Node preload now rejects that exact live-source RPC endpoint; browser
behavior, artifact binding and truthful unavailable-source reporting are still
exercised. No production timeout, collector, QA rule or fidelity threshold changed.

## Exercised verification

All verification child environments omit `ORCA_*`; Native Orca launchers are absent.

| Gate | Observed result |
| --- | --- |
| Application, Agent Studio activity, manual recovery, provider/model, QA/critique, browser contracts, desktop policy | `npm test`: 588 passed, 0 failed. |
| Plugin | Bun 1.4.2: 328 passed; additional hardening/variants/live-source: 153 passed. |
| Go | `go test -count=1 ./...` and `go vet ./...`: PASS. |
| Browser integration/motion | 8 passed with restricted PATH and no retired variables. |
| Browser fidelity/goldens | 9 passed; thresholds and baselines unchanged. |
| App/validation/Studio UI | All 30 cases exercised passing across focused runs; Studio's final 13-case run passed after deleting an incidental copy assertion and awaiting settled recovered send enablement. No production UI/recovery change. |
| Setup fixtures | 33 scenarios passed, including existing obsolete-default migration, no-executable PATH, corruption and missing-source/toolchain failures. |
| Real source bootstrap + release ZIP extraction/setup | PASS from isolated Git tree `a1b4875cc62c5e30b15bfab790c6272df987cf75`; exact approved runtime builds, canonical agent, obsolete-file exclusion, repeated setup and 232-entry ZIP. |
| Clean built-source release checks/privacy | PASS: JSON/PowerShell/JS checks, runtime hashes, binary privacy, config preservation/migration and mismatch stop gate. |
| Standalone MCP executable | PASS: 1.1.0 initialization, 108 tools, `combine_as_variants`, five invalid reaction requests rejected before plugin dispatch. |
| Installed OpenCode config/timeout | Test assertion passed on 2.0.28 with numeric 10000 preserved; its initial outer wrapper later hit its process deadline after printing PASS (descendant-held output pipes); verification wrapper corrected, no timeout policy change. |
| Desktop package | Built installer/portable candidate only, not published. 794-file inventory/privacy/runtime validation PASS; obsolete-file gate PASS. |
| Packaged desktop startup | PASS with System32-only PATH/no retired variables: READY engine, VERIFIED runtime, single-instance behavior, zero startup tasks, owned service/engine shutdown. |
| Independent advisor | `ORCA_REMOVAL_REVIEW: PASS`; existing-config gap fixed and re-reviewed. |
| Graphify | Refreshed after structural cutover; latest pre-commit rebuild: 4,269 nodes / 8,395 edges / 288 communities. Generated output remains ignored. |

The first clean-source attempt lacked the documented OpenCode launcher on PATH;
the final run used the already-installed local OpenCode and Bun toolchain, not
Native Orca. A release-check run over the dirty developer workspace encountered
pre-existing BOM/empty generated evidence JSON; those unrelated files were
preserved, and the complete release checks passed against clean built source.

Live source App smoke launched with the product's bundled OpenCode executable
and showed READY/VERIFIED/CONNECTED without Native Orca. The first live Browser
Build stopped on unavailable plugin reads; restoring the Figma window restored
bridge health without code/timeout changes. A second smoke request was interrupted
when its supervised service unexpectedly exited 127. Native context contained only
its user event after the saved offset; supported interruption reported inactive.
The user explicitly authorized the existing Keep Current Figma confirmation:
old run `6b819bcd-8356-4343-8c4f-578b3d2ed574` remains FAILED with
USER_ACCEPTED_CURRENT_STATE, not a completed or safely replayed request. A fresh
workspace/session was created through the normal UI, without editing recovery
metadata or replaying the interrupted request. Fresh run
`0718248c-0b22-432b-a2be-e3af890a6929` produced both runtime screens and all four
browser artifacts but did not settle within the bounded watch. It was stopped
through the app's supported native interruption and settled CANCELLED with no
recovery lock. Valid output was preserved; the confirmed missing canonical
`figma-browser-source.mjs finish` step then completed successfully, binding export
`5c776a54-d466-40c3-891a-0938e8d540f9` to stable source fingerprint
`129cd01193e0d6d52a3c992380c48ed41650ea372316dadbd30d22ece81fcd27`.

The live generated preview was visually inspected and pointer navigation exercised.
A glyph-background defect in generated CSS was repaired only in ignored browser
output (native TEXT fills are glyph colors, not rectangular backgrounds). The
canonical embedded motion runtime, QA/fidelity algorithms and thresholds were not
changed.

Final direct Browser Test executed without Native Orca and reported source/local/
overall freshness CURRENT, two screens, 617 nodes, 199 text nodes and 38 controls.
Pointer/Enter navigation, history, deep links, control ownership, reduced motion,
local-resource isolation and unchanged artifact hashes passed. Canonical overall
result remains **FAIL**: the five previously known MEDIUM fractional stroke-width
findings remain, and the first NAV_DEFAULT normal-motion intermediate sample
reported opacity endpoints rather than an intermediate frame. The other three
motion cases passed. No result was relabeled and no timing/threshold was changed.
Native pixel/render parity remains UNVERIFIED; this removal does not certify
browser visual or native-pixel parity.

Live read-only QA returned **WARN**: two runtime screens, 46 meaningful controls,
2 WORKING_ACTION and 44 UNKNOWN_EXPECTATION; no broken edges/controls, one
journey-start limitation. Six read calls and zero writes; document unchanged.
Critique/QA guard regressions remain included in the passing contract suite.

Final native page fingerprint in the product's Node runtime matches the original
protected value exactly:
`a68cfd586576aa6f2d199c8edd4e46c541b5d7e9a22508a16781e8fff3712be6`.
The old accepted run remains FAILED/UNVERIFIED, the later cancelled run remains
CANCELLED, and no interrupted request was replayed. Local smoke model selection
used the normal product selector; the shared configured model is unchanged.

Implementation commit `413a41305c4882af7090f52202ec25ece66ace79` passed all four
hosted jobs in [run 39210955888](https://github.com/Chammy01/figma-designer-standalone/actions/runs/39210955888):
`node-contracts`, `plugin`, `go`, `desktop`. Desktop CI includes installer,
upgrade/uninstall and portable extraction. Final documentation-head CI is a
separate exact-head gate; this source-head result is not substituted for it.

Owned smoke tabs/services were closed after an idle/unlocked application status;
their isolated service/engine ports are no longer listening. Throwaway smoke/
verification scripts and the temporary Git index were removed; evidence logs and
reports remain ignored. The original local source-smoke model preference was
restored after shutdown; shared model/default configuration and credentials were
not changed by smoke model selection.

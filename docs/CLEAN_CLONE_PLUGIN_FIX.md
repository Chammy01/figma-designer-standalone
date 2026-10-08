# Clean-clone Figma plugin setup fix

Prepared 9 October 2026 (Asia/Manila).

## Observed failure and root cause

The real clean-clone tester imported the correct development manifest. Figma failed with `Unable to load code`, `web:getLocalFileExtensionSource`, and `ENOENT` because `vendor/figma-mcp/plugin/dist/code.js` did not exist. Generated assets are intentionally omitted from Git. Hosted CI built them, but setup only checked for them and did not prepare them.

## Changes

- `setup.ps1`: prepare missing plugin assets using Bun 1.4.2, frozen dependencies, and the existing source build; verify the canonical dispatcher hash; preserve an existing approved dispatcher; stop readiness instructions after any failure; print the actual manifest path.
- `README.md`, `docs/QUICKSTART.md`, `docs/INSTALLATION.md`, `docs/TROUBLESHOOTING.md`, `docs/DEVELOPMENT.md`: explain automatic preparation, pinned tool recovery, and plugin-environment troubleshooting.
- `.opencode/commands/figma/doctor.md`: inspect local plugin assets/hash before connection checks, with missing-runtime recovery and no Figma writes.
- `.opencode/commands/figma/setup.md`: report missing assets and direct the user to project setup.
- `scripts/setup.test.ps1`, `scripts/release-check.ps1`: offline setup regression fixtures and source/release-check integration.
- `.github/workflows/test.yml`: require the canonical dispatcher hash after the pinned CI build.
- `docs/SOURCE_ALLOWLIST.json` and this report: include the setup regression and evidence record.

## Source checkout and release ZIP behavior

An absent dispatcher causes setup to check complete build inputs, require the CI-pinned Bun version, run `bun install --frozen-lockfile` and `bun run build` in the plugin folder, require output, and verify SHA-256. Users normally rerun setup rather than build manually. Missing Bun prints the exact official pinned installation command, then a setup recovery command. Failed dependencies/build, missing output, and hash mismatch never print the final import/readiness instructions.

An existing dispatcher is hashed and preserved. No Bun version check, dependency install, or rebuild runs on this path. An unapproved existing dispatcher fails without replacement. The existing complete-runtime hash checks still require the MCP executable and UI to match their approved hashes.

Git also omits the MCP executable. This fix preserves that separate prerequisite: plugin preparation can succeed while full setup exits nonzero for the missing executable. It does not establish complete beginner onboarding or approve a newly built executable.

## Dispatcher verification

Canonical metadata: `docs/APPROVED_RUNTIME.json`, release `v1.2.1-beta.1`.

Required dispatcher SHA-256: `24bb648c96cc7288938e87aedc07f44de48d9ea25fe9f19f3256633c31dad849`.

Required UI SHA-256: `661fb49dd3ca38ed4648e70858822f59f565093718d02143c6b1b85628f054ee`.

Approved metadata, runtime source, lockfiles, existing release binaries, runtime semantics, timeouts, and the original development project are preserved.

## Verification

Local verification on Windows x64, Node 24.15.0, Bun 1.4.2, and Go 1.26.1:

| Check | Result |
| --- | --- |
| Node contract/freshness tests | 21 PASS |
| Installed OpenCode Node test (2.0.24) | 1 PASS; actual executable supplied, no skipped test |
| Plugin source suite | 275 PASS / 515 assertions |
| Hardening/variants/live-source source suites | 67 PASS / 195 assertions |
| Plugin source build, repeated | PASS; both dispatcher and UI byte-identical and equal to approved hashes |
| Built-dispatcher regressions | 67 PASS / 195 assertions |
| Go tests and vet | PASS |
| Offline setup regressions, Windows PowerShell 5.1 | 11 PASS; every fixture path contains spaces |
| Release source checks | PASS; configuration creation/preservation, invalid configuration, syntax, source files, setup fixtures, packaging mismatch stop |
| Release package checks | PASS; all three exact runtime hashes and binary privacy |
| New disposable release ZIP | PASS; 127 allowlisted entries, copied-file and ZIP-entry hashes verified |
| Real fresh source setup | PASS for plugin preparation; documented full setup command also exits 0 after the separate approved MCP executable prerequisite is supplied |
| Extracted new ZIP setup with Bun absent | PASS; all approved runtime hashes and modification times unchanged |
| Optional browser integration suite | 6 PASS from a path without spaces; see existing test-runner limitation below |

Two fresh tracked-source archives were extracted into new folders containing spaces and overlaid only with this change. Neither had generated plugin assets or installed dependencies. In the first, setup built and verified the approved plugin while correctly exiting 1 for the independently missing MCP executable. It printed no final import instructions. In the second, only the separately required approved packaged MCP executable was supplied; the full documented command `powershell -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1 -Configure -InstallDependencies -InstallBrowser` installed dependencies, built and verified the plugin, and exited 0 with the actual import path. No dispatcher was copied into either source fixture.

The new ZIP was extracted into another folder containing spaces. Bun was removed from that test process's PATH. The documented full setup command exited 0 and left the executable, dispatcher, and UI hashes and modification times unchanged. Offline release fixtures also assert no Bun invocation on the approved-existing-dispatcher path, and require a clear failure with no final readiness instructions for missing tool/source/output/hash metadata, failed installation/build, wrong tool version, or existing/new hash mismatch.

The optional browser integration test has an existing path limitation: it converts a file URL via `.pathname` without decoding spaces. Its six tests failed before producing their reports when launched from the source fixture containing spaces, then all passed from an equivalent fixture with no spaces. This release/setup fix does not change the browser runner, runtime semantics, or freshness logic. Setup's own space-containing-path coverage passes.

The original approved release ZIP still matches its existing checksum: `0df597ff96a126c5d91010e9b97a7dbbd883c5e016cd3abfff0e09d89b0fa045`. The approved executable/dispatcher/UI still match canonical metadata. The original development project was not accessed or changed. All real builds and package/setup simulations ran in disposable trees; generated assets and installed dependencies are excluded from the repository commit.

## Remaining live retest

The user must rerun setup and import/run the plugin in Figma Desktop. Actual Figma loading, provider sign-in, and overall clean-clone onboarding are not marked PASS by this report.

CLEAN_CLONE_PLUGIN_FIX: PASS

# Full source bootstrap — v1.2.1-beta.1

## Problem and root cause

Git intentionally excludes the MCP executable and plugin dist assets. Setup already built the missing pinned plugin dispatcher but previously required an independently supplied executable, so a clean clone could not complete installation. GitHub's automatic Source code ZIP has the same omissions.

## Chosen architecture and behavior

Setup selects behavior from actual files, with no source/release flag. An existing executable must match the approved fixed SHA-256 and is preserved without invoking Go. An absent executable requires complete known repository Go inputs and Go 1.26.1 for Windows x64; setup builds only the known package under `vendor/figma-mcp`. Links/junctions in Go source/output paths are refused. Build output is temporary, verified before installation into `bin/figma-mcp-go.exe`, and removed on failure. Incomplete source, missing/wrong toolchains, failed builds, and mismatches exit nonzero without readiness instructions.

Plugin bootstrap retains Bun 1.4.2, the frozen lockfile, and `bun run build`. Missing dispatcher or UI triggers preparation; an existing mismatched dispatcher is rejected before any rebuild. All three runtime hashes must pass. Configuration uses the current installation's executable, including paths with spaces, and existing configuration is preserved.

The official `Figma-Designer-v1.2.1-beta.1-Windows.zip` includes approved runtimes and needs neither Go nor Bun. An arbitrary source marker or local receipt cannot exempt any file from verification. Doctor checks missing/unapproved runtime separately from unavailable MCP tools and a disconnected Figma plugin; it never builds.

## Toolchains and canonical command

Normal requirements: Windows x64, Node.js 20+ with npm, OpenCode, Figma Desktop, and dependency/provider internet access. Source bootstrap additionally needs **Go 1.26.1 windows/amd64** (`go.mod` and CI) and **Bun 1.4.2** (CI). Setup does not install either toolchain or download opaque executable artifacts. Go downloads module dependencies using its pinned module/checksum inputs.

In `vendor/figma-mcp`, with `CGO_ENABLED=0`, Windows amd64, and default GOAMD64=v1:

```powershell
go build -trimpath -buildvcs=false -ldflags "-X main.version=1.2.0-standalone-hardening" -o ../../bin/figma-mcp-go.exe ./cmd/figma-mcp-go
```

Setup uses an equivalent temporary output path and normalizes/restores relevant Go environment settings, disables workspace overrides, and requires the locally installed toolchain (no automatic Go upgrade).

Documented installation, from the clean clone or extracted source archive:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1 -Configure -InstallDependencies -InstallBrowser
```

## Runtime verification and reproducibility

The approved executable SHA-256 remains `bc9eec0d9a9cddd20e27331a41319a59b84bd51f88a78e59885b901456562f3f`. Two canonical non-Git archive builds, with compiler-cache cleaning between builds, reproduced it exactly. An ordinary Git build included VCS revision/time/dirty metadata and produced `aa41af2429b59aff5f5e1453c0882920f8bee778058c8d1d1a854107c028b189`. Explicit `-buildvcs=false` reproduced the approved SHA from Git source too. This makes the existing release command's non-Git metadata explicit without altering runtime source or semantics.

Both source-built and packaged installations therefore use the **same exact approved SHA-256**. There is no weaker source receipt/version policy. The plugin dispatcher and UI retain their approved hashes. Packaging/privacy checks remain strict and independent; checksum identity is not a publisher signature.

## Tests and acceptance

`scripts/setup.test.ps1` covers real setup orchestration with isolated native-tool stubs: missing Go, wrong Go, incomplete source, a single spoof marker, failed/partial Go output, missing output, source hash mismatch, corrupt prebuilt executable, plugin dependency/build/toolchain/source/output/hash failures, a missing UI, paths with spaces, and source/release idempotence. Stubbed tests never substitute for real builds.

`scripts/source-bootstrap.test.ps1 -OutputRoot <fresh external folder>` archives tracked source, checks all three runtime files are initially absent, runs only the documented setup command, checks runtime/configuration, repeats setup, packages using the canonical script, extracts a fresh ZIP, and runs setup with fail-on-call Go/Bun sentinels. CI runs it with actual pinned build tools and the documented OpenCode prerequisite. No runtime artifacts are manually copied into the source fixture.

Disposable source acceptance: **PASS** on 2026-10-09 (Asia/Manila). A staged-tree Git archive was extracted into a separate disposable folder with spaces. All three runtime files were absent beforehand. Only the documented setup command was run: real Go and Bun builds, npm ci, and Chromium installation all passed. `Test-Path` for the executable, dispatcher, and UI returned True/True/True. Generated config pointed to that disposable executable. Repeated setup preserved config/runtime hashes and performed no rebuild.
Release ZIP regression: **PASS**. The canonical packaging script built a fresh 128-entry candidate from the verified disposable source-built runtime and current source files. A separate fresh extraction passed the same setup procedure and repeated setup. Go/Bun were absent from the test PATH, replaced by fail-on-call sentinels; neither was called. All approved runtime hashes and the extraction-local config path passed. Packaged users therefore need neither build toolchain.
Regression suite:

- Node contract/freshness: 21/21 PASS.
- Plugin source units: 275/275 PASS; pinned plugin build PASS.
- Hardening/variants/live source: 67/67 PASS from source and 67/67 PASS against the built dispatcher.
- Go `go test -count=1 ./...` and `go vet ./...`: PASS.
- Setup fixtures: 20 scenarios PASS, including repeated source/release setup and paths with spaces.
- Source and packaged release checks: PASS (JSON/PowerShell/JS syntax, config preservation, corruption stop gates, exact artifact hashes).
- Binary privacy scanner self-check and source-built/packaged executable scans: PASS.
- MCP initialization/version, 106-tool catalog/schema comparison, combine_as_variants presence, and five invalid-reaction probes: PASS against the repeated canonical build.
- Reproducibility: two clean archive builds and the explicit no-VCS Git build matched the existing approved executable SHA. Real setup builds matched it too.
- Installed OpenCode 2.0.24 config/timeout compatibility: 1/1 PASS using the disposable setup-generated config (the initial invocation skipped, then the configured check was run).
- Browser integration: 0/6 PASS locally. Both Node 24.15.0 and the available Node 24.19.0 abort at process shutdown with the Windows libuv `UV_HANDLE_CLOSING` assertion after writing browser reports. The unchanged pre-task source archive in a path without spaces reproduces the same 6 failures, establishing that this predates the setup change. Browser code and policy were left unchanged as requested.


## Files changed

- `setup.ps1`, `.gitignore`: source preparation and generated-artifact guidance.
- `scripts/setup.test.ps1`, `scripts/source-bootstrap.test.ps1`, `.github/workflows/test.yml`: offline fixtures and real source/release acceptance.
- `.opencode/commands/figma/doctor.md`, `.opencode/commands/figma/setup.md`: runtime/connector/plugin guidance.
- `README.md`, `docs/QUICKSTART.md`, `docs/INSTALLATION.md`, `docs/DEVELOPMENT.md`, `docs/TROUBLESHOOTING.md`: supported source installation and normal-user ZIP guidance.
- `docs/APPROVED_RUNTIME.json`, `docs/RELEASE_PACKAGING.md`: explicit reproducible build metadata and unchanged exact-hash verification.
- `docs/SOURCE_ALLOWLIST.json`, `docs/RELEASE_ALLOWLIST.json`, `docs/SOURCE_BOOTSTRAP.md`: deliverable inclusion and this audit/acceptance report.

## Remaining limitations

The source install is intentionally pinned to Go 1.26.1 Windows x64 and Bun 1.4.2 for exact release identity. Modified runtime source or a different compiler must not be activated through release setup. Source builds need network access or warm module/package caches. Go/Bun are installed separately. Existing config with an old path needs a focused manual path correction. Existing plugin TypeScript declaration/typecheck issues remain outside this setup change; a full TypeScript check was not rerun. The pre-existing local browser-suite shutdown assertion remains unresolved under this task's explicit browser-behavior freeze.

Offline acceptance establishes local installation readiness, not a live Figma/provider session or the overall public-beta release gate. A real user-side clean-clone/Figma test, release publication, and owner launch decisions remain separate.

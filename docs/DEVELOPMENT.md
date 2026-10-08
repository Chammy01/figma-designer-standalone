# Development

Use the source candidate for contributions, not the normal user ZIP. Tool versions for this candidate: Node 24.15.0 (runtime minimum 20), Go **1.26.1** from go.mod, Bun **1.4.2**. Keep existing dependency versions and lockfiles.

## Supported source installation

A Git clone or GitHub Source code ZIP can become a complete local installation. Install Go 1.26.1 for Windows x64, Bun 1.4.2, and the normal Node/npm/OpenCode prerequisites. From the source root run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1 -Configure -InstallDependencies -InstallBrowser
```

Setup builds missing MCP and plugin artifacts and requires their exact approved SHA-256 hashes. Existing approved files need no toolchain and are not rebuilt. Modified runtime source is intentionally rejected by release onboarding; contributor experiments require deliberate separate activation. See [SOURCE_BOOTSTRAP](SOURCE_BOOTSTRAP.md).

## Regression suites

From the source root:

```powershell
npm ci
npm test
npm run test:hardening
npm run test:source
npm run test:browser
```

The browser integration suite uses isolated fixtures/Chromium, not a live Figma document. Install Chromium with `npm run figma:install-browser` first. Root contract/freshness, hardening/variants, and live-source tests use mocks/local state. A fresh source checkout omits generated plugin assets. Build them with the committed lockfile before dispatcher verification:

```powershell
Push-Location vendor/figma-mcp/plugin
bun install --frozen-lockfile
bun run build
Pop-Location
$env:FIGMA_PLUGIN_BUNDLE = (Resolve-Path vendor/figma-mcp/plugin/dist/code.js).Path
bun test scripts/figma-hardening.test.ts scripts/figma-variants.test.ts scripts/figma-live-source.test.ts
Remove-Item Env:FIGMA_PLUGIN_BUNDLE
```

Plugin dependencies and suites:

```powershell
Push-Location vendor/figma-mcp/plugin
bun install --frozen-lockfile
bun test
Pop-Location
```

Go suites:

```powershell
Push-Location vendor/figma-mcp
go test -count=1 ./...
go vet ./...
Pop-Location
```

Syntax: `node --check scripts/<file>.mjs` for each root JS/MJS file. Parse all project JSON (excluding installed dependencies). Parse PowerShell via `System.Management.Automation.Language.Parser.ParseFile` without running legacy scripts. Existing plugin TypeScript `tsc --noEmit` has baseline declaration/type errors; report them rather than silently disabling correctness checks or promising a clean typecheck.

## Deliberate runtime builds

Setup normally handles this build. To reproduce it manually, create `bin`, set `$env:CGO_ENABLED = '0'`, and run in `vendor/figma-mcp` using Go 1.26.1 for Windows x64:

```powershell
go build -trimpath -buildvcs=false -ldflags "-X main.version=1.2.0-standalone-hardening" -o ../../bin/figma-mcp-go.exe ./cmd/figma-mcp-go
```

Plugin `bun run build` rebuilds UI and core. Setup uses this path only when the dispatcher is absent, with Bun 1.4.2 and the frozen lockfile, and requires the existing approved dispatcher hash. It preserves an already approved dispatcher without rebuilding. UI/core hashes must remain the exact approved ones for this beta. The explicit VCS flag reproduces the release's non-Git metadata without changing executable semantics. Repeated canonical builds match the approved executable SHA exactly; setup therefore uses the same fixed SHA gate for source and release installations. Packaging retains its independent exact-hash and privacy gates. See [packaging](RELEASE_PACKAGING.md). Never install a new pair into a working user project without deliberate activation and rollback verification.

Offline setup regressions: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup.test.ps1`. Release source checks also run them. Fixtures exercise missing source assets, preserved release assets, failed dependencies/build, missing build output/tool/source/hash metadata, wrong Bun version, hash mismatches, and paths containing spaces. Native build commands are stubbed; the separate clean-source test must prove the real pinned build and approved hashes.

## CI

Offline suites run without Figma Desktop. CI separately pins Node, Bun, and Go and checks contracts, freshness, plugin units, the freshly built dispatcher, Go tests/vet, syntax, and source release-engineering checks. No model/provider invocation or live write is needed. See [Contributing](../CONTRIBUTING.md).

`scripts/release-check.ps1 -Mode Source` (the default) checks source files/configuration/syntax and packaging failure guards without requiring generated release artifacts. `scripts/release-check.ps1 -Mode Release -RuntimeRoot <approved-runtime-folder>` additionally requires the executable, dispatcher, and UI with every hash in APPROVED_RUNTIME.json and executable privacy checks. Packaging also takes all three approved runtime artifacts from RuntimeRoot and retains its exact hash, allowlist, privacy, and ZIP gates. A successful CI build is regression evidence, not approval to replace a release artifact; see [CI build verification](HOSTED_CI_FIX.md).

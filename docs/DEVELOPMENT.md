# Development

Use the source candidate for contributions, not the normal user ZIP. Tool versions for this candidate: Node 24.15.0 (runtime minimum 20), Go **1.26.1** from go.mod, Bun **1.4.2**. Keep existing dependency versions and lockfiles.

From the source root:

```powershell
npm ci
npm test
npm run test:hardening
npm run test:source
npm run test:browser
```

The browser integration suite uses isolated fixtures/Chromium, not a live Figma document. Install Chromium with `npm run figma:install-browser` first. Root contract/freshness, hardening/variants, and live-source tests use mocks/local state. Packaged dispatcher verification:

```powershell
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

The source candidate omits the MCP executable. For local development only, create `bin` and run in vendor/figma-mcp:

```powershell
go build -trimpath -ldflags "-X main.version=1.2.0-standalone-hardening" -o ../../bin/figma-mcp-go.exe ./cmd/figma-mcp-go
```

Plugin `bun run build` rebuilds UI and core. Do not run it to recreate the approved release artifacts: the UI/core hashes must remain the exact activated ones for this beta. A locally rebuilt executable is not automatically approved for release. Use the validated sanitized public executable and unchanged approved plugin assets with [packaging](RELEASE_PACKAGING.md). Never install a new pair into a working user project without deliberate activation and rollback verification.

## CI

Offline suites run without Figma Desktop. CI separately pins Node, Bun, and Go and checks contracts, freshness, plugin units, packaged dispatcher, Go tests/vet, syntax, and release-engineering self-checks. No model/provider invocation or live write is needed. See [Contributing](../CONTRIBUTING.md).

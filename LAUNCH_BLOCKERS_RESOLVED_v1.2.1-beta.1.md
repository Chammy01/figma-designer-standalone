# Launch blockers resolved — v1.2.1-beta.1

Prepared 9 October 2026 (Asia/Manila). Scope was limited to the four requested release blockers plus packaging/privacy/regression validation. No publication or live Figma write occurred.

## Root license

**RESOLVED: MIT** for project-owned code/docs. Standard root LICENSE is included in source/release allowlists and the ZIP. README, third-party notice index, release notes, contributor guidance, and docs/LICENSE_DECISION.md are updated. Third-party texts/copyrights remain intact; root MIT does not claim their ownership.

## Sanitized executable

**PASS**. Exact unchanged approved vendor source, pinned upstream `5806e71b8fd4bad97671038a0b010f04df1aaa41`; no upstream/dependency update, mass formatting, or runtime semantic change. Go `go1.26.1 windows/amd64`, `CGO_ENABLED=0`, build:

```powershell
go build -trimpath -ldflags '-X main.version=1.2.0-standalone-hardening' -o <staging>/bin/figma-mcp-go.exe ./cmd/figma-mcp-go
```

Old SHA-256: `7ef0688e0dccf1abc52b0fd903b9bb2f907af898b548f73a419d9daded574ccb`.

New SHA-256: `bc9eec0d9a9cddd20e27331a41319a59b84bd51f88a78e59885b901456562f3f`.

No private compiler/user/checkout paths remain in ASCII or UTF-16. Module/standard-library relative paths and public certificate URLs are acceptable. One raw `E:/` fragment is nonprintable encoded data, not a path. The unchanged 106-tool catalog/schema, initialization/version, combine_as_variants, and malformed-reaction responses match the old executable. Go tests/vet and safe regressions pass before packaging. The installed original pair is unchanged.

## Skill engine

**REMOVED_FROM_PUBLIC_RELEASE_NOT_REQUIRED**. Engine 0.1.11, both download launchers, and /impeccable are removed from candidate/ZIP. Active skill instructions are archived; source-only references are inactive; original Apache LICENSE/NOTICE remain. All core Figma commands and agents operate through the MCP/plugin/Node paths without this optional engine. Actual OpenCode discovery and extracted setup pass without it. No opaque binary remains in public source/package. See [audit evidence](docs/SKILL_ENGINE_AUDIT.md).

## Security reporting

**POLICY PREPARED; POST-PUBLIC TOGGLE REQUIRED**. SECURITY.md routes ordinary bugs/setup to Issues and suspected vulnerabilities to GitHub's private Report a vulnerability flow once enabled. No email is invented. **Enable GitHub Private vulnerability reporting immediately when repository visibility becomes public.** Setting path: Repository → Settings → Security and quality / Advanced Security → Private vulnerability reporting → Enable. The setting has not been enabled; no public repository was created.

## Release ZIP

`E:/GitHub/figma-designer-release/Figma-Designer-v1.2.1-beta.1-Windows.zip`

**12686769 bytes; 127 entries**.

SHA-256: `0df597ff96a126c5d91010e9b97a7dbbd883c5e016cd3abfff0e09d89b0fa045`.

Fresh staged package, regenerated SHA256SUMS/RUNTIME_SHA256SUMS, complete allowlist/entry/hash audits, packaged executable probe, and extracted setup all pass. The sole distributed executable is the new sanitized MCP; plugin assets remain the approved bytes.

## Privacy, tests, and remaining actions

Text/config privacy passes with no real credentials, private Figma URLs, personal filesystem identity, or original-checkout references. All distributed binaries have acceptable provenance/notices and no private build paths. Before/after original inventory: **4,642 files; zero changes/additions/removals**.

Required safe regressions pass: npm 21; hardening/source/variants 67 (source and bundle independently); plugin 275; Chromium fixtures 6; Go tests/vet; PowerShell/JSON/20 JS-MJS syntax; release checks; allowlist/ZIP/extraction audits; MCP comparisons; actual command discovery; extracted setup. The old optional timeout fixture is skipped, and prior TypeScript baseline diagnostics remain documented. No hosted CI, live Figma, provider request, or clean-machine trial was performed.

Manual actions: post-public security toggle; separately authorized repository/CI/release publication; clean Windows/provider/design trial. [Full readiness](RELEASE_READINESS_v1.2.1-beta.1.md), [machine-readable validation](docs/RELEASE_VALIDATION.json), and [launch checklist](docs/LAUNCH_CHECKLIST.md) record the limits.

PUBLIC_BETA_LAUNCH_BLOCKERS: PASS

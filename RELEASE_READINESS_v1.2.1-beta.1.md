# Release readiness — v1.2.1-beta.1

Prepared 9 October 2026 (Asia/Manila). The four requested public-launch blockers are resolved in the candidate. No Git initialization, repository creation/push, publication, or live Figma writes occurred. GitHub private reporting is prepared, not enabled.

## License

The owner-selected standard root **MIT License** is present and included in source/release allowlists and the ZIP. README, contributor guidance, release notes, and LICENSE_DECISION reflect the resolved decision. Root MIT applies to project-owned code/docs; Figma MCP MIT, anti-ai-slop-ui MIT, retained Impeccable Apache-2.0 material, and other dependency notices remain separate. Original third-party license/notice texts are unchanged.

## Sanitized MCP

Go **1.26.1 windows/amd64**, unchanged pinned vendor source at `5806e71b8fd4bad97671038a0b010f04df1aaa41`, unchanged dependencies/checksums, and preserved custom variants/hardening/transport/timeouts. Build from vendor/figma-mcp:

```powershell
$env:CGO_ENABLED = '0'
go build -trimpath -ldflags '-X main.version=1.2.0-standalone-hardening' -o <staging>/bin/figma-mcp-go.exe ./cmd/figma-mcp-go
```

Old approved executable SHA-256: `7ef0688e0dccf1abc52b0fd903b9bb2f907af898b548f73a419d9daded574ccb`.

New approved public executable SHA-256: `bc9eec0d9a9cddd20e27331a41319a59b84bd51f88a78e59885b901456562f3f` (24,238,592 bytes).

The executable was built in separate staging and approved for packaging after passing regressions. No installed executable was replaced, and no binary bytes were redacted. Runtime version remains `1.2.0-standalone-hardening`; Go build metadata is `(devel)` without VCS stamping in the non-Git candidate, with `trimpath=true`. Initialization, all **106 tool schemas**, custom `combine_as_variants`, and five malformed-reaction responses exactly match the old approved build. Both source/packaged probes use isolated port 0 without connecting a Figma plugin.

Plugin core SHA-256 remains `24bb648c96cc7288938e87aedc07f44de48d9ea25fe9f19f3256633c31dad849`; UI remains `661fb49dd3ca38ed4648e70858822f59f565093718d02143c6b1b85628f054ee`. Manifest, vendor source, dependency pins, motion/reaction semantics, source/fingerprint versions, model/default agent, and numeric timeout 10000 remain unchanged.

## Optional engine

**REMOVED_FROM_PUBLIC_RELEASE_NOT_REQUIRED**. The opaque Impeccable engine, two download launchers, and optional command are removed; its active skill entry is archived as reference-only. The ZIP retains only its LICENSE/NOTICE. Core Figma commands do not call it. OpenCode actually discovers 15 Figma commands, both agents, and anti-ai-slop-ui without it after its asynchronous registry settles. The original working project retains the engine. See [dependency/reachability audit](docs/SKILL_ENGINE_AUDIT.md).

## Privacy and provenance

The public candidate contains no opaque compiled skill engine; the only distributed executable is the sanitized MCP. Complete text/config scanning identifies no real credentials, private Figma URL, personal machine path, or original-checkout path. Synthetic fixture paths and generic release locations are intentionally classified; public copyright identities remain intact.

ASCII and aligned/unaligned UTF-16 scans find no private builder/user/source/Go workspace paths in the public executable. A single raw `E:/` byte fragment immediately followed by a nonprintable byte is encoded data, not a filesystem string. Public module paths, relative standard-library filenames, and certificate URLs are acceptable. The scanner rejects the old executable and accepts the packaged one. See [privacy evidence](docs/PRIVACY_SCAN.md) and [binary verification](docs/PUBLIC_BINARY_VERIFICATION.json).

Original preservation: before/after inventory of **4,642 files**, **0 added, 0 removed, 0 changed**, including dependencies/history/nested Git files. The original was only read/hashed. Atlas was not inspected or modified. Validation dependencies and private staging are excluded from the final public candidate.

## New package

ZIP: `E:/GitHub/figma-designer-release/Figma-Designer-v1.2.1-beta.1-Windows.zip`.

Size: **12686769 bytes**; **127 entries**.

SHA-256: `0df597ff96a126c5d91010e9b97a7dbbd883c5e016cd3abfff0e09d89b0fa045`.

Built from fresh staging with scripts/package-release.ps1 under Windows PowerShell 5.1. SHA256SUMS and RUNTIME_SHA256SUMS were regenerated. Every ZIP/extracted entry matches the exact allowlist and source/runtime hashes. No optional engine, downloader, private evidence, test suite, installed dependency, source build tree, or Git metadata ships. [Release inventory](docs/RELEASE_INVENTORY.json) records every entry/hash.

## Safe regression results

- npm contracts/browser freshness: **21 PASS**.
- Hardening/source freshness/custom variants: **67 PASS / 195 assertions**, for source and unchanged approved dispatcher independently.
- Plugin units: **275 PASS / 515 assertions**.
- Chromium integration fixtures: **6 PASS**.
- Go tests and vet: **PASS**.
- PowerShell parsing, JSON validation, all **20 JS/MJS** syntax checks, release safety self-checks, allowlists, ZIP hashes, binary privacy, and packaged MCP regression: **PASS**.
- Extracted setup with Configure/InstallDependencies/InstallBrowser: **PASS**, including a folder with spaces, preserved config policy, approved hashes, and Chromium checks on this existing Windows host.
- OpenCode actual command/agent/skill discovery without Impeccable: **PASS**. The test service used an isolated profile/free port and was stopped.

Initial sandbox loopback/file restrictions required permitted reruns; final checks passed. The optional legacy timeout fixture remained skipped because no opt-in executable was supplied. The prior 23 TypeScript noEmit baseline diagnostics were not rechecked or hidden; vendor source is unchanged. Hosted Actions, clean-machine/provider/first-design testing, and live Figma writes were not run. Full results: [validation evidence](docs/RELEASE_VALIDATION.json).

## Remaining manual actions

1. **Enable GitHub Private vulnerability reporting immediately when repository visibility becomes public.** Repository → Settings → Security and quality / Advanced Security → Private vulnerability reporting → Enable. Confirm the private Report a vulnerability flow before announcement. No email was invented and no enabled setting is claimed.
2. Separately authorize repository creation, hosted CI, upload, and visibility changes. None was performed here.
3. Perform clean Windows onboarding/provider/first-design/revision/update validation; the successful existing-host smoke does not establish this. Optional public screenshots remain placeholders.

See [launch checklist](docs/LAUNCH_CHECKLIST.md). Figma/runtime/browser limitations remain accurately documented; no design features or unrelated refactors were implemented.

PUBLIC_BETA_RELEASE_CANDIDATE: PASS

PUBLIC_BETA_LAUNCH_BLOCKERS: PASS

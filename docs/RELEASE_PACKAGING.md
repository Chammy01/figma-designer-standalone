# Source versus user release packaging

## GitHub source candidate

`SOURCE_ALLOWLIST.json` records the baseline files retained in the public candidate. Source/tests, pinned lockfiles, agents/core commands, rules, the MIT root LICENSE, and full third-party notices remain. Generated plugin assets are omitted from Git; source CI builds them with the committed Bun lockfile before dispatcher regressions. Approved release assets are supplied separately. Vendor upstream is pinned to `5806e71b8fd4bad97671038a0b010f04df1aaa41`; its custom variants, hardening, collector, and timeouts retain their bytes.

Optional Impeccable engine/launchers/command are removed. Its active skill is archived as reference-only material; original license/notice texts remain. See [the engine audit](SKILL_ENGINE_AUDIT.md). Dependencies, staging/evidence, configuration, logs, generated history, private design data, caches, and arbitrary archives are excluded from source inventories.

## User release ZIP

`RELEASE_ALLOWLIST.json` contains exact files: core agents/commands, anti-ai-slop-ui, rules, six browser/source runtime modules, compatibility wrapper, setup/config template, pinned Node manifests, beginner docs, LICENSE/third-party notices, VERSION, plugin manifest and exact approved core/UI, and the new sanitized `bin/figma-mcp-go.exe`. Impeccable contributes only LICENSE/NOTICE. No optional engine, downloader, archived instructions, test suite, build source, dependency installation, private evidence, or Git metadata ships.

Normal users need no Go/Bun build. Node/npm installs pinned Playwright/Chromium separately; OpenCode/provider setup is separate.

## Build and package

Build the executable from unchanged vendor source with Go 1.26.1 and `CGO_ENABLED=0`:

```powershell
go build -trimpath -buildvcs=false -ldflags "-X main.version=1.2.0-standalone-hardening" -o <staged-runtime>/bin/figma-mcp-go.exe ./cmd/figma-mcp-go
```

Run from `vendor/figma-mcp`. The output placeholder is a contributor staging path. Source setup uses the same command with a temporary output before exact-hash verification and installation. `-buildvcs=false` explicitly reproduces the approved non-Git metadata for Git clones too. Build plugin core/UI from pinned source using Bun 1.4.2 (`bun install --frozen-lockfile`, `bun run build`) and verify their approved hashes in that runtime root; no maintainer artifact copying is needed. Verify Go tests/vet, privacy scanning, MCP initialization/version/catalog/rejection probes, and the full safe regressions before recording the public hash in `APPROVED_RUNTIME.json`.

From the source root, package into fresh external staging:

```powershell
.\scripts\package-release.ps1 -RuntimeRoot <sanitized-approved-runtime> -OutputRoot <fresh-release-folder>
```

The script takes all three approved artifacts (MCP executable, plugin dispatcher, and UI) from RuntimeRoot, and other files from source. It rejects existing output, runtime hash mismatches, traversal/reparse points, missing root LICENSE, optional engine material, and private compiler paths before creating staging. It copies exact allowlisted files, verifies hashes and every ZIP entry, and regenerates `SHA256SUMS.txt` and `RUNTIME_SHA256SUMS.txt`. Hidden `.opencode` files are included. Checksums establish content identity; they are not publisher signatures.

Use `scripts/release-check.ps1 -Mode Source` for a source checkout, even before build. Use `-Mode Release -RuntimeRoot <approved-runtime-folder>` to additionally require every approved runtime hash and executable privacy. A source build passing regressions does not automatically approve replacement release assets.

Original working files are never build/cleanup targets. Publication and the post-public GitHub security toggle remain separate [launch actions](LAUNCH_CHECKLIST.md).

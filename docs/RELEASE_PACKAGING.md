# Source versus user release packaging

## GitHub source candidate

`SOURCE_ALLOWLIST.json` records the baseline files retained in the public candidate. Source/tests, pinned lockfiles, agents/core commands, rules, the MIT root LICENSE, and full third-party notices remain. Generated plugin assets are omitted from Git; source CI builds them with the committed Bun lockfile before dispatcher regressions. Approved release assets are supplied separately. Main vendors owned Figma Designer MCP `c95e264350ecd4f13f11f4012cc13dcc96edc927`. The upstream lineage is historical; variants, hardening and the conditional collector patch are retained. The 1.1.0 runtime adds receipts, optional guards, scoped revisions and bridge protocol 2; timeout values and existing authoring semantics remain unchanged. `v1.2.1-reliability.1` names unpublished local source/package validation. The previous owned approval and Beta 3 remain rollback records; do not replace Beta 3 assets. See [reliability provenance](FIGMA_DESIGNER_MCP_RELIABILITY_V1_4_3B.md) and [Beta 2 provenance](CONDITIONAL_FRESHNESS_BETA_2.md).

Optional Impeccable engine/launchers/command are removed. Its active skill is archived as reference-only material; original license/notice texts remain. See [the engine audit](SKILL_ENGINE_AUDIT.md). Dependencies, staging/evidence, configuration, logs, generated history, private design data, caches, and arbitrary archives are excluded from source inventories.

## User release ZIP

`RELEASE_ALLOWLIST.json` contains exact files: core agents/commands, anti-ai-slop-ui, rules, browser/source runtime modules including the motion translator/runtime and motion checks, compatibility wrapper, setup/config template, pinned Node manifests, beginner docs, LICENSE/third-party notices, VERSION, plugin manifest and exact approved core/UI, and the new sanitized `bin/figma-designer-mcp.exe`. Impeccable contributes only LICENSE/NOTICE. No optional engine, downloader, archived instructions, test suite, build source, dependency installation, private evidence, or Git metadata ships.

Normal users need no Go/Bun build. Node/npm installs pinned Playwright/Chromium separately; OpenCode/provider setup is separate.

## Build and package

Build the executable from the exact owned pinned vendor source with Go 1.26.1 and `CGO_ENABLED=0`:

```powershell
go build -trimpath -buildvcs=false -ldflags "-X main.version=1.1.0" -o <staged-runtime>/bin/figma-designer-mcp.exe ./cmd/figma-mcp-go
```

Run from `vendor/figma-mcp`. The output placeholder is a contributor staging path. Source setup uses the same command with a temporary output before exact-hash verification and installation. `-buildvcs=false` explicitly reproduces the approved non-Git metadata for Git clones too. Build plugin core/UI from pinned source using Bun 1.4.2 (`bun install --frozen-lockfile`, `bun run build`) and verify their approved hashes in that runtime root; no maintainer artifact copying is needed. Verify Go tests/vet, privacy scanning, MCP initialization/version/catalog/rejection probes, and the full safe regressions before recording the public hash in `APPROVED_RUNTIME.json`.

From the source root, package into fresh external staging:

```powershell
.\scripts\package-release.ps1 -RuntimeRoot <sanitized-approved-runtime> -OutputRoot <fresh-release-folder>
```

The script takes all three approved artifacts (MCP executable, plugin dispatcher, and UI) from RuntimeRoot, and other files from source. It rejects existing output, runtime hash mismatches, traversal/reparse points, missing root LICENSE, optional engine material, and private compiler paths before creating staging. It copies exact allowlisted files, verifies hashes and every ZIP entry, and regenerates `SHA256SUMS.txt` and `RUNTIME_SHA256SUMS.txt`. Hidden `.opencode` files are included. Checksums establish content identity; they are not publisher signatures.

Use `scripts/release-check.ps1 -Mode Source` for a source checkout, even before build. Use `-Mode Release -RuntimeRoot <approved-runtime-folder>` to additionally require every approved runtime hash and executable privacy. A source build passing regressions does not automatically approve replacement release assets.

Original working files are never build/cleanup targets. Publication and the post-public GitHub security toggle remain separate [launch actions](LAUNCH_CHECKLIST.md).

## Per-release evidence

Beta 3 is a separate prerelease; Beta 1 and Beta 2 assets remain untouched. Build
from the exact committed source in a clean disposable checkout and verify the
unchanged approved runtime before packaging. After exact-commit CI is green, attach
RELEASE_INVENTORY.json, RELEASE_VALIDATION.json, RUNTIME_SHA256SUMS.txt and
SHA256SUMS.txt alongside the Windows ZIP. The validation asset records the exact
source commit, package digest, tests, extraction/setup, privacy, browser parity and
V1.2.5 HOLD. These records are outside the ZIP to avoid self-referential digests.
Historical docs/RELEASE_INVENTORY.json and docs/RELEASE_VALIDATION.json remain the
original Beta 1 snapshots; use the records attached to each tagged release for
that release. Download and verify the published assets and tag after upload.

# Clean-source hosted CI verification

Prepared 9 October 2026 (Asia/Manila). This change addresses generated-artifact assumptions in CI and release tooling; runtime source, upstream revision, approved release binaries, model/default agent, and timeout/interaction/freshness semantics are unchanged.

## Corrected assumptions

A Git checkout omits `vendor/figma-mcp/plugin/dist/` under the vendor ignore rules. Node source validation previously hashed those absent release assets, and the plugin job resolved the dispatcher before building it.

The Node job now explicitly selects `release-check.ps1 -Mode Source`. The plugin job installs the committed lockfile with Bun 1.4.2, runs source suites, runs the existing `bun run build`, asserts `dist/code.js` exists, and runs the hardening/variant/live-source suites with FIGMA_PLUGIN_BUNDLE pointing to that freshly built file. No dispatcher download or generated asset commit is needed.

## Build command and determinism

Run from `vendor/figma-mcp/plugin`:

```powershell
bun install --frozen-lockfile
bun run build
```

The existing package build expands to `vite build && vite build -c vite.config.main.ts`. The second configuration uses `src/main.ts`, IIFE output, ES2015 target, no minification, and writes `dist/code.js`; the first builds the UI.

Two builds in an isolated archive of committed source, initially without dist assets or installed dependencies, produced identical dispatcher and UI bytes on Windows with Bun 1.4.2 and the committed lockfile:

| Artifact | Repeated build and approved release SHA-256 |
| --- | --- |
| Dispatcher | `24bb648c96cc7288938e87aedc07f44de48d9ea25fe9f19f3256633c31dad849` |
| UI | `661fb49dd3ca38ed4648e70858822f59f565093718d02143c6b1b85628f054ee` |

There is **no measured hash difference** in this pinned Windows environment. Equality on other tool versions/platforms is not assumed, and CI regression success does not change the approved release hashes. Approved local/release assets were not overwritten during builds.

## Validation contexts

`-Mode Source` is the default: validate non-generated allowlisted source files, JSON/PowerShell/JS syntax, config policy, optional-engine exclusion, privacy-scanner self-check, setup config preservation, and packaging runtime-mismatch failure. Approved generated assets are not mandatory before build; a freshly built file is not compared to a release-only hash here.

`-Mode Release -RuntimeRoot <approved-runtime-folder>` additionally requires the MCP executable, dispatcher, and UI with all three exact hashes in APPROVED_RUNTIME.json and executable privacy checks. Missing or altered artifacts fail. Packaging now takes every approved runtime artifact from RuntimeRoot, rather than assuming source contains the plugin assets; all hash, path/reparse, allowlist, privacy, and ZIP-content checks remain enforced.

## Local results

- Fresh tracked-source fixture without generated assets: source checks **PASS before build**.
- npm contract/freshness tests: **21 PASS**.
- Plugin source suite: **275 PASS / 515 assertions**.
- Hardening/variant/live-source source suite: **67 PASS / 195 assertions**.
- Plugin build twice: **PASS**, dispatcher/UI hashes identical and equal to approved assets.
- Freshly built dispatcher suite: **67 PASS / 195 assertions**.
- Go tests/vet: **PASS**.
- Source/Release mode guards and approved-runtime packaging: verified separately; missing/altered assets are rejected and approved artifacts remain required.

Before/after hashes confirm the original development project retains all 4,642 files with zero changes; the existing release ZIP and all approved runtime hashes are unchanged. No live Figma, provider request, screenshot creation, runtime activation, or dependency upgrade is part of this fix. Historical beta release inventories describe their earlier package/snapshot; this document records the CI integration revision.

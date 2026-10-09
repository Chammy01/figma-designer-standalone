# README revision

Status: README and screenshot validation passed. Runtime behavior was not changed. Hosted CI is checked after pushing; its result is reported separately.

## README structure

1. Product description and before/after visual proof.
2. Capabilities and the Velvet Brew example with editable-design visual.
3. Requirements, official Windows ZIP download, extraction, and PowerShell setup.
4. Importing the Figma plugin and starting OpenCode.
5. Doctor readiness check and the Little Bean first-design example.
6. WHAT, CONTENT, STYLE, and PRIORITIES guidance.
7. Typical workflow, focused revisions, and command reference.
8. Symptom-based troubleshooting, compact explanation, and limitations.
9. Developer/source path, documentation links, and license.

## Screenshots

The README references these seven requested files with meaningful alt text:

- `docs/assets/hero-before.png`
- `docs/assets/hero-after.png`
- `docs/assets/editable-design.png`
- `docs/assets/setup-pass.png`
- `docs/assets/import-plugin.png`
- `docs/assets/plugin-connected.png`
- `docs/assets/doctor-pass.png`

All seven supplied PNGs were inspected and copied unchanged into `docs/assets/`. They total 961,619 bytes (about 939 KiB); the largest is 352,206 bytes. No obvious secrets, personal usernames, emails, or private document content were visible. PNG signatures and chunk checksums are valid; no EXIF or text metadata chunks are present. Copy hashes match the supplied files. Exact screenshot paths and this report were added to the source/release allowlists so packaged documentation remains complete. The setup screenshot shows a disposable source-build run; its caption explains that official ZIP assets are verified without rebuilding and that local paths differ.

## Installation path represented

Official `Figma-Designer-v1.2.1-beta.1-Windows.zip` → extract → open PowerShell in the extracted folder → run setup with configuration, dependency, and browser switches → import and run the Figma plugin → start OpenCode from that folder → wait for Connected → run `/figma/doctor` → `/figma/design`.

The README distinguishes PowerShell commands from OpenCode chat commands, warns against GitHub's automatic source archives for normal users, and explains that the plugin can remain Disconnected until OpenCode starts. Official Windows ZIP users do not need Go, Bun, or Git.

## Developer path represented

The contributor section appears near the end. Git clones and automatic source archives require Go 1.26.1 Windows x64, Bun 1.4.2, and normal Node.js/npm/OpenCode prerequisites. Setup builds missing runtime files from pinned source, checks exact approved hashes, preserves approved existing assets, and does not install Go or Bun. Generated runtime binaries and plugin dist assets remain excluded from Git. Detailed instructions link to Installation, Development, Source Bootstrap, and Release Packaging.

## Validation performed

- Read setup, approved runtime policy, installation/source documentation, and the referenced Figma command definitions.
- All 20 local documentation links resolve.
- Exactly seven expected image paths resolve and have meaningful alt text; all supplied PNGs remain unmodified.
- No `download-release.png` image reference was added.
- Release filename matches `VERSION`.
- Setup flags match the script parameters. Referenced Figma commands exist; descriptions reflect their supported behavior.
- Go/Bun requirements match go.mod and setup.
- Official Node.js, Figma Desktop, and OpenCode installation guidance was checked. The OpenCode npm command matches existing Installation guidance.
- Text checks found no personal paths, usernames, emails, secrets, or maintainer-machine details. The example Windows path uses the generic `YourName` placeholder.
- `git diff --check` passed.
- Existing source release checks passed, including setup regressions, syntax/config checks, privacy scanner self-check, and packaging mismatch rejection.
- Existing release checks passed against previously verified local runtime artifacts, including all approved hashes and executable privacy.

A fresh ZIP built with `scripts/package-release.ps1` contains all seven screenshots. All 27 local README links (20 documents and seven images) resolve in its extracted contents. ZIP README and image bytes match repository inputs. Source/release allowlists include the new assets and report.

Hosted CI is checked after the documentation commit is pushed; the final task report records its result. Local runtime, plugin, and browser behavior was not changed or retested end-to-end for this documentation-only revision.

## Information intentionally deferred

Architecture details, hash records, implementation history, build commands, interaction constraints, and detailed recovery instructions remain in their existing focused documents. Runtime code and other onboarding guides were not rewritten.

## Remaining screenshot needed

`download-release.png` remains a future documentation gap. It is not referenced as an image in README. The seven supplied screenshots listed above are included and validated.

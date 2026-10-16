# Figma Designer v1.2.1 Beta 4

**Beta 4 is currently unsigned. Windows may show a SmartScreen/reputation warning.**
This is a Windows x64 prerelease, not a stable release or malware certification.

## Major change: Windows desktop app

Install and open Figma Designer directly. Normal use no longer requires a terminal,
npm, Go, Bun or a source checkout. A per-user installer and portable ZIP are available.

## New in Beta 4

- Windows desktop application with single-instance handling and clean owned-process shutdown.
- Bundled OpenCode 2.0.28 and Figma Designer MCP 1.1.0, using compatibility handshake protocol 2.
- Provider/model controls, clearer provider failure recovery and an updated design workspace.
- Structured QA and Browser/fidelity dashboards that retain warnings and failures honestly.
- MCP operation receipts, indeterminate-write recovery, mutation preconditions and revision safeguards.
- Bounded local recovery after interruption, without automatically resubmitting a design.
- Separate-origin browser previews without the desktop application's privileged bridge.

System version is 1.2.1; desktop package version is 1.4.4. These are separate from
MCP 1.1.0. Owned MCP source remains pinned to c95e264350ecd4f13f11f4012cc13dcc96edc927.

## Using Beta 4

1. Download **Figma-Designer-v1.2.1-beta.4-Windows-Setup.exe** and install Figma Designer for your user account.
2. Open Figma Desktop and a Design file.
3. Open Figma Designer. In Settings → Figma Plugin Setup → Open Plugin Folder, locate the development-plugin manifest.
4. In Figma, choose Plugins → Development → Import plugin from manifest, select that manifest, then run **Figma Designer MCP**. Keep its window open. If already imported from this same installation path, run/reload it instead.
5. Configure an AI provider and choose an available model if needed. Provider access, limits and charges are separate.
6. Describe the interface you want. Review it in Figma and ask for focused revisions.
7. Use the QA and Browser validation options when useful; review the reported limitations.

The portable alternative is **Figma-Designer-v1.2.1-beta.4-Windows-Portable.zip**.
Extract it fully into a writable folder and open **Figma Designer.exe**. Keep its
files together. The plugin manifest lives under
`resources/payload/workspace/vendor/figma-mcp/plugin/manifest.json`.

## Updating from Beta 3

Beta 4 is a desktop application: install/extract it separately. **Do not merge Beta 3
and Beta 4 folders or mix their runtime/plugin files.** Close the older OpenCode/MCP
session before connecting the new desktop app. Use the Beta 4 manifest from the
installed plugin folder. The technical plugin ID remains `figma-mcp-go`; do not
create a duplicate plugin identity. Reload the plugin when its bundle changes.

Beta 3 remains an unchanged rollback checkpoint. To roll back, close/uninstall Beta 4
normally, then use the matching Beta 3 runtime and plugin from its separate folder.
Desktop uninstall preserves user data and provider credentials; it does not uninstall Figma.

## Known limitations

- Windows packages are unsigned; SmartScreen/reputation warnings may appear. No warning-bypass procedure is provided.
- V1.2.5 variable/conditional prototype workflows remain **HOLD**; they are not enabled.
- One app-owned workspace; no project picker or auto-update.
- Development-plugin import/reload is manual. Its wildcard network permission remains unresolved and unchanged; use the default localhost bridge.
- Current browser acceptance retains **five MEDIUM stroke-width findings**, **199 font limitations** and **86 complex-paint limitations**, with no HIGH fidelity findings. Fidelity remains **FAIL**, displayed as such. Native exact pixel parity is **UNVERIFIED**.
- QA may report WARN for documented intentionally inert controls; this is not relabelled PASS.
- Receipt persistence is bounded (500 entries, seven days, 4 MiB); it does not provide global exactly-once semantics. Unknown writes require reconciliation, not blind retries.
- Large-page revision snapshots can be expensive.
- Windows installation roots are limited to **100 characters**.
- No fresh-VM certification or installer byte-reproducibility claim. Local isolated installs and Windows hosted runners are tested.

Source/developer setup remains available in [Installation](INSTALLATION.md).
No separate stable MCP release is published with Beta 4.

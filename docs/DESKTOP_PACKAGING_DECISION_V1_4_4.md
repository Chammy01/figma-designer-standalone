# Windows desktop packaging decision — V1.4.4

Use Electron 44.7.2 with electron-builder 26.15.3, locked in package-lock.json.
The desktop package version is **1.4.4**. System 1.2.1, the unpublished source
checkpoint, MCP 1.1.0, bridge protocol 2 and OpenCode 2.0.28 remain separate versions.
This prepares Beta 4; it does not publish or retag a release.

| Criterion | Electron | Tauri | Native WebView2 launcher |
| --- | --- | --- | --- |
| Existing Node HTTP service/UI/preview | Direct reuse with bundled Node sidecar | Node sidecar plus Rust host | Node sidecar plus native/.NET host |
| Process supervision | Node IPC parent-disconnect cleanup, existing owned/external engine contract | Additional host integration | Additional host integration |
| Installer | Established NSIS per-user/ZIP build | Established tooling, additional Rust build | Separate installer integration |
| Size | Larger Chromium payload | Smaller host, WebView2 prerequisite | Smaller host, WebView2 prerequisite |
| Toolchain/maintenance | Existing JavaScript; Electron security updates | Adds Rust, WebView2 distribution | Adds native/.NET, WebView2 distribution |
| Windows | Windows 10/11 x64 candidate | Windows/WebView2 compatibility management | Windows/WebView2 compatibility management |
| Signing | Authenticode certificate needed; candidate unsigned | Same | Same |
| Paths/shutdown/security | Explicit resources/userData, isolated renderer, supervised sidecar | Must implement equivalent boundaries | Must implement equivalent boundaries |
| Reproducibility | Locked inputs, hashed payload; installer identity tested separately | Additional toolchain inputs | Additional toolchain inputs |

Electron is the smallest implementation change for this application's existing
Node architecture. Package size alone does not justify another host language.
No AI/workflow/MCP authoring code lives in the renderer or desktop shell.

References: [Electron security](https://www.electronjs.org/docs/latest/tutorial/security),
[Electron app lifecycle](https://www.electronjs.org/docs/latest/api/app),
[Tauri Node sidecars](https://v2.tauri.app/es/learn/sidecar-nodejs/),
[WebView2 distribution](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution).

OpenCode 2.0.28 is bundled from its exact npm lock/integrity and verified executable
hash; its MIT license is retained. Node 24.15.0 comes from the official Windows
archive with its exact SHA-256 and license. Existing pinned Playwright/Chromium
support Browser Test without requiring an end-user npm install. No executable
download happens at application startup. Renderer Node integration is disabled.

Use the normal Windows title bar, single-instance lock, 1320×860 initial size and
900×650 minimum. Invalid/off-screen saved bounds reset. Per-user NSIS provides a
Start Menu shortcut and uninstall entry, without startup-on-login or automatic updates.
The portable ZIP contains the same application payload. Both remain local/CI candidates.

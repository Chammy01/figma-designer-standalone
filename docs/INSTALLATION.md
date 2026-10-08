# Installation — Windows x64

Use the prebuilt Release ZIP for normal use. Go, Bun, Git, and native Orca are not required. Use a writable folder, keep its files together, and avoid synchronizing or moving it during a session.

## Prerequisites

- Figma Desktop with a design file open and development-plugin import available.
- Node.js 20+ and npm: install from [Node.js](https://nodejs.org/), then reopen PowerShell. Check `node --version` and `npm --version`.
- OpenCode: follow [official Windows installation](https://opencode.ai/docs/). Its npm route is `npm install -g opencode-ai`; check `opencode --version`. The historical known-good environment used OpenCode 2.0.24. This candidate does not pin or install a newer OpenCode globally.
- Internet to install dependencies/browser and reach your AI provider. No Figma API key is needed. The AI provider may require sign-in and may impose usage limits or costs. Do not put credentials into project files.

The configuration intentionally keeps `opencode/space-bunny-free`, `web-designer`, and the approved numeric timeout `10000`. Model availability is provider-controlled. If unavailable, use OpenCode's provider/model selection deliberately and save your choice outside shared source; report the chosen model when diagnosing behavior. Setup never changes the model for you.

## Run setup

Open the extracted folder in File Explorer, type `powershell` in the address bar, and press Enter. Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1 -Configure -InstallDependencies -InstallBrowser
```

`-Configure` creates only missing local `opencode.json` from the template and your current folder path. `-InstallDependencies` uses `npm ci` with the unchanged lockfile. It replaces only local `node_modules`, as npm ci normally does. `-InstallBrowser` invokes the installed pinned Playwright CLI to install Chromium to its normal user cache. Each action is announced. No elevated terminal is required. Without these flags, setup is detection-only. Setup exits nonzero if required checks fail and prints the corrective step.

Existing config is read and preserved. A wrong executable path is reported; edit only `mcp.figma.command[0]` to the current `bin/figma-mcp-go.exe`, retaining your settings. The placeholder in `opencode.example.json` is not executable and must not be copied unchanged into `opencode.json`.

## Connect Figma

Follow [Quick Start](QUICKSTART.md) to import `vendor\figma-mcp\plugin\manifest.json`. Its runtime consists of that manifest, `dist/code.js`, and `dist/index.html`. Start OpenCode from the extracted folder and run the plugin in your open design file. The plugin starts Disconnected if OpenCode's local server is not yet running; keep both open and check Connected. Do not replace the plugin with a marketplace plugin or run a separate upstream server. The bundled manifest's network permission supports configurable hosts; use the default localhost connection for this beta.

Run `/figma/doctor` in OpenCode chat. It checks the connected document and local prerequisites. It cannot validate provider quality, every interaction, or a complete clean-machine install. An empty browser-export folder is normal before your first export.

## Optional browser workflow

Chromium is needed for `/figma/browser-test`. It is downloaded during the setup command above. For a design-only session, use `-SkipBrowser` to report browser checks as optional; install it later before browser testing. Do not use SkipBrowser for browser acceptance. Browser testing generates local evidence under `.figma-designer/browser-prototype/`; do not share that folder without reviewing its design content.

Source contributors: follow [Development](DEVELOPMENT.md). The source repository intentionally omits the MCP executable; setup reports that a prebuilt Release ZIP or deliberate contributor build is needed.

This bundle uses native Windows PowerShell/OpenCode and a Windows executable. Follow the native Windows npm route above; WSL is not the validated path for this ZIP even though upstream OpenCode recommends WSL generally. Installation reference: [OpenCode official docs](https://opencode.ai/docs/). In OpenCode, `/connect` opens provider setup; follow its prompts and keep any API key in OpenCode's credential storage, never shared project files. `/models` shows model choices if your preserved model is unavailable. The bundled AGENTS.md is already prepared; you do not need `/init` for this project.

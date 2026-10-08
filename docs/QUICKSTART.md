# Quick Start — Windows release ZIP

You do not need to know MCP, programming, or AI agents to use the basic workflow.

## 1. Download and extract

When published, open [Releases](https://github.com/Chammy01/figma-designer-standalone/releases) and download `Figma-Designer-v1.2.1-beta.1-Windows.zip` under Assets. The candidate is currently private/unpublished. Do not choose Source code ZIP. Right-click → Extract All. Keep the entire extracted folder together, preferably in a writable location such as Documents. Open the folder containing `setup.ps1`, `README.md`, and `vendor`.

## 2. Install prerequisites and run setup

Install Node.js 20+ with npm from [nodejs.org](https://nodejs.org/). Install OpenCode using its [official instructions](https://opencode.ai/docs/). For its Windows npm option, after installing Node, run `npm install -g opencode-ai`. This is an explicit separate global installation; Figma Designer setup does not do it for you. Reopen the terminal afterward. Figma Desktop must allow development plugins.

In File Explorer's address bar type `powershell` and press Enter. This opens a terminal in your extracted folder. Copy:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1 -Configure -InstallDependencies -InstallBrowser
```

The process-only execution-policy flag does not change Windows' global policy. If your organization blocks scripts, ask its administrator. Setup announces each requested action. It creates local `opencode.json` only if absent, installs the pinned local dependencies, and downloads Chromium to Playwright's normal user cache. It also prepares and verifies the MCP executable and Figma plugin: approved ZIP assets are preserved, while missing source-checkout assets are built automatically. It does not install Go/Bun, change your provider, or overwrite existing config. Internet is required. Resolve any FAIL before proceeding. Running setup alone still builds missing runtime assets; configuration and browser installs require the flags above. Git clones and GitHub Source code ZIPs require Go 1.26.1 for Windows x64 and Bun 1.4.2; follow [Installation](INSTALLATION.md), then run the same command. Setup performs the builds; no manual artifact copying is needed. The official Windows ZIP needs neither build toolchain.

## 3. Import the development plugin

After setup succeeds and reports **Figma plugin dispatcher verified**, open Figma Desktop and create/open a **design file**, preferably a new empty practice file. In its menu find **Plugins → Development → Import plugin from manifest**. Select the full manifest path printed by setup (`vendor\figma-mcp\plugin\manifest.json` inside your project). Keep both files in its `dist` subfolder. Menu wording may vary by Figma version; search Figma's plugin menu for Development if needed.

## 4. Start the plugin and OpenCode

Run the imported **Figma MCP Go — Tharun** plugin from Plugins → Development. It may say Disconnected until OpenCode starts. Keep the plugin window open.

In the PowerShell window in the extracted folder type `opencode` and press Enter. Follow its first-use sign-in/provider instructions if requested. A provider is the AI service that reads your prompt; its access and charges are separate. The preserved model is `opencode/space-bunny-free`. If OpenCode reports it unavailable, see Installation; setup does not silently substitute a model. After OpenCode starts, the plugin should say Connected. If necessary close/reopen only the plugin window, keeping the document and OpenCode open.

## 5. Check readiness

Type `/figma/doctor` into **OpenCode chat**, not the PowerShell prompt. It reads readiness and does not change your design. Follow any repair instructions. Technical results follow the actionable summary. A healthy check ends `FIGMA_DOCTOR: PASS`.

## 6. Create a first design

Copy the portfolio brief from [First Design](FIRST_DESIGN.md), or type:

```text
/figma/design Create a clean student portfolio landing page with navigation, hero, three projects, about, and contact. Use warm minimalist styling.
```

Watch your Figma file for editable layers. Leave both OpenCode and the plugin open while it works. Do not send the same request again while work is still running.

## 7. Revise

```text
/figma/revise Make the hero more compact and strengthen the typography hierarchy.
```

The revision inspects and changes the requested area. If a write times out, ask it to inspect what completed and continue only missing work. [Troubleshooting](TROUBLESHOOTING.md) explains visible errors. Advanced states and browser export are optional; [Commands](COMMANDS.md) shows their order.

This bundle uses native Windows PowerShell/OpenCode and a Windows executable. Follow the native Windows npm route above; WSL is not the validated path for this ZIP even though upstream OpenCode recommends WSL generally. Installation reference: [OpenCode official docs](https://opencode.ai/docs/). In OpenCode, `/connect` opens provider setup; follow its prompts and keep any API key in OpenCode's credential storage, never shared project files. `/models` shows model choices if your preserved model is unavailable. The bundled AGENTS.md is already prepared; you do not need `/init` for this project.

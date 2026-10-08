# Figma Designer Standalone — v1.2.1-beta.1

Figma Designer lets you describe an interface in plain English and have OpenCode build it as editable native Figma layers.

No prior MCP knowledge is required. You do not need to understand AI agents to begin. This public beta candidate is Windows-focused. Normal users should download the **GitHub Release ZIP**, rather than build the project themselves. No Go or Bun builds are needed for that ZIP.

Release publication is pending. [Chammy01/figma-designer-standalone](https://github.com/Chammy01/figma-designer-standalone) is currently private while beta validation is completed. The root project license is [MIT](LICENSE); public visibility and release publication require separate authorization.

## Demo

**Screenshot/GIF placeholder:** an owner-approved image of editable layers and the first-design workflow is still needed. No screenshots have been fabricated or private Figma files exported.

## What can it do?

- Create and revise editable interfaces using native Figma layers and Auto Layout.
- Build component states and supported working Figma interactions.
- Validate existing motion and inspect interface quality.
- Export a local browser interface, test navigation, and compare live source freshness.

## Who is it for?

Designers, students, and product builders who want to start with a written brief and refine the result in Figma. Developers can inspect the source and contribute improvements.

## Requirements

Windows x64, Figma Desktop with development-plugin access, Node.js 20+ and npm, and OpenCode available in your terminal. Internet is needed for installation and your AI provider. OpenCode may require provider sign-in; provider access, limits, and costs are separate. The preserved model is `opencode/space-bunny-free`; availability must be checked in OpenCode. If unavailable, choose a provider/model deliberately; setup does not change it.

## Quick Start

1. Download `Figma-Designer-v1.2.1-beta.1-Windows.zip` from the repository's **Releases → Assets** when available. Do not choose GitHub's automatic Source code ZIP.
2. Right-click the ZIP → Extract All. Open the extracted folder containing `setup.ps1`.
3. In File Explorer's address bar type `powershell` and press Enter. Run:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1 -Configure -InstallDependencies -InstallBrowser
   ```

   This exception applies only to this process. The script announces local config creation and dependency/browser installation, and prepares and verifies the Figma plugin before printing its import path. It changes no global configuration and preserves existing `opencode.json`. Resolve every FAIL before importing the plugin.
4. Open a Figma design file. In **Plugins → Development → Import plugin from manifest**, choose `vendor\figma-mcp\plugin\manifest.json` inside the extracted folder.
5. In the same PowerShell window run `opencode`. On first use, follow OpenCode's provider sign-in instructions. Keep it open; then run the imported development plugin in Figma. It should say **Connected**.
6. In OpenCode's chat enter `/figma/doctor`, then `/figma/design Create a simple portfolio landing page.`

See [Quick Start](docs/QUICKSTART.md) for every step and [Installation](docs/INSTALLATION.md) if a prerequisite is missing.

## Your first design

Describe the page, sections, and style. Try the [copy-paste portfolio brief](docs/FIRST_DESIGN.md), then `/figma/revise Make the hero more compact and strengthen the typography hierarchy.` Use a new empty Figma file for practice.

## Main commands

| Command | Use it to |
| --- | --- |
| `/figma/setup`, `/figma/doctor` | Prepare dependencies and check readiness |
| `/figma/design`, `/figma/revise` | Create and refine the design |
| `/figma/states`, `/figma/interactive`, `/figma/flow` | Build states, supported interfaces, and focused journeys |
| `/figma/motion`, `/figma/qa` | Validate motion and quality |
| `/figma/browser`, `/figma/browser-test` | Export and test in a browser |
| `/figma/status`, `/figma/version` | Check evidence and versions |

Read [Commands](docs/COMMANDS.md) before the advanced stages. Slash commands select the Figma agent; ordinary chat keeps the compatible `web-designer` default.

## Example workflows

First page: doctor → design → revise. Working interface: states → interactive → motion → qa. Browser: browser → browser-test → status. [Atlas](examples/atlas/README.md) illustrates the acceptance workflow without shipping private document data.

## Troubleshooting

Find your visible symptom in [Troubleshooting](docs/TROUBLESHOOTING.md). Never blindly rerun a timed-out write.

## Known limitations

Figma is not a full application runtime. Browser PASS does not establish complete state, business-logic, or visual correctness. Freshness is point-in-time evidence; visual regression is incomplete. See [Known limitations](docs/KNOWN_LIMITATIONS.md).

## Updating

Extract into a new folder and preserve configuration/output. See [Updating](docs/UPDATING.md).

## Developer setup

This source candidate retains source/tests, lockfiles, and required skills. Generated plugin assets are omitted from Git. Run the same setup command above: it installs the plugin's pinned dependencies, builds missing assets from checked-out source, and verifies the dispatcher against the approved release hash. No manual Bun build is normally needed. An approved dispatcher already in a Release ZIP is verified and preserved without rebuilding. Source checkouts require Bun 1.4.2 as a one-time build prerequisite; setup explains recovery if it is missing. The MCP executable is supplied separately by the Release ZIP; that prerequisite remains required for full setup success. See [Installation](docs/INSTALLATION.md), [Development](docs/DEVELOPMENT.md), and [Release packaging](docs/RELEASE_PACKAGING.md).

## Architecture

OpenCode → local Figma MCP → development plugin → editable canvas. Optional Node/Playwright browser validation is separate. See [Architecture](docs/ARCHITECTURE.md).

## Contributing

Read [Contributing](CONTRIBUTING.md), [Code of Conduct](CODE_OF_CONDUCT.md), and [Roadmap](ROADMAP.md). Support goes through the Setup Problem issue form once GitHub is available.

## License and third-party notices

Project-owned code and documentation use the [MIT License](LICENSE). Figma MCP, bundled skill reference material, and other dependencies retain their separate [third-party licenses and notices](THIRD_PARTY_LICENSES.md). The optional Impeccable engine is excluded from this beta; core Figma commands do not require it. See the [resolved license decision](docs/LICENSE_DECISION.md) and [launch checklist](docs/LAUNCH_CHECKLIST.md).

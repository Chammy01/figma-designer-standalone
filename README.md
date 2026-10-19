# Figma Designer

A Windows desktop AI design tool that creates editable native Figma interfaces from plain-language instructions. Describe what you want, revise it naturally, and use the prototype, QA, and browser validation workflows to check the result.

> **Public download: [v1.2.1-beta.4](https://github.com/Chammy01/figma-designer-standalone/releases/tag/v1.2.1-beta.4)** remains the recommended published prerelease. It is unsigned; Windows may show a SmartScreen/reputation warning. Beta 3 remains available as a rollback checkpoint.

## Current development preview

Current `main` contains the **unreleased V1.5.2 monochromatic UI/UX overhaul**, with a Deep Cool Slate palette. The desktop screenshots below show current development source, **not the Beta 4 download**. Beta 4 packages the earlier V1.4.4 desktop application; its published files are unchanged.

![Figma Designer monochromatic Studio workspace on unreleased development main](docs/assets/v1.5.2-monochromatic/studio.png)

Studio brings the conversation, prompt composer, agent activity, and workflow actions into one workspace. This is the real application's ready state, captured at a 1320 × 860 content viewport.

## From an idea to an editable interface

**Describe → Design → Review in Figma → Revise → Prototype → QA → Browser validation**

Start with the screen you need, its content, and the parts that matter most. Figma Designer creates native frames, text, components, and layers through the connected Figma Desktop plugin. You can edit them directly in Figma and ask for focused revisions that preserve the rest of the design.

For example, describe this in Studio:

```text
Design a project dashboard for a small creative team.
Include active projects, upcoming milestones, and recent activity.
Use a calm layout with clear typography. Make the next action easy to find.
```

A generated layout does not automatically make every control work. Add supported prototype interactions when needed, then inspect their behavior with QA before building and testing a browser preview.

### Capabilities

- Generate editable native Figma interfaces and make focused revisions.
- Create component states and native component-set variants.
- Connect screens and add supported prototype interactions and transitions.
- Run read-only QA with findings, limitations, and document-integrity evidence.
- Use **Browser Build** to generate a local preview, then **Browser Test** to check behavior, motion, source freshness, and fidelity separately.
- Follow agent activity and run status, revisit recent runs, and configure providers and models in the Windows desktop app.
- Check interrupted work before continuing. Recovery safeguards preserve uncertainty instead of blindly replaying a request.

## Inside the development workspace

All six captures in this gallery are from the real current-source desktop application. The capture workspace starts with an empty Figma document and no browser build. Unavailable or unverified evidence is shown as such; these images do not demonstrate a completed design or a passing browser test.

### Studio

<details>
<summary>See Studio during a real connection check</summary>

![Studio running a read-only connection check with agent activity and conversation visible](docs/assets/v1.5.2-monochromatic/studio-working.png)

The active state shows an actual readiness check, not simulated design generation.

</details>

### Review and validation

QA inspects the Figma design. Browser keeps preview readiness, test results, motion, and fidelity evidence separate.

<details>
<summary>QA review desk</summary>

![Current development QA review desk with evidence status and findings](docs/assets/v1.5.2-monochromatic/qa.png)

QA reports the inspected scope and its limitations. An empty document cannot demonstrate working prototype controls.

</details>

<details>
<summary>Browser preview and validation</summary>

![Current development Browser workspace showing an unbuilt preview and unverified validation evidence](docs/assets/v1.5.2-monochromatic/browser.png)

This workspace has no generated browser preview. NOT BUILT and UNVERIFIED are prerequisite states, not successful validation results.

</details>

### Workspace management

<details>
<summary>Recent Runs</summary>

![Current development Recent Runs view with actual workspace check history](docs/assets/v1.5.2-monochromatic/runs.png)

This connection-check run was stopped normally after capturing the active Studio state. Recent Runs preserves its request and stopped outcome.

</details>

<details>
<summary>Settings</summary>

![Current development Settings with model selection, Figma connection, and application sections](docs/assets/v1.5.2-monochromatic/settings.png)

Model availability depends on your provider and account. Figma connection status is reported separately.

</details>

## Download and start Beta 4

The instructions here apply to the **published Beta 4 app**, whose interface differs from the development preview above.

1. Download **Figma-Designer-v1.2.1-beta.4-Windows-Setup.exe** from the [Beta 4 release assets](https://github.com/Chammy01/figma-designer-standalone/releases/tag/v1.2.1-beta.4) and install it for your user account.
2. Open Figma Desktop and a Design file, then launch **Figma Designer** from the Start Menu.
3. In **Settings → Figma Plugin Setup → Open Plugin Folder**, locate the manifest. In Figma, use **Plugins → Development → Import plugin from manifest**, then run **Figma Designer MCP** and keep it open.
4. Configure your AI provider/model if needed, then describe your interface in the app.

No terminal, npm, Go, Bun, or source checkout is required for normal desktop use. You need Figma Desktop, permission to import a development plugin, and internet/provider access.

The alternative **Figma-Designer-v1.2.1-beta.4-Windows-Portable.zip** must be fully extracted before opening **Figma Designer.exe**. Keep its files together. Install or extract Beta 4 separately; **do not merge it with Beta 3**. Close older OpenCode/MCP sessions and use the matching plugin from the Beta 4 folder. Installation roots currently have a 100-character limit.

See [Installation](docs/INSTALLATION.md), [Updating](docs/UPDATING.md), and the [Beta 4 release notes](docs/RELEASE_NOTES_v1.2.1-beta.4.md) for setup details and release-specific limitations.

## Editable Figma output

![Historical generated coffee-shop website with editable native frames, text, sections, and layers in Figma](docs/assets/editable-design.png)

This earlier Velvet Brew example shows generated Figma output, not the V1.5.2 application shell. The frames, text, and layers remain editable. Historical terminal, setup, and plugin screenshots are preserved in [`docs/assets/`](docs/assets/) and explained in the [earlier README presentation record](docs/README_REVISION.md); their branding and runtime versions are not current setup guidance.

## How it works

The desktop app sends your request to OpenCode, which runs the Figma Designer workflows through the local MCP executable and localhost WebSocket bridge. The development plugin creates or edits native layers in the open Figma document. Browser generation and testing use local Node and Playwright, separate from Figma write operations.

See [Architecture](docs/ARCHITECTURE.md) for the integration details. OpenCode is the product runtime; you do not need its terminal interface for normal desktop use. The optional `/figma/` commands are documented in [Commands](docs/COMMANDS.md).

## Known limitations

- Current `main` is newer than the published Beta 4 download. The monochromatic screenshots show unreleased development work.
- V1.2.5 stateful variables and conditionals remain **HOLD**. Supported prototype interactions do not imply unrestricted Figma conditionals.
- Native pixel/render parity remains **UNVERIFIED**. Browser validation does not certify perfect visual parity or every possible interaction.
- Existing development Browser findings include five MEDIUM stroke-width differences and a normal-motion intermediate-frame sample finding. They remain findings, not a passing fidelity/motion result.
- A prototype is not a production app. Authentication, persistent data, payments, and backend behavior require application code.
- AI provider access, model availability, output quality, usage limits, and costs are separate from this project. Windows x64 is the validated desktop platform.

See [Known limitations](docs/KNOWN_LIMITATIONS.md) for supported behavior and constraints. Browser Test protects the artifacts it checks; implementation details belong in the [V1.5.1 Browser Test artifact guard documentation](docs/BROWSER_TEST_ARTIFACT_GUARD_V1_5_1.md).

## Build and run current source

Git clones and GitHub source archives are developer installations. They require **Go 1.26.1 for Windows x64**, **Bun 1.4.2**, and the Node.js/npm/OpenCode prerequisites. From a checkout:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1 -Configure -InstallDependencies -InstallBrowser
npm run app
```

Setup builds missing MCP and plugin runtime files from the pinned source and verifies their approved hashes. Existing approved runtime files are preserved. Generated binaries and plugin `dist` files are intentionally excluded from Git. Setup does not install Go or Bun.

`npm run app` opens the local source application service; `npm run desktop:prepare` followed by `npm run desktop` runs the desktop shell. See [Development](docs/DEVELOPMENT.md), [Source Bootstrap](docs/SOURCE_BOOTSTRAP.md), and [Release Packaging](docs/RELEASE_PACKAGING.md) for tool versions, tests, and build instructions. Legacy terminal installation is covered in [Quick Start](docs/QUICKSTART.md) and [Installation](docs/INSTALLATION.md).

## Documentation

- [Installation](docs/INSTALLATION.md) · [Troubleshooting](docs/TROUBLESHOOTING.md) · [Updating](docs/UPDATING.md)
- [Commands](docs/COMMANDS.md) · [Architecture](docs/ARCHITECTURE.md) · [Known limitations](docs/KNOWN_LIMITATIONS.md)
- V1.5.2: [UI audit](docs/MONOCHROMATIC_UI_AUDIT_V1_5_2.md) · [Design system](docs/MONOCHROMATIC_DESIGN_SYSTEM_V1_5_2.md) · [Overhaul architecture plan](docs/MONOCHROMATIC_UI_OVERHAUL_V1_5_2.md)
- [Beta 4 desktop architecture and acceptance](docs/FIGMA_DESIGNER_DESKTOP_V1_4_4.md) · [Changelog](CHANGELOG.md)
- [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md) · [Third-party notices](THIRD_PARTY_LICENSES.md)

## License

Project-owned code and documentation use the [MIT License](LICENSE). Dependencies and bundled third-party material retain their own licenses and notices.

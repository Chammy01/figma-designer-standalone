---
description: Install/check standalone browser-test dependencies and verify the Figma MCP bridge
agent: figma-designer
subagent: false
---

FIGMA DESIGNER SETUP — STANDALONE V1.2

Do not modify Figma except for read-only health/document checks.

1. Verify the project contains `bin/figma-mcp-go.exe`, `.opencode/agents/figma-designer.md`, and `vendor/figma-mcp/plugin/dist/code.js`. If the executable or plugin assets are missing, tell the user to run `powershell -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1 -Configure -InstallDependencies -InstallBrowser` from this project. Do not claim the plugin is ready until setup verifies it.
2. Run the Figma MCP `health_check`. If the bridge is disconnected, report exactly that Figma Desktop and the development plugin must be open; do not attempt unrelated fixes.
3. Check Node with `node --version`. Node 20+ is required for the pinned Playwright version.
4. If `node_modules/@playwright/test` is missing, run `npm install` in the project root.
5. Verify Chromium is installed for Playwright. If needed, run `npx playwright install chromium`.
6. Do not install native Orca and do not call `orca`.
7. Report versions for OpenCode, Node, @playwright/test, and the Figma MCP connection.

End with exactly one marker:
FIGMA_SETUP: PASS
FIGMA_SETUP: FAIL

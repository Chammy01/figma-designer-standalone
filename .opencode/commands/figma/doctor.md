---
description: Read-only health check for the standalone Figma Designer stack
agent: figma-designer
subagent: false
---

FIGMA DESIGNER DOCTOR — STANDALONE V1.2

This is read-only. Do not modify Figma or project files.

Check:
- before connection checks, verify `vendor/figma-mcp/plugin/dist/code.js` and `vendor/figma-mcp/plugin/dist/index.html` exist relative to this project; verify the dispatcher SHA-256 against `docs/APPROVED_RUNTIME.json`
- Figma MCP health_check succeeds
- current Figma document can be read with get_document
- `bin/figma-mcp-go.exe` exists
- `.opencode/agents/figma-designer.md` exists
- `.opencode/commands/figma/` contains design, states, flow, motion, qa, browser, and browser-test commands
- Node version is 20+
- `@playwright/test` is installed
- `.figma-designer/browser-prototype/figma-browser.json` parses if it exists

Native Orca is explicitly NOT a dependency and must not be checked or invoked.

If the dispatcher is missing, report `Figma plugin runtime ..... MISSING` and `Run setup.ps1 to prepare the plugin.` If its hash differs, report a failed runtime check and recommend restoring the approved release or pinned source, then rerunning setup. Do not run setup or build automatically in this read-only command. Check local runtime files even when Figma is closed; skip unavailable document checks truthfully. Missing or unapproved plugin assets require FIGMA_DOCTOR: FAIL.

Before technical diagnostics, present a brief user-facing readiness summary: OpenCode, Figma MCP, Figma plugin, Figma document, and Browser tools. Mark each OK, failed, or not checked truthfully based only on the checks above. Give the next corrective step first. If all checks pass, say Everything is ready and suggest /figma/design Create a simple portfolio landing page. Do not claim checks were performed when they were not.

End with exactly one marker:
FIGMA_DOCTOR: PASS
FIGMA_DOCTOR: FAIL

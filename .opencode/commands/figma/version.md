---
description: Show the standalone Figma Designer system version
agent: figma-designer
subagent: false
---

Report exactly:

FIGMA_DESIGNER_VERSION: 1.2.1-standalone-source-freshness

Architecture: OpenCode + Figma MCP/plugin + Playwright. Native Orca is not required. Canonical runtime: `Figma Designer — Interactive App`.

System release: 1.2.1. Manifest/report schemas: 2. Projection: figma-browser-source-v1. Fingerprint: canonical-json-sha256-v1. Main uses owned MCP 1.0.0 from the exact pin in docs/APPROVED_RUNTIME.json. This ownership identity migration preserves behavior and schemas; frozen Beta 3 retains its previous runtime.

Public package/repository release: v1.2.1-beta.2. System/MCP/schema/projection/fingerprint versions above remain unchanged.

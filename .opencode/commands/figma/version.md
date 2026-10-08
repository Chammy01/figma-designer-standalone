---
description: Show the standalone Figma Designer system version
agent: figma-designer
subagent: false
---

Report exactly:

FIGMA_DESIGNER_VERSION: 1.2.1-standalone-source-freshness

Architecture: OpenCode + Figma MCP/plugin + Playwright. Native Orca is not required. Canonical runtime: `Figma Designer — Interactive App`.

System release: 1.2.1. Manifest/report schemas: 2. Projection: figma-browser-source-v1. Fingerprint: canonical-json-sha256-v1. MCP executable release remains 1.2.0-standalone-hardening; plugin core adds only a read-only source collector.

Public package/repository release: v1.2.1-beta.1. System/MCP/schema/projection/fingerprint versions above remain unchanged.

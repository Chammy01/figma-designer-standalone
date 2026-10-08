---
description: Summarize the current standalone Figma Designer document and local pipeline state
agent: figma-designer
subagent: false
---

FIGMA DESIGNER STATUS — STANDALONE V1.2.1

Read only.

Run health_check and inspect the current document.
Report:
- page-level production roots
- `Figma Designer — Component States` if present
- `Figma Designer — Interactive App` if present
- legacy `Figma Designer — Prototype Flows` if present
- component-set and variant counts
- runtime-screen count
- meaningful interactive INSTANCE/reaction count when practical
- whether `.figma-designer/browser-prototype/figma-browser.json` exists
- whether `.figma-designer/browser-prototype/figma-browser-test.json` exists and its latest PASS/FAIL value
- whether Playwright is installed

Always run `node scripts/figma-browser-status.mjs`, including when browser output is missing. It automatically captures the current dependency-closed Figma source twice, compares the stable fingerprint against the manifest, and rehashes local assets. Saved snapshots cannot replace live evidence.

Report Figma connection, runtime fingerprint availability, manifest/report presence, legacy/current schema, last exportRunId, and separate localFreshness, sourceFreshness, overallFreshness, and browserAcceptance. An old PASS is historical acceptance, not proof of freshness. Missing/incompatible evidence or unavailable/incomplete live reads remain UNVERIFIED. Changed comparable source is STALE. A failed report can be current evidence of failure. Never infer freshness from timestamps or node IDs alone.

Use labels such as `Figma source: STALE`, `Local browser artifacts: CURRENT`, `Browser acceptance: PASS`, `Overall: STALE — Figma changed after export`. Show the collector's reason when comparison is UNVERIFIED; preserve all output. See `SOURCE_FRESHNESS.md`.

Do not modify anything.

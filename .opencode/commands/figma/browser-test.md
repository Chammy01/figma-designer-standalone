---
description: Run deterministic Playwright regression tests against the generated browser interface
agent: figma-designer
subagent: false
---

FIGMA BROWSER TEST — STANDALONE V1.2.1

Do not modify Figma.
Do not use native Orca.

Run:

`node scripts/figma-browser-test.mjs`

The runner must validate the generated `.figma-designer/browser-prototype/` interface, including all manifest NAVIGATE interactions it can deterministically exercise, native keyboard activation, Back/Forward history, deep links, route fallback, reduced-motion contract, and local-only networking.

Default mode requires manifest schema 2, the canonical Interactive App runtime, and a controls array. Regenerate V1 exports through `/figma/interactive` then `/figma/browser`. Only when the user explicitly requests historical V1 testing, run `node scripts/figma-browser-test.mjs --legacy`; successful legacy tests return WARN with navigation-only coverage, never V1.1 PASS.

PASS proves the exercised ON_CLICK NAVIGATE pointer/Enter/history behavior, screen routing, unique control hooks inside their declared screen, computed CSS reduced-motion durations of at most 1ms, and context-level local-only requests/WebSockets during the run. Other triggers/actions, state behavior beyond hooks, and JavaScript animation timing remain untested and are listed in the report. Service workers are blocked.

The runner automatically collects the live dependency-closed Figma projection before and after testing through read-only local bridge calls. It compares the final stable live fingerprint with the manifest using the same projection/algorithm versions. Reports bind all local files/assets (including the source snapshot), exportRunId, projection version, source fingerprint, manifest hash, runner version, and system release.

Return separate browser acceptance, localFreshness, sourceFreshness, and overallFreshness. `FIGMA_BROWSER_TEST: PASS` with `SOURCE_FRESHNESS: STALE` is valid: navigation passed while Figma changed after export. Missing connection, legacy/missing fingerprints, incompatible versions, incomplete reads, or source changes during collection yield UNVERIFIED. Never use a saved source snapshot as live evidence. Run `node scripts/figma-browser-status.mjs` for a fresh comparison after testing. See `SOURCE_FRESHNESS.md`.

If dependencies are missing, stop and tell the user to run `/figma/setup`; do not silently change package versions.

Return the runner output and end with its exact final marker:
FIGMA_BROWSER_TEST: PASS
or
FIGMA_BROWSER_TEST: WARN
or
FIGMA_BROWSER_TEST: FAIL

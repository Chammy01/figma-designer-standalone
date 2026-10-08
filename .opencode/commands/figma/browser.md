---
description: Generate a dependency-free browser interface from the validated working Figma app
agent: figma-designer
subagent: false
---

FIGMA DESIGNER FUNCTIONAL BROWSER INTERFACE — STANDALONE V1.2.1

Run health_check first.

Follow AGENTS.md, the figma-designer agent instructions, `rules/figma-standalone-rules.md`, and any project design rules relevant to visual fidelity.

This task converts the VALIDATED working Figma interface into a dependency-free browser runtime.

FIGMA IS STRICTLY READ-ONLY FOR THIS COMMAND.

Do not call any Figma write tool.
Do not create, delete, clone, move, resize, rename, restyle, patch, convert, instantiate, detach, reparent, or reorder Figma nodes.
Do not add, remove, replace, append, or normalize Figma reactions.

USER SCOPE / TARGET

$ARGUMENTS

Treat the user input above as additional browser-export constraints. It does not authorize Figma writes or invented product behavior.

OUTPUT BOUNDARY

Filesystem writes are allowed ONLY inside:

`.figma-designer/browser-prototype/`

Create/update only:
- `index.html`
- `styles.css`
- `app.js`
- `figma-browser.json`
- `figma-source.json` (collector-owned source snapshot/run evidence)
- `assets/` only when genuinely required and available locally

Do not modify:
- OpenCode config/commands/agents
- project rules
- package.json
- MCP/plugin source
- application source outside this output directory

SOURCE OF TRUTH

Read the current Figma document and identify:
- production roots, read-only reference
- `Figma Designer — Component States`
- canonical `Figma Designer — Interactive App` SECTION
- every runtime screen FRAME inside it
- every meaningful runtime INSTANCE/control
- every reaction relevant to runtime behavior
- overlays/helpers participating in the interface

If only legacy `Figma Designer — Prototype Flows` exists and no canonical Interactive App exists, STOP and tell the user to run `/figma/interactive`. Do not silently export the legacy narrow-flow architecture as the finished working interface.

Before generating output, run `node scripts/figma-browser-source.mjs begin`. It performs two stable read-only source captures and writes `figma-source.json` with a UUID exportRunId, the complete dependency-closed projection, and fingerprint. Use that projection as the browser source; include its exportRunId in the new manifest. Other read-only inspections remain available for visual interpretation.

If begin returns UNVERIFIED/nonzero, stop generation, explain the read/projection failure, and preserve existing browser output. Never substitute a saved export snapshot for a live read. See `SOURCE_FRESHNESS.md` for included fields, parent-relative coordinates, exclusions, dependency closure, and numeric quantization.

BROWSER GOAL

Reproduce the validated Figma INTERFACE behavior, not merely screenshots or one primary journey.

For every exported screen:
1. inspect actual hierarchy, text, bounds, fills, strokes, typography, spacing, radii, and visible content
2. use read/inspection tools as useful
3. reproduce the screen with semantic HTML/CSS
4. preserve established visual language
5. do not redesign, rewrite copy, embellish, or invent content

The source desktop screen width is authoritative.
A fixed-width browser representation is acceptable when responsive reflow would materially alter the Figma design; report horizontal-scroll limitations honestly.

INTERACTION TRANSLATION

Translate every validated runtime control according to its QA classification.

A. WORKING_ACTION
- implement the corresponding real browser action
- NAVIGATE -> semantic anchor when practical
- BACK -> browser/history-compatible semantic behavior
- CLOSE/overlay -> local DOM behavior
- toggle/select/tab -> semantic/local state behavior when source semantics are defined

B. WORKING_STATE
- reproduce hover/press/focus/selected/toggle/etc. states with CSS/DOM behavior
- preserve Figma state colors/strokes/radii/typography as closely as local fonts allow

C. FIGMA_LIMITED
- when the browser can implement the real behavior safely using only local static HTML/CSS/JS and defined source semantics, upgrade it to real browser behavior
- example: a search field that was focus-only in Figma may become an actual local text input, but do NOT invent search results/data if none exist
- document the difference between Figma limitation and browser capability in the manifest/report

D. INTENTIONALLY_INERT
- keep inert unless the user explicitly supplied behavior
- do not invent destinations, options, data, or business logic

NAVIGATION

Translate NODE + NAVIGATE between runtime screen FRAMEs to hash routes.

Route format:

`#/screen/<FIGMA_SCREEN_ID>`

Bare URL must render the chosen start screen.
Unknown screen routes must safely fall back to the start screen.
Browser Back and Forward must work.

For a navigation control, prefer semantic HTML:

`<a href="#/screen/<DESTINATION_ID>">`

when it matches the interaction semantics. This provides native keyboard Enter activation without synthetic click logic.

STATE MAPPING

For component instances:
- resolve the instance's source component and component set
- inspect relevant variants
- map Default/Hover/Pressed/Focus/Selected/etc. to appropriate CSS/DOM states
- do not trust instance names alone

Default component transition:
- ~100ms ease-out

Default screen dissolve:
- ~150ms ease-out

Do not invent visual states not present in the Figma component system.

REDUCED MOTION

Implement runtime `prefers-reduced-motion: reduce` support.
Disable CSS animation/transition or collapse duration to at most 1ms under reduced motion. Preserve ordinary motion outside the media query.

SEMANTIC CONTROLS

Use semantic elements that match behavior:
- navigation: `<a>`
- actions: `<button>`
- actual browser text entry: `<input>`/`<textarea>` when source semantics support it
- selects: native `<select>` only when it faithfully represents the Figma behavior/options; otherwise use accessible local controls

Do not use inert `<div>`/`<span>` for controls that the validated runtime classifies as working when semantic HTML is available.

STABLE TEST HOOKS

Root application element:
- `data-figma-app`

Each rendered screen:
- `data-figma-screen="<FIGMA_SCREEN_ID>"`

Every declared exported control, including FIGMA_LIMITED/INTENTIONALLY_INERT entries:
- `data-figma-node="<FIGMA_NODE_ID>"`

Navigation/action destination when applicable:
- `data-figma-destination="<FIGMA_DESTINATION_ID>"`

Optionally add nonvisual metadata hooks such as `data-figma-action` or `data-figma-state` when useful, but do not replace the required hooks.

MANIFEST

Create `.figma-designer/browser-prototype/figma-browser.json` as valid UTF-8 JSON.

Minimum shape:

{
  "version": 2,
  "generatedAt": "...",
  "runtimeSectionName": "Figma Designer — Interactive App",
  "runtimeSectionId": "...",
  "startScreenId": "...",
  "screens": [
    {
      "id": "...",
      "name": "...",
      "route": "#/screen/...",
      "productionSourceId": "..."
    }
  ],
  "interactions": [
    {
      "sourceId": "...",
      "sourceScreenId": "...",
      "classification": "WORKING_ACTION",
      "trigger": "ON_CLICK",
      "action": "NODE",
      "navigation": "NAVIGATE",
      "destinationId": "...",
      "transition": "DISSOLVE",
      "duration": 0.15,
      "easing": "EASE_OUT"
    }
  ],
  "controls": [
    {
      "nodeId": "...",
      "screenId": "...",
      "role": "...",
      "classification": "WORKING_ACTION|WORKING_STATE|FIGMA_LIMITED|INTENTIONALLY_INERT",
      "componentSetId": "...",
      "browserBehavior": "...",
      "figmaLimitation": null
    }
  ],
  "motion": {},
  "fidelityLimitations": []
}

Include all validated runtime screens and meaningful controls in the manifest, not only the first CTA. Each control hook must live inside its declared screen.

Add `systemVersion: "1.2.1"` and the exact exportRunId from begin; keep manifest `version: 2`. After all browser files are generated, run `node scripts/figma-browser-source.mjs finish`. It collects the live projection again, verifies the manifest run/runtime/screen IDs, and binds sourceFingerprint, fingerprintAlgorithm, sourceProjectionVersion, sourceRuntimeId, sourceRuntimeName, sourceFingerprintBefore/After, and sourceExportState.

Equal comparable fingerprints yield STABLE export evidence. Different fingerprints yield STALE plus `SOURCE_CHANGED_DURING_EXPORT`; report this and do not call the output current or automatically regenerate. Missing/incompatible evidence yields UNVERIFIED. Preserve the output and explain the reason. Do not manually invent these fields or suppress a failed finish. The run ID links evidence; it does not imply an atomic Figma transaction.

LOCAL-ONLY GUARANTEE

No runtime dependency may require the public network.

Prohibited:
- CDN scripts/styles
- remote fonts
- remote images/assets
- fetch/XHR/API calls
- analytics/trackers
- dynamically downloaded modules

Scan generated HTML/CSS/JS for external URLs and network APIs.

FONTS

Do not fetch font files.
Use installed/system fallback stacks if the exact Figma font is unavailable.
If font metrics change wrapping/geometry materially:
- preserve critical control dimensions explicitly when necessary
- report fidelity limitations
- do not distribute or embed font files unless the user separately provides/licences them for that purpose

FILESYSTEM WRITE RECOVERY

If a filesystem write reports failure/timeout:
- inspect the actual output file before retrying
- do not blindly duplicate/generated fragments
- rewrite the intended complete file when necessary

FIGMA GUARD

After browser generation:
- run finish and report its source state independently of browser acceptance
- re-read all page-level fingerprints
- verify Figma is unchanged
- zero Figma writes must have occurred

STRUCTURAL VALIDATION

Before PASS verify:
1. required four files exist
2. manifest parses
3. every manifest screen has a route and matching `data-figma-screen`
4. every WORKING_ACTION navigation has a source hook and correct destination hook
5. navigation controls are semantic/enabled
6. keyboard-native activation is possible for links/buttons
7. Back/Forward-compatible routing exists
8. component states are represented where required
9. reduced-motion CSS/runtime handling exists
10. all resources are local
11. no control classified WORKING_ACTION in Figma was silently dropped from browser implementation
12. INTENTIONALLY_INERT controls remain nonfunctional unless user behavior was supplied
13. Figma fingerprints remain unchanged

FINAL REPORT

Report:
- output directory/files
- runtime SECTION source
- screen routes
- interaction count and control count
- navigation/action mappings
- component-state CSS/DOM mappings
- FIGMA_LIMITED behaviors upgraded by browser and what remained limited
- intentionally inert controls
- local-resource scan
- Figma fingerprints before/after
- exportRunId and sourceProjectionVersion
- sourceExportState, source freshness, and any SOURCE_CHANGED_DURING_EXPORT evidence
- fidelity limitations

End with exactly one:

FIGMA_BROWSER_BUILD: PASS
FIGMA_BROWSER_BUILD: FAIL

PASS requires complete structural validation, stable comparable export source evidence, and zero Figma mutation. Browser-test acceptance remains independent of source freshness.

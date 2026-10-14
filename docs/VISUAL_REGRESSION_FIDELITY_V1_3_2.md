# Visual regression and fidelity validation — V1.3.2

This foundation validates exported interfaces. It does not generate designs or repair
Figma/browser output. `/figma/browser` and `/figma/browser-test` remain the existing
surfaces; there are still fourteen commands. Runtime, motion, native QA, critique and
stateful workflow boundaries are unchanged. V1.2.5 remains HOLD.

## Three independent evidence boundaries

| Result | Evidence | Live acceptance |
| --- | --- | --- |
| SOURCE_FIDELITY | Captured dependency-closed source vs measured DOM | WARN: known font limitations and five 2px label offsets; no major geometry/content/surface defects |
| BROWSER_VISUAL_REGRESSION / PIXEL_REGRESSION | Accepted browser baseline vs current browser | Six synthetic fixture goldens PASS; five intentional changes rejected. Live design UNVERIFIED: no accepted live golden |
| NATIVE_RENDER_PARITY | Aligned native PNG vs browser PNG | WARN: observable renderer/text differences on all five screens |

FIGMA_PIXEL_PARITY: UNVERIFIED. Neither matching DOM geometry nor a stable browser
screenshot proves a native renderer match. No combined accuracy percentage is used.

## Phase 0: approved native reference audit

NATIVE_RENDER_REFERENCE: SUPPORTED. The approved public catalog has 106 tools,
including `get_screenshot` and `save_screenshots`. Go `tools_read_export.go` carries
nodeIds/format/scale; plugin `read-export.ts` resolves explicit nodes and calls native
`exportAsync({format:'PNG',constraint:{type:'SCALE',value:1}})`. Installed pinned
`@figma/plugin-typings` is 1.124.0. Export is declared by the API and actually works
through this approved transport. No UI automation, clipboard, REST, runtime rebuild,
new capability or credentials were needed. Initial disconnection was resolved by
the user starting the imported development plugin, before live acceptance.

Five FRAME exports succeeded with exact source dimensions; repeated modal export
had the same PNG digest. `captureNativeReference` validates source binding, frame
identity, PNG signature and dimensions. References bind FRAME ID, scale, dimensions,
PNG SHA-256, source fingerprint and crop/background description. Stable source must
surround capture. Nonmatching export bounds remain unverified rather than cropped
by guesswork. No extra export-setting write is used.

## Architecture and comparisons

`rules/figma-browser-fidelity.mjs` is pure: source projection → screen-local model →
actual measurement analysis. `scripts/figma-browser-fidelity.mjs` provides the
Chromium adapter and approved native-reference adapter. The existing browser test
runner invokes fidelity only with a snapshot whose computed fingerprint matches the
manifest. Missing evidence remains UNVERIFIED; actual analyzer failures fail testing.
The report stays in existing `figma-browser-test.json`, already excluded from artifact
hashes. No new hash exclusion, projection version or manifest schema is needed.
Runner version is 1.3.2 so an old test report cannot masquerade as current validation.

Source translations accumulate through parents, with screen root canvas placement
zeroed. DOM viewport rectangles subtract screen origin and restore ancestor scroll.
Rotation/scale/skew is uncertain. Source/DOM geometry is screen-local, while centered
modal placement is independently compared with viewport center. Tests cover nested
source parents, shifted screen origins, actual scrolling and centered transforms.

Thresholds are <=1 CSS px MATCH; <=3 MINOR_DRIFT; >3 MAJOR_DRIFT, using maximum
x/y/width/height difference. Boundary fixtures and accepted live export validate the
policy: five 2px inherited label offsets remain visible LOW findings, not suppressed.
Major control/screen displacement or missing content fails. BLOCKER/HIGH/MEDIUM →
FAIL; LOW/LIMITATION → WARN. Findings sort by severity/screen/node/code.

Direct text characters are exact; font size and explicit pixel line height are separate
metrics. CDP `CSS.getPlatformFontsForNode` reports actually rendered fonts, rather
than trusting a CSS family name or `document.fonts.check`. Each text record includes
source family/style, CSS stack, used font families, line count and text-range bounds.
AVAILABLE_LOCAL / FALLBACK_USED / UNKNOWN are explicit. No fonts are downloaded.
Missing fonts are limitations. Intrinsic text wrapping can be a limitation; incorrect
explicit CSS bounds/content/font size remain defects, even with fallback fonts.
Native wrapping equivalence is not inferred from Figma bounding boxes.

Simple single solid paints normalize to RGBA; compare channel bytes within 1 and
alpha within 0.005. Compare opacity, uniform radius, stroke width, font size and pixel
line height within 0.1. Complex paints, masks, effects and unmodeled graphic types are
COMPLEX_PAINT_LIMITATION / PARTIAL or UNVERIFIED. No raster/vector equivalence is
fabricated. Modeled source screens/frames/groups/instances/text and declared controls
require unique visible hooks. Arbitrary decoration is not a promised denominator.

## Browser screenshot policy

Existing @playwright/test 1.64.0 and its Chromium are reused. Committed goldens are
synthetic project fixtures only: layout/type, state appearance, destination, centered
modal, scrolling and cards. Windows baseline: 800×600 CSS px, DPR 1, light scheme,
Arial/system stack, en-US, UTC, reduced motion, local static content, no network,
disabled animations, hidden caret and settled state. These are not universal
macOS/Linux screenshots. Functional routes and active motion are tested separately
by existing integrations, including normal/reduced mode and modal close/focus.

Playwright comparison uses threshold 0.05, maxDiffPixels 0. The standard 0.2 threshold
missed a white/gray boundary change; the tighter threshold detects it and is verified
by negative coverage. Negative cases move a control, remove text, change fill and
change screen extent and resize the modal. Each must throw from Playwright's real comparator; baseline
bytes are checked unchanged afterward. Expected/actual/diff are local test-results
artifacts. Validation uses updateSnapshots:none. Explicit positive-only baseline
creation: `npx playwright test -c scripts/figma-browser-fidelity.config.mjs --update-snapshots --grep "settled browser baseline"`.
Review changed goldens; CI never updates them. Negative tests skip update mode.

`npm run test:browser` now runs existing functional/motion tests and the screenshot
suite. Goldens enter source archives for reproducibility, never release packages.
Live screenshots remain ephemeral under ignored `.figma-designer/fidelity/` during
this explicitly authorized non-sensitive acceptance; they are not committed, released
or embedded in JSON. Normal browser-test does not persist live screenshots or invent
a golden. This output directory is acceptance evidence, not generated browser source.

## Deterministic acceptance

The new contract suite covers exact/1px/2px/major position and size, text mismatch,
fallback unchanged/intrinsic wrapping, fallback with wrong explicit CSS bounds,
fill mismatch, missing control, transform uncertainty, nesting, complex paint,
unavailable source and native-reference identity/dimensions. The browser suite also
checks actual DOM font, missing/content/fill/type defects, modal geometry and scrolled
target normalization. Six positive screenshots and five deliberate negatives use the
actual Playwright comparator. No CI test depends on a live Figma connection.

Existing freshness tests retain deterministic stale detection; a synthetic changed
source hash was also STALE during live acceptance, despite unchanged visual results.
Source CURRENT, browser acceptance and fidelity statuses remain independent. No
automatic regeneration occurs.

## Live acceptance, 2026-10-14

Non-sensitive `Untitled` / `Acceptance v2-coffee`, runtime 36:719. Evidence receipt:
`scripts/fixtures/browser-fidelity-live.json` (historical numeric evidence only).

| FRAME | Native/browser dimensions | Pixels differing by >20 RGB channel units after white compositing |
| --- | --- | --- |
| 36:720 Café Hero | 1440×557 | 39,165 / 802,080 |
| 36:739 Café Menu | 1440×762 | 51,799 / 1,097,280 |
| 47:32 Overlay Acceptance | 800×600 | 3,871 / 480,000 |
| 47:38 Details modal | 400×260 | 7,396 / 104,000 |
| 47:43 Status Menu | 280×260 | 3,792 / 72,800 |

These are bounded difference counts, not accuracy scores or a regression baseline.
Both rasters use scale/DPR 1, exact frame crop and a white alpha-composite background.
No DOM/CSS repairs were made. The differences include real font substitution and
renderer differences; they are not dismissed as antialiasing-only or falsely passed.
No arbitrary native-vs-browser pixel threshold is used to claim exact equivalence.

All 5 screens, 109 modeled nodes, 65 text nodes and 5 declared controls measured.
Source families Fraunces, IBM Plex Mono, Karla and Inter use actual local Arial here
(65 font limitations); source content and fixed boxes match. Five labels drift by
2px on each axis, LOW. No unsupported property encountered among the modeled live
simple surfaces; that does not establish support for arbitrary paints/vectors.
Hero/Menu screen/container/CTA bounds and component-backed controls are source-bound.
The live modal is 400×260 at x600/y470 in a 1600×1200 viewport, exactly centered;
title/body/CLOSE control and simple surface are included. Existing functional tests
verify close/focus, not invented menu behavior. No live scroll reaction currently
exists; actual scrolling is covered by the deterministic prepared fixture.

Repeated complete reports are byte-equivalent; existing generated artifacts are
unchanged. Browser acceptance PASS; live source STABLE/CURRENT; local/overall CURRENT.
Zero external requests, zero Figma writes. Before/after page node count 1,290;
normalized page fingerprint unchanged:
`a8c1c5af049e0788b2e8794ca422fd6dbfb9a9b6f71c14e1ae5343bd45e0819e`.
Runtime/dependency fingerprint unchanged:
`305132db06a84df82351b91fbc02f99f028e5d9a4cc29289d4e5cfb78afdd204`.
This whole-page equality protects production, state library and canonical runtime.
There were no live writes/timeouts or probe cleanup needs.

The final separately counted acceptance campaign used 24 read calls (16 logged
document/health/source/native exports plus 8 source reads inside browser-test),
zero writes. This count excludes earlier exploration and independent regression
harness reads. Five unique local browser PNGs and five unique native PNGs were
captured; repeat measurements/exports did not create repository baselines.

## Regression and scope

Run npm contracts; browser/motion plus screenshot fixtures; plugin; built-bundle
hardening/variants/source freshness; setup fixtures; clean source archive build and
release-package extraction/setup; source/release/privacy/runtime checks. Hosted Windows
CI also runs pinned Go tests/vet. Test totals and exact CI commit are reported with
the delivered commit rather than embedding a self-referential commit ID here.

Approved runtime stays byte-identical:

- executable: bc9eec0d9a9cddd20e27331a41319a59b84bd51f88a78e59885b901456562f3f
- code.js: 273e20f56b80e9a7d995962948b1bb93e5cc1dfa19471ecd834ca7308d7da941
- index.html: 661fb49dd3ca38ed4648e70858822f59f565093718d02143c6b1b85628f054ee

No MCP/plugin/Go/native token/router/planner/QA/critique/runtime code changed. No new
command or dependency, no release/tag and no Beta 3 asset changes. Setup changes
only enumerate the new shipped rule/adapter dependencies.

## Limits and later work

This is bounded validation, not a complete renderer or responsive-device audit.
Current native references work but do not remove local font/vector limitations.
No generic export auto-repair, font redistribution, AI visual grading, remote image
service, stateful conditions, browser advanced-motion parity or new design engine.
Broader paints, mixed text runs, individual corner radii and transformed geometry
need future explicit comparable-property contracts. Sensitive live screenshots
require explicit artifact authorization. Product-specific browser baselines may be
accepted in a later scoped workflow; never silently baseline live user content.

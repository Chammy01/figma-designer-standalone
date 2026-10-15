# Structured validation dashboard — V1.4.2

QA and Browser are inspection views over existing machine-readable evidence. They
do not interpret assistant prose, run new analysis on page load, or repair Figma.
Start the source application with `npm run app`. The fourteen Figma commands and
published Beta 3 assets remain unchanged. V1.2.5 remains HOLD.

## Evidence audit

| Source / schema | Stable fields and statuses | Versions, optional data and freshness |
| --- | --- | --- |
| `scripts/figma-interaction-qa.mjs` → `collectInteractionQA` | Canonical status PASS/WARN/FAIL; coverage classes; summary counters; ordered finding IDs, severity, classification, problem, impact, expected/actual, evidence and workflow; control labels; complete before/after document/graph fingerprints; read/write counts | The analyzer has no serialized version field. The app adapter adds its own `contractVersion: 1.4.2` and `producer: interaction-qa-v2`; this does not version or change the analyzer. Optional source projection and fingerprints cannot establish CURRENT when absent. |
| Guarded `figma_qa_report` tool result | Canonical report text, `figmaReadOnly`, status/read/write metadata; new normalized `qaResult` | Native tool metadata, never assistant-generated text. The app captures only the completed tool result from its explicit QA workflow. The existing guard, collector and analyzer remain authoritative. |
| `.figma-designer/browser-prototype/figma-browser.json` | Screens, controls, interactions, export ID/time, source fingerprint, runtime identity, source export state | Manifest version 2; validated by existing `validateManifest`. Optional motion and fidelity limitations are not invented. File existence is not freshness proof. |
| `scripts/figma-browser-status.mjs` → `browserStatus` | Independent source/local/overall freshness and historical browser acceptance; current live source summary | Uses existing live source collection and `classifyFreshness`. CURRENT requires compatible source and local artifact bindings. STALE wins over unknown evidence; unavailable source stays UNVERIFIED. |
| `figma-browser-test.json` | Overall acceptance; exact named boolean/skipped checks; test time; artifact/manifest hashes; export ID and source binding | Report version 2, runner `1.3.2`. Unknown versions or malformed checks cannot become current PASS. An old result is historical when its binding is stale or unverified. |
| `report.fidelity` | SOURCE_FIDELITY, BROWSER_VISUAL_REGRESSION, NATIVE_RENDER_PARITY, PIXEL_REGRESSION, FIGMA_PIXEL_PARITY; coverage, ordered findings, font observations | Fidelity contract `1.3.2`. Optional/unmeasured fields display Not measured or UNVERIFIED. No combined score, threshold changes or suppressed defects. |
| `manifest.motion` / `report.motion` | Contract identity and actual token/mode/parity/passed rows | Motion contract `1.3.1`. Missing/empty metadata means UNVERIFIED, not FAIL. Synthetic fixture results do not certify a live preview. |
| Native render comparison | Existing fidelity status fields and native-reference capture helper | Current live artifact has no certified native comparison or live golden. Reference/capture counts are not measured. Exact pixel parity remains UNVERIFIED. |
| Source/page integrity | Existing canonical fingerprint objects and source projection | `canonical-json-sha256-v1`, `figma-browser-source-v1` unchanged. QA compares both document and dependency-closed source; browser uses its canonical source/artifact classifier. |

All sources are local and potentially contain private design content. Fixed file
paths, byte/row bounds, version/type checks, field whitelisting, path/secret
redaction and DOM text rendering protect the result surface. Provider catalogs,
credentials, full documents, native session context and hidden reasoning are not
part of the validation API.

The approved MCP catalog has `get_selection` and `get_viewport`, but no select,
focus or viewport setter. **LOCATE_IN_FIGMA: NOT_EXPOSED.** No Locate button,
selection workaround or new runtime capability is introduced.

## Result contract and storage

`app/shared/result-contract.mjs` projects the existing results into QA, Browser,
Motion and Fidelity views. It copies measured counters and preserves finding
ordering/severity. It never derives findings or counts from report prose. Stable
code-to-heading labels such as PROPERTY_strokeWidth → Stroke width mismatch are
presentation labels; the original code and values remain under Details.

QA metadata is captured after native idle and the app's whole-run integrity check.
Only the latest normalized result is atomically overwritten in ignored
`.figma-designer/app/qa-result.json`; there is no full-document/context archive or
unbounded report history. Input files are bounded to 8 MiB and lists to 5,000 rows.
Escaping paths, linked files, corrupted JSON and incompatible contracts fail closed.
Existing browser artifacts are read directly and are not duplicated by the app.

`GET /api/validation` is the one new fixed read-only endpoint. It exposes normalized
evidence and timestamps only. There is no arbitrary filename or native-tool
parameter. Simultaneous requests share collection. Visible dashboards refresh
periodically and on explicit Refresh Evidence; they never regenerate a preview.
Existing bounded runs supply at most ten validation-history rows, marked as
historical tasks. QA status in a run card comes from captured tool metadata, not
assistant PASS prose. Other canonical report text is collapsed by default.

## Freshness and integrity

Each view separates CURRENT, STALE, UNAVAILABLE and UNVERIFIED from the last
reported outcome. QA CURRENT requires matching current page and source hashes,
the known projection version and verified unchanged collector evidence. Browser
CURRENT uses the existing overall source/local classifier and compatible report
binding; source freshness remains visible separately. Local artifact drift cannot
masquerade as a current preview merely because Figma has not changed.

Old PASS/WARN/FAIL remains explicitly historical when stale or unverified. Missing
metrics are Not measured, never zero. Dates are reported artifact/collector times,
not inferred chronological proof. Evidence checks are snapshots, not a continuous
guarantee while another editor changes the document.

Document integrity has its own QA panel. A changed whole-run page or failed
collector integrity makes the result untrusted. Even without usable collector
metadata, an observed app integrity failure is retained as FAILED with no invented
QA metrics/findings. The existing QA execution guard still blocks shell, Code Mode,
authoring and delegation before execution. The fingerprint check supplements that
guard; it does not prove absent writes outside its captured properties/page.

## Views and actions

QA shows actual working/broken/unknown/limited counts and ordered findings. Filters
cover Broken, Unknown, Figma limitations and supported severities. Known node names
lead; IDs remain in Details. A passing empty state describes the inspected scope,
never a perfect prototype. Limitations and unknowns are distinct from defects.

Browser separates preview, source/local freshness, named test checks, motion,
source fidelity, browser regression and native comparison. Font observations are
grouped by actual source/browser/status combinations. Unsupported properties remain
limitations where the analyzer says so. Defects are the initial fidelity filter;
All, Fonts and Limitations retain every recorded finding. Current live golden and
exact native pixel parity are not certified by synthetic screenshot tests.

Continue Designing only prefills an editable instruction. Run QA, Build Browser,
Run Browser Test and Open Preview reuse existing explicit actions. There is no Fix
All, automatic revision, auto-download of fonts or hidden regeneration. A small
workspace summary is secondary to the composer; no new Fidelity navigation tab.

Settings separates plugin, bridge, document readability and runtime verification.
Document readability is established by the existing current-document metadata
read; dashboard integrity additionally reads the actual page/source. Disconnection
guidance says to open the file, run the imported development plugin, then Check
Again. Unsupported native authentication forms get explicit external setup guidance
and a Check Again action; no new credential form or auth implementation is invented.

## Security and accessibility

The loopback binding, exact Host/Origin rules, CSP, sanitized native errors, separate
preview origin and native credential ownership are retained. The validation reader
uses the existing fixed read-only bridge operations. Loading views, details,
filters, history and Settings makes no Figma writes. Run submission/recovery/model
locking remains the V1.4.1 implementation.

The V1.4.1 warm-neutral/forest visual system is retained. Compact rows replace
prose-first output; no decorative charts or metric-card grid. Status text accompanies
restrained colors. Native selects/details/buttons provide keyboard operation and
focus; unchanged evidence does not close open details on polling. Dark mode,
reduced motion and 960px desktop layout are covered.

## Acceptance record

- Live guarded QA: WARN, 2 working actions, 0 working states, 0 broken controls,
  0 broken edges, 44 unknown expectations, 2 unreachable from evidenced starts,
  1 limitation finding. Every exposed count and finding matches the actual guarded
  collector metadata. Canonical finding Q01 is UNKNOWN_EXPECTATION/LIMITATION:
  no journey start is evidenced. No expectation is guessed or repaired.
- QA integrity: VERIFIED_UNCHANGED. Collector and page hashes before/after match.
  Native trace: 54 inspection aliases, one six-read collector call, zero Figma
  write tools; one external-directory read was blocked by the QA guard.
- Existing browser: CURRENT source/local evidence; browser test FAIL and source
  fidelity FAIL. All five real MEDIUM stroke-width findings remain visible.
  Coverage: 2 screens, 617 nodes, 199 text nodes, 2 controls, 199 font limitations,
  86 unsupported properties. Missing live motion contract/native parity remain
  UNVERIFIED. No tolerance, font, source node or finding was changed for this view.
- Explicit Build Browser completed in the application and rebound the existing native
  source export. Open Preview opened on its separate origin. Preview/source remain
  CURRENT while the canonical test and fidelity remain FAIL with exactly five
  stroke-width findings; no automatic rebuild or defect suppression occurred.
- Real model selection switched to native-reported Gemini 4 Argon and back to
  Cat Jam Free in the same session. No new credentials or Figma writes were needed.
- Real plugin disconnect/reconnect: plugin NOT_CONNECTED, bridge HEALTHY, document
  UNAVAILABLE and runtime VERIFIED while closed. Reopening the same imported plugin
  and Check Again restored CONNECTED/READABLE without an app restart.
- Synthetic stale/missing/malformed states exercise fail-closed presentation and
  absence of automatic requests; the real acceptance document is not altered to
  manufacture these conditions. Provider/model/recovery regression coverage remains.

Page baseline: `a68cfd586576aa6f2d199c8edd4e46c541b5d7e9a22508a16781e8fff3712be6`.
Runtime source: `129cd01193e0d6d52a3c992380c48ed41650ea372316dadbd30d22ece81fcd27`.
The final page read matches the complete baseline fingerprint (2,385 nodes).
The QA trace has 60 measured Figma reads (54 inspection aliases plus six collector
reads). Browser native trace has five direct read/health calls; its source begin/
finish helpers also perform read-only collections whose internal call count was
not separately instrumented. Application refresh telemetry records additional
read-only metadata/page/source calls. All audited paths contain zero Figma writes.
Complete regression totals, exact commit and hosted CI are in the final delivery.

## Regression record

| Suite | Cases |
| --- | ---: |
| Node contracts, application/protocol/provider/model/guard and result adapter | 477 |
| Browser functional and semantic-motion integration | 8 |
| Browser fidelity visual fixtures | 9 |
| Application UI (11 existing, 6 structured-dashboard scenarios) | 17 |
| Plugin | 275 |
| Hardening, variants and source freshness | 112 |
| Setup fixtures | 33 |
| Installed OpenCode 2.0.24 timeout contract | 1 |
| Total distinct cases | 932 |

The 32 result-adapter cases include malformed/versioned/stale evidence, incomplete
integrity, export binding, report replacement races, symlinks and credential/path
redaction. Six dashboard UI cases bundle the requested presentation/action states
with native keyboard controls, 960px layout, dark mode and reduced motion.
Additional gates cover Go tests/vet, rebuilt-bundle hardening, clean source archive,
reproducible approved runtime, extracted package setup/repeat without Go/Bun,
extracted-app launch/health/shutdown and source/release/privacy checks. The local
package is a disposable regression artifact, not a replacement public Beta 3.

## Limits and packaging recommendation

Structural results do not prove playback or exact pixels. Fresh account sign-in
and additional native auth forms retain V1.4.1 limitations. No live golden/native
capture-pair count exists in the current report schema. QA persistence covers
explicit application QA runs; terminal-only reports do not appear until a supported
application run supplies structured metadata. History remains bounded/in memory.
Source snapshots can become old between checks; explicit refresh/rerun is available.
During the explicit Browser build, the existing native agent made ten temporary
repository-root DOM/source probe scripts and temporary-directory probes while
investigating fractional strokes. It removed every root probe and retained the
original renderer and five findings. The dashboard adapter does not auto-repair,
but the existing browser agent's local filesystem boundary is instruction-based;
this milestone does not claim a filesystem sandbox for that workflow.

V1.4.3 should package this source-preview application with the established clean
source/extraction gates, clear supported-provider guidance and a bounded temporary
workspace for native browser diagnostics. Do not mutate Beta 3
or publish Beta 4 as part of this milestone. No MCP/plugin binary, motion behavior,
analyzer thresholds, source projection/fingerprint version or stateful capability is
changed here.

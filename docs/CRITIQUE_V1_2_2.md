# Read-only Figma critique — V1.2.2

## Purpose and workflow

`/figma/critique` selects the existing `figma-designer` agent and reviews the live
current-page production design, or a requested root/section. It checks health,
resolves current IDs, records inspection evidence, compares appropriate peers and
roles, produces prioritized findings and strengths, then re-reads the same evidence.
Recommendations are report text only. No automatic revision or polish is implemented.

## Critique dimensions

The command covers visual hierarchy, composition, spacing and rhythm, typography,
color and contrast, consistency, component reuse, affordance, CTA clarity, content
density, section rhythm, readability, alignment, responsive/frame risks, and visual
repetition. Each dimension requires supporting properties or an explicit uncertainty
statement. It compares the design's own roles and patterns rather than enforcing a
fixed spacing scale, type-count budget or arbitrary pixel cutoff.

## Severity and quality gate

| Severity | Meaning |
| --- | --- |
| HIGH | Likely harms hierarchy, usability, comprehension or major composition. |
| MEDIUM | Noticeable, supported quality issue without a major blocker. |
| LOW | Local polish or consistency issue with limited impact. |

Severity measures impact; evidence confidence is separate. Findings are consolidated
by root problem, ordered by severity/impact/document order/ID, and referenced as C01,
C02, etc. within that snapshot. Every issue includes Problem, Why it matters,
Recommendation and Evidence with actual nodes and observed values.

| Quality gate | Meaning |
| --- | --- |
| PASS | No HIGH issues, only limited localized MEDIUM issues, and no major concerns in adequately inspected scope. |
| NEEDS_REVISION | A HIGH issue, or cumulative significant MEDIUM issues affecting a key task, comprehension, hierarchy or pacing. |
| BLOCKED | Missing required evidence, unreadable/ambiguous/incomplete design, unstable source or unavailable enforcement/integrity verification. |

The gate depends on impact and coverage, not a score or issue count alone.
`FIGMA_CRITIQUE: PASS` means the review completed reliably with comparable read-only
evidence unchanged. It can accompany `QUALITY_GATE: NEEDS_REVISION`. A blocked or
integrity-failed review emits `FIGMA_CRITIQUE: FAIL`. Optional ratings remain secondary
and unknown dimensions are unrated.

## Read-only guarantees

The command explicitly says “Do not modify Figma.” The locally discovered OpenCode
plugin `.opencode/plugins/figma-critique-guard.js` arms a persistent session guard
before the critique prompt is admitted. It preserves model-visible tools and rejects
non-allowlisted tools before execution, including nested calls. A permission hook
also denies non-read actions even when ordinary configuration would allow them.

The permitted Figma inspection tools are explicitly enumerated; unknown/future tools
are denied. Local read/glob/grep are allowed for project instructions and paged tool
output. Approved inspection tools are exposed directly. Code Mode is blocked during
critique: pinned OpenCode 2.0.24 exposes a network fetch extension outside nested
tool hooks. Shell execution, browser tools, custom scripts, delegation,
Figma authoring, component changes, reactions and motion writes are excluded.

The guard persists through tool continuations, queued/steered follow-ups, compaction
and plugin reloads. A new prompt after an idle boundary releases it for the next
ordinary task. A queued revision during critique stays read-only; submit it again
after completion. Other sessions and ordinary commands retain their existing access.
If the guard marker is missing, the command must stop before any tools and report
BLOCKED. Setup requires both the command and guard, and both distribution allowlists
include them. Installed OpenCode 2.0.24 is the compatibility reference.

OpenCode commands have no per-command permission field; enforcement uses supported
[plugin hooks](https://opencode.ai/v2/docs/build/plugins) rather than inert frontmatter.
See the [Code Mode tool contract](https://opencode.ai/v2/docs/tools) for its sandbox and
nested permission model. No MCP executable, plugin dispatcher or Figma bridge code
was changed for this milestone.

## Evidence model

Evidence includes actual IDs/names/types, parent/child relationships and ordering,
geometry, fills/styles (resolving deduplicated `globalVars`), text/typography, padding,
Auto Layout outlines and spacing, component-family references/overrides, and reactions
where relevant. FRAME, SECTION, TEXT, COMPONENT, COMPONENT_SET and INSTANCE are native
node types; Auto Layout is inferred from `layoutMode`, not a fabricated node type.

Before/after checks use the same scope and read parameters, plus inspected dependencies
and reactions. A changed page identity or comparable property blocks completion.
An exposed-property fingerprint proves only those properties, not every Figma property
or other page. No screenshot, complete rendered visual analysis, or responsive behavior
is implied by a structural review. Strong structural evidence can be high confidence;
aesthetic observations require rendered or otherwise supporting evidence.

The browser freshness collector remains unchanged: it fingerprints a dependency-closed
Interactive App runtime, not arbitrary production designs. Critique uses the existing
general-purpose inspection tools instead of changing that projection or its version.

## Tests

`npm test` includes command contract and guard behavior tests. They cover command
presence/agent, zero mutation instructions, all priorities/issue fields/dimensions,
quality markers, unsupported praise/claims, tool allowlisting, pre-dispatch rejection,
permission denial, session isolation, steering/queue/reload/compaction, failure-closed
behavior, setup enumeration, distribution allowlists, and fixture structure.

`scripts/setup.test.ps1` includes missing-command and missing-guard fixtures as well
as the existing source/release regressions. CI runs the new offline tests through its
existing npm and release-check steps; no hosted model or live Figma is required in CI.

`scripts/figma-critique-acceptance.mjs` is an opt-in model test. Set
`FIGMA_CRITIQUE_API` to an existing local OpenCode acceptance server and set its
`OPENCODE_PASSWORD`. `FIGMA_CRITIQUE_CATALOG` points to the existing executable's
tools/list JSON (defaults to ignored `.figma-designer/acceptance/catalog.json`). Run
`node scripts/figma-critique-acceptance.mjs` from the repository. It copies the actual
command/agent/guard into isolated ignored locations and uses test-only stdio MCP
fixtures; it has no Figma/WebSocket connection. The model defaults to the existing
free model for tests; `FIGMA_CRITIQUE_MODEL` can select another available test model
without changing project defaults. Reports, traces and call logs remain ignored.

The five cases are a reasonably good design (A), inconsistent actions/spacing (B),
an empty page (C), three consecutive card layouts (D), and consistent component
instances (E). The harness checks quality/completion markers, priority expectations,
repetition/reuse evidence and zero dispatched writes. A separate mock-only adversarial
probe must exercise a real denial, not just an LLM refusal.

## Acceptance results

Validated on Windows on 2026-10-09 with OpenCode 2.0.24, the unchanged approved
local MCP executable, localhost bridge at `127.0.0.1:1994`, and the connected Figma
development plugin. The project model/default agent and runtime policies were preserved.

Local checks: **29/29 npm tests passed**, including eight critique/guard contracts.
Command contracts also passed with CRLF checkout text; the test reader normalizes
line endings so Windows checkout formatting does not change semantic assertions.
All **22 setup fixtures passed**, including missing critique and missing guard.
Source release checks passed (JSON/PowerShell/JavaScript, approved configuration,
allowlists, setup regressions and packaging mismatch stop). Syntax checks also covered
the guard and test-only MCP fixture connector. CI uses the existing workflow.

The actual slash command reviewed the existing non-sensitive `Untitled` file,
page `0:1` / `Page 1`, root `2:2` / `Velvet Brew — Website` (1440×6825).
The full-page run emitted `QUALITY_GATE: NEEDS_REVISION`, `FIGMA_CRITIQUE: PASS`,
and no HIGH findings. Concrete evidence included:

- `Story Badge` (`2:204`): x=24, width=540 inside a 540-wide parent (`2:202`),
  extending 24px past its right edge. `Tile Caption` (`2:309`) similarly extends
  20px beyond its 400-wide parent (`2:307`). Clipping was explicitly unknown.
- Muted body text `#8a6e52` on the verified cream/card fills: color-pair ratios
  approximately 4.12:1 / 4.40:1. Composited opacity was not exposed.
- Strength: the production sections consistently use 1200-wide inner frames at
  x=120 inside the 1440-wide page. Actual node IDs were provided.

Independent before/after reads used the existing `canonical-json-sha256-v1`
fingerprint helper, without modifying its browser projection or freshness logic:

| Evidence | Before and after SHA-256 |
| --- | --- |
| Current-page `get_document` data | `6442110878a03ed00f3214af90db700d0b391370fc1b2cc7d694a0c5d90386cd` |
| `2:2` layout outline, depth 5 | `0a2e47e6dfd5ab7e1cceb13b15286f633bf2352238f33589225317c210e1d763` |

Both fingerprints matched. The current page remained **398 nodes**: PAGE 1,
FRAME 204, TEXT 177, RECTANGLE 16. The full-page command trace contained only
allowlisted Figma reads; **zero Figma mutation calls**. This proves stability of
exposed current-page properties and the sampled layout outline, not every hidden
property or other page. No Figma acceptance document was created or modified.

A final focused run reviewed Gallery (`2:297`) with the final critique contract.
It emitted `QUALITY_GATE: NEEDS_REVISION` / `FIGMA_CRITIQUE: PASS`, with 1 HIGH,
1 MEDIUM and 2 LOW findings. The main finding used the actual caption/tile bounds
above; strengths verified the 24px collage gutters and exact 1200px row sums.
The trace contained **66 allowlisted Figma read calls and zero writes**. Independent
full-page and layout fingerprints still matched after this run. This also verified
the same-command focused-subtree workflow without revising or duplicating sections.

Model acceptance also used the actual command/agent/guard against isolated MCP
snapshots, without a Figma connection:

| Case | Result | Quality evidence |
| --- | --- | --- |
| A — reasonably good | PASS; no HIGH; 12 reads | Consistent type/spacing and one dominant CTA recognized. |
| B — inconsistent controls | NEEDS_REVISION; HIGH supported; 20 reads | 10px white primary label on `#d9e0ee` against a much larger, darker secondary action; actual `10:5` / `10:6` evidence. |
| C — empty page | BLOCKED; critique FAIL; 18 reads | No production root; uncertainty rather than invented defects. |
| D — repeated cards | PASS; no HIGH; 8 reads | Three ordered matching grids `10:30` / `10:50` / `10:70` and nine identical body strings support a bounded repetition finding. |
| E — consistent instances | PASS; no HIGH; 24 reads | Both controls resolve to component `20:2`; same-action reuse correctly retained and canonical state library excluded from production judgment. |

Initial runs exposed over-criticism of whitespace and repeated CTAs. The command
and critique system instruction now require demonstrated present impact, keep
conditional preferences in coverage, and explicitly protect legitimate same-action
reuse. The fixture runner reloads cached locations and accepts Markdown-formatted
counts before asserting the gate; no production runtime behavior changed.

A separate adversarial mock probe attempted valid `write_html` and `set_fills`
calls through Code Mode. Both returned `FIGMA_CRITIQUE_READ_ONLY: blocked tool`
with their actual tool names. **No request reached the mock connector.** Ordinary
session isolation and later idle-boundary unlock are covered by offline hook tests.
Local reports/traces are retained under ignored `.figma-designer/`; authentication
and local acceptance configuration are excluded from distribution.

## Limitations and future integration

The command is a model-guided critique, not a deterministic aesthetic analyzer.
Finding wording and judgment can vary between models/runs. Stable finding references,
node IDs, evidence fields, coverage and gates make it suitable for a later revise or
design polish pass; that pass must re-read current nodes and obtain its own write scope.

Current serializers omit some visibility, clipping, opacity, mixed-run and component
details. Supplement with existing inspectors where possible; otherwise say
“Not enough evidence to evaluate reliably.” Missing reaction data does not prove
an inert instance, and missing reactions in a static design are not automatically a
defect. Color ratios need verified backgrounds/compositing. Repeated component controls
are not visual monotony by themselves. Frame overflow is a risk at the observed width,
not evidence of a tested responsive failure. Optional screenshot absence alone does
not block a well-supported structural review.

## OpenCode free-tier compatibility — V1.2.2.1

The initial context hook deleted forbidden tool schemas. Official OpenCode requests
then failed before inspection with HTTP 403, “OpenCode's free tier can only be used
from within OpenCode.” Upstream reports describe the same failure when standard
shell/read definitions disappear ([#51241](https://github.com/anomalyco/opencode/issues/51241),
[#50627](https://github.com/anomalyco/opencode/issues/50627)). Reduced request catalogs
are the strongest supported diagnosis; the provider's internal validator was not
inspected. No client identity, headers, credentials or model defaults were changed.

The guard now leaves every incoming context tool definition intact. Execution and
permission hooks still deny everything outside the explicit read allowlist, including
unknown tools, shell, file writes, browser actions and delegation. This is a catalog
compatibility correction, not permission to execute visible forbidden tools. The
activation marker, session persistence and idle-boundary release remain unchanged.

Pinned 2.0.24 source inspection also corrected an earlier assumption: its Code Mode
[web extension](https://github.com/anomalyco/opencode/blob/v2.0.24/packages/core/src/codemode/web.ts)
exposes `fetch` outside nested tool hooks. The guard therefore rejects `execute`
itself before interpretation. Direct `figma_critique_<read-tool>` aliases reference
the existing inspection executors; original tools and Code Mode options remain
available to ordinary authoring sessions. No MCP operation or runtime was added.
The command's evidence/output contract is unchanged; its implementation guidance
now describes direct reads and visible-but-forbidden tools truthfully.

Behavior tests exercise a frozen catalog, direct/nested rejection, permission denial,
safe alias registration without replacing original executors, session isolation,
steering/reload persistence and ordinary execution after idle. Live isolated probes
returned actual guard errors for a valid mock Figma write, harmless shell command,
local file creation and Code Mode write/shell/network attempts. Only health/document
reads reached the disconnected mock connector; no sentinel file was created. Nested
probes are rejected at the wrapper boundary, before nested JavaScript runs.

The first successful logistics review on root `10:783` emitted NEEDS_REVISION and
FIGMA_CRITIQUE: PASS. Its whole-page observable JSON fingerprint matched before/after
(`9a64c2b4af26aa01028f81267305c220ea932afb5857dba35ea2c39c06ee3526`). A test-location
reload interrupted a read during that review; it recovered with health/readback.
The final alias architecture then completed a clean independent logistics review:
**33 approved Figma reads, zero writes, NEEDS_REVISION (2 HIGH / 6 MEDIUM / 2 LOW),
FIGMA_CRITIQUE: PASS**. The model verified the guard marker before its first read;
before/after page SHA-256 remained the value above and all four protected root
fingerprints matched. No provider 403 occurred. The differing finding counts between
the two reviews are retained as model variability, not treated as evidence of design
improvement: the logistics design was never changed or polished during this fix.

The A–E fixture rerun produced A PASS (16 reads), B NEEDS_REVISION (24), C BLOCKED
(15), D PASS (21), E PASS (18), all with zero writes. C's initial run had no MCP
tools in its first catalog and correctly refused to invent evidence; the runner
now waits for fixture connection status before starting the command. This changes
test readiness only, not production timeout or MCP policy. Raw reports and probes
remain in ignored `.figma-designer/guard-compatibility/`; temporary API authentication
is outside the repository. Earlier acceptance history above is retained.

The enforcement boundary is a correctly loaded guard on the supported OpenCode version.
Deliberately disabling/replacing local plugins or using a different connector/client is
outside this command's guarantee. Future richer rendered/property evidence could justify
a dedicated read analysis primitive; no new MCP primitive is needed in this phase.

V1.2.2.1 also completed final editorial acceptance on `19:43`: guard marker confirmed
before the first read, **26 successful approved reads / zero writes**, no provider
403, QUALITY_GATE: PASS (0 HIGH / 2 MEDIUM / 2 LOW), FIGMA_CRITIQUE: PASS. The clean
page before/after SHA-256 is
`a8acf0c46d576185e02b69cc2775061eaeec72667228c818f42b409ce7b25ab2`;
root SHA-256 is `617310d23a260ea711c67c597032d70f69ed7420a9ac96de600f0e5d8c434cc2`.
The prior logistics gate remains NEEDS_REVISION; no design was revised to force a gate.
Final automated checks passed 39 npm, 275 plugin, 67 hardening/source tests and all
22 setup fixtures, plus source/release/privacy validation and approved runtime hashes.
The updated synthetic runner passed all A–E review cases and actual direct/nested
mutation, shell, file-write and network rejection probes. Extra approved reads during
a probe are permitted; every forbidden action still returned a real guard error.
MCP executables, plugin runtime, model defaults and provider authentication remain
unchanged. V1.2.3 closure evidence is in `DESIGN_GENERATION_V2.md`.

FIGMA_CRITIQUE_GUARD_COMPATIBILITY: PASS

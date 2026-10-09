# Commands

Enter these in OpenCode chat while opened in the extracted project folder. Each `/figma/*` command selects `figma-designer`; ordinary chat retains `web-designer` compatibility.

## `/figma/setup`

Prepare/check local dependencies and the connection.

Technical scope: May install local Playwright/Chromium when missing; use setup.ps1 first. It uses read-only Figma checks.

## `/figma/doctor`

Find out whether you are ready to design.

Technical scope: Read-only health/document/local checks; follow repair guidance before design.

## `/figma/design`

Create a new editable page or requested production area.

Technical scope: Builds production only, in sections; inspect before writes.

## `/figma/revise`

Change a specific part of the current design.

Technical scope: Uses focused existing subtree updates and preserves unaffected layers.

## `/figma/critique`

Review the current design and identify prioritized quality issues. Optionally name
a root or section after the command. With no target, it reviews current-page
production roots and keeps system artifacts separate.

This is read-only: recommendations are text, and the OpenCode critique guard allows
only inspection tools. It blocks Figma mutations, shell execution, scripts and
delegation during the critique turn, including follow-ups. The sandboxed Code Mode
wrapper can call reads; nested calls and permissions are guarded. Start a new request after
the turn finishes to make revisions. Missing enforcement or changing before/after
evidence blocks completion. No automatic revision is implemented.

The report checks hierarchy, composition, spacing, typography, color/contrast,
consistency, reuse, affordance, CTA clarity, density, section rhythm, readability,
alignment, frame risks and visual repetition where evidence allows. Every finding
includes Problem, Why it matters, Recommendation and actual node/property Evidence.
Strengths also need evidence; incomplete coverage is reported explicitly.

`QUALITY_GATE: PASS` means there are no HIGH issues, only limited localized MEDIUM
issues and no major concerns within the inspected scope. `NEEDS_REVISION` means a
HIGH issue or cumulative significant MEDIUM issues warrant focused revisions.
`BLOCKED` means evidence, design structure, source stability or enforcement prevents
a reliable review. `FIGMA_CRITIQUE: PASS` means the review completed without detected
changes; it can accompany `NEEDS_REVISION`. A blocked review ends with
`FIGMA_CRITIQUE: FAIL`. This gate is not responsive or full visual certification.

Illustrative output (names, IDs and values below are examples, not live evidence):

```text
FIGMA CRITIQUE
Overall:
Structural review of Landing (10:1): the primary action is clear, but one card's
padding compresses its copy relative to matching peers. No rendered screenshot.

HIGH PRIORITY
None observed

MEDIUM PRIORITY
C01. Card padding inconsistency
Problem: Card C uses 8px padding; matching Cards A and B use 24px.
Why it matters: Its equal-length copy has a different reading width and grouping.
Recommendation: Bring Card C's padding into the established 24px treatment.
Evidence: Card C (10:8), Card A (10:2), Card B (10:5); four-sided padding 8/24/24px.
Confidence: HIGH.

LOW PRIORITY
None observed

STRENGTHS
- Primary actions (10:12, 10:16) resolve to the same component family (10:20).

COVERAGE / LIMITATIONS
Hierarchy, spacing, typography, consistency, reuse and alignment evaluated.
Other dimensions: Not enough evidence to evaluate reliably in this scoped example.
Before/after: root identity, descendant counts, child order and inspected properties
match. Only exposed structural properties were compared; responsive behavior untested.

SUMMARY
- 0 high-priority issues
- 1 medium-priority issue
- 0 low-priority issues
Gate reason: one localized issue; no major usability/structure concern observed.
QUALITY_GATE: PASS
FIGMA_CRITIQUE: PASS
```

Use finding references with `/figma/revise` in a later request. The revision must
re-read those nodes before changing anything. See [Critique V1.2.2](CRITIQUE_V1_2_2.md)
for the enforcement, evidence limitations and acceptance results.

## `/figma/states`

Create supported component appearances such as hover and pressed.

Technical scope: Production is read-only; writes the separate Component States library.

## `/figma/flow`

Wire a focused journey through existing screens.

Technical scope: A focused journey is not complete interface coverage; writes the separate runtime.

## `/figma/interactive`

Audit and build supported working behavior across the interface.

Technical scope: Uses Interactive App and verified source components; reports FIGMA_LIMITED and undefined behavior truthfully.

## `/figma/motion`

Validate and apply motion to existing interactions.

Technical scope: Changes eligible transitions only; preserves trigger/action semantics and null SCROLL_TO transitions.

## `/figma/qa`

Review the design and interface quality.

Technical scope: Zero Figma writes; reports unsupported or incomplete behavior.

## `/figma/browser`

Export the accepted runtime as a local browser interface.

Technical scope: Zero Figma writes; begin/finish source collection binds the export to live evidence.

## `/figma/browser-test`

Test browser navigation and export constraints.

Technical scope: Needs local Playwright/Chromium and an export; PASS is not complete business/state/visual validation.

## `/figma/status`

Compare saved test evidence with files and the live source.

Technical scope: Acceptance is separate from CURRENT, STALE, and UNVERIFIED; reads the live source without Figma writes.

## `/figma/version`

Show the system and runtime version information.

Technical scope: Public release v1.2.1-beta.1 differs from system 1.2.1, MCP 1.2.0-standalone-hardening, and schema 2.

## Suggested order

setup → doctor → design → critique → revise as needed. Once accepted: states → interactive → motion → qa. Use flow for a defined journey. Then browser → browser-test → status. Version is always informational. See [Known limitations](KNOWN_LIMITATIONS.md).

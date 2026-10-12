# Adaptive briefing inside `/figma/design` — V1.2.3.1

The existing command now evaluates input quality before Design V2 Pass 1. It asks
only questions whose answers could change structure, hierarchy or art direction.
Detailed requests proceed directly; no command, alias, MCP capability or mandatory
form is added. README and the beginner command list remain unchanged.

## Decision model and question budget

Read the request and relevant existing Figma source. Existing typography, colors,
components and spacing may settle brand/style choices; unrelated screens do not
define a new brand. Explicit user direction wins. Missing fields alone do not
justify questions: useful defaults and meaningful assumptions resolve minor gaps.
Product, requested areas and visual direction normally give enough direction.
Infer ordinary purpose from menu/visit, work/contact or operational data. Choosing
a palette, finer substyle, sample taxonomy or arrangement remains the designer's
job. Do not turn those choices into an interview or reopen the requested scope.

| Request | Questions |
| --- | --- |
| Detailed / enough to design | 0 |
| Mostly complete / one material choice open | 1–2 |
| Partial / several material choices open | 2–4 |
| Very vague | Maximum 5–6 |

These are ceilings, not quotas. At most six distinct decisions per round and six
total questions by default, across at most two rounds. Subquestions count too.
Never repeat a semantic question. A second round addresses only a major new
unresolved decision; low-value gaps do not block design. After the budget, resolve
remaining choices with meaningful assumptions and continue.

## Questions and examples

Choose relevant questions about purpose/use context, primary action if applicable,
content, visual character, useful brand inputs, ambiguous form factor or constraints.
Use plain language and a few neutral alternatives with an open reply or “Something
else”. No default software-stack, hosting, database or authentication discovery.
Do not force supplied assets, demographic profiles, marketing CTAs, extra business
sections or a clean/modern/SaaS house style.

- “Make me a coffee shop website.”: ask about menu/visits/reservations, needed areas
  and visual character where source does not answer them.
- “Design a dashboard.”: ask what it monitors and which data/tasks matter first;
  no coffee, marketing hero or testimonial questionnaire.
- Detailed Velvet Brew, logistics and editorial benchmarks: proceed directly.
- Compact inventory screen with table, filters, warnings and restrained styling:
  usually proceed directly; absence of a marketing CTA is not a gap.

## Escape hatch and continuation

“Just decide for me”, “Use your judgment”, “Make reasonable assumptions”, “Skip the
questions”, “Surprise me” and equivalents end interviewing immediately. Preserve
stated constraints and style; mark unknown facts or use labelled sample placeholders.
Never fabricate verified addresses, customers, reviews or other business facts.

Questions appear in ordinary chat. Finish the question turn without V2 planning or
Figma authoring. Plain replies resume the original task; users need not invoke
`/figma/design` again. Combine the original request, all answers, relevant source,
ownership/placement scope and question history. Retain rounds/counts and unresolved
decisions in compact conversation state through compaction. Partial answers do not
restart the interview; autonomy in any reply ends it.

## Working brief and Design V2 integration

Internally assemble PRODUCT, PURPOSE, PRIMARY ACTION (if applicable), CONTENT,
STYLE, PLATFORM, BRAND (where relevant), CONSTRAINTS and meaningful ASSUMPTIONS.
This is not a public file or a long reasoning dump. Unknown minor fields can remain
unknown. Feed that brief into the existing ten Design V2 passes; those passes remain
authoritative and do not restart the interview.

Read-only health/document/system inspection is allowed before briefing completes.
No authoring, font-probe nodes, scratch layers or half-built design while awaiting
answers. Briefing does not invoke critique or alter its persistent guard, provider
tool catalog, execution restrictions or permissions. Runtime, approved hashes,
timeouts, source freshness, component-state and reaction/motion ownership stay intact.

## Tests and acceptance

Contract tests extend `scripts/figma-design.test.mjs`; product/continuation fixtures
are in `scripts/fixtures/adaptive-briefing.json`. They cover the twenty requested
contracts, question budgets/state, source reuse, neutral wording, V2 ordering,
unchanged command enumeration and the normalized critique-guard source checksum.
The existing npm suite already includes this test file; no new test framework or
dependency is needed. The source archive enumerates the new fixture and report.

Initial model-guided trials exposed two real boundary errors: plan-only mode was
mistaken for autonomy, and supplied style/content were reopened for optional
substyle, taxonomy and scope questions. The instructions now explicitly reject
those interpretations; regressions cover both. No acceptance document was modified
in these synthetic trials. One source-context trial ended with an empty provider
response; its trace was retained and a read-only retry was run.

Plan-only acceptance used the actual installed OpenCode 2.0.24 command and configured
free provider, with a synthetic inspection-only MCP fixture and no live Figma access:

| Case | Observed route / numbered questions |
| --- | --- |
| Vague café / dashboard | Briefing / 4 each |
| Vague portfolio / business / travel | Briefing / 5 each |
| Café with desktop, menu/story/visit and purpose, missing style | Briefing / 1 |
| Detailed V2 briefs A–E (hospitality, editorial, logistics, geography, inventory) | V2 planning / 0 each |
| Portfolio with explicit autonomy | V2 planning / 0 |
| Local profile extension inheriting inspected source | V2 planning / 0 |
| Plain café answer plus “you decide anything else” | Same-session V2 planning / 0 |
| Partial answer plus permission to assume demo details | Same-session V2 planning / 0 |

Both continuations retained `figma-designer`, original scope and supplied answers;
no command reinvocation was sent. All fifteen cases completed with only inspection
calls (83 across recorded synthetic trials, including retries), zero Figma writes.
Counts measure numbered questions; semantic subquestions also count toward the
instruction budget and require model/manual review. These traces demonstrate
representative behavior, not a deterministic completeness classifier.

Local regression results: 70 npm contracts (including 39 design contracts and
critique guard compatibility), 275 plugin tests, 67 hardening/variants/source tests,
22 isolated setup fixtures, release/source syntax/config/allowlist checks and
privacy-scanner self-checks passed. The critique guard's LF-normalized SHA-256
remains `884fc738f8464cfc4c9a6d3ddfe16579b58662517bfca2f9023d96e28bb2bfaf`.
No command, MCP/runtime, approved hash, setup/default or provider-tool changes.

### Live orchestration — 2026-10-12

Actual `/figma/design` ran through the existing local MCP/desktop plugin in the
authorized non-sensitive `Untitled` document, page `9:306`. Existing pages, five
production roots and four editorial component masters were snapshotted and protected.

The vague café prompt asked two numbered questions covering purpose/content and
visual character (three semantic decisions), made three Figma inspection calls and
zero writes, then stopped for an answer. The complete page fingerprint was identical:
`9a64c2b4af26aa01028f81267305c220ea932afb5857dba35ea2c39c06ee3526`.
The ordinary answer supplied neighborhood/menu/visits/warm/quirky/desktop and
“you decide anything else”; no command was reinvoked. The same session retained
`figma-designer`, closed briefing, planned V2 passes 1–6 before writes, then generated
and inspected one native frame `28:283` at `(6000, 0)`, `1440×2386`: 147 nodes,
61 FRAME and 86 TEXT. Its five areas are masthead, welcome, menu, visit and footer.
No further questions; one focused polish pass, final readback and unchanged protected
fingerprints. No components/reactions/system containers or duplicate roots added.

Six HTML writes timed out during café authoring. The trace re-read indeterminate
results, repaired incomplete same-run subtrees and removed six verified orphan TEXT
duplicates before final acceptance. These were authoring recovery, not extra polish
passes. The generated report overgeneralized dropped metrics as an importer-wide
limitation; its HTML used unitless CSS lengths, so that attribution is not established
by this acceptance. No runtime/timeout change was made. Native final structure and
briefing orchestration, rather than claimed visual perfection, are the acceptance proof.

The detailed desktop inventory request supplied navigation, search, filters, three
sample table rows, stock warnings, bulk actions and restrained/compact styling.
It asked zero questions, planned V2 before authoring and completed one native frame
`29:464` at `(8200, 0)`, `1280×500`: 222 nodes, 139 FRAME and 83 TEXT, with
three labelled sample inventory rows.
Relevant operational source evidence supplied its type/color direction. One focused
polish corrected measured overflow; five timed-out writes were reconciled, including
confirmed late duplicate children. Final readback found one new production root,
no loose page-level leftovers, and unchanged café/existing roots and component masters.
Numeric header alignment remains a disclosed cosmetic limitation; no responsive or
interactive behavior is claimed. This is compact orchestration acceptance, not a
new broad visual-quality benchmark campaign.

Both actual-command cases emitted `FIGMA_DESIGN_V2: PASS` only after verification.
Page count, names and IDs stayed unchanged; ownership was limited to the two isolated
new frames. Raw traces, snapshots and fingerprints are retained locally under the
ignored `.figma-designer/adaptive-briefing/` directory. No automatic critique command
was invoked; its persistent guard source and behavior regressions remain intact:
`FIGMA_CRITIQUE_GUARD_COMPATIBILITY: PASS`.

## Limitations

Completeness and question usefulness remain model-guided. Budgets and authoring
boundaries are command/agent instructions, tested through contracts and actual
model traces; this phase adds no new runtime lock. Users can always choose
assumptions. This is not product/user research, and technical implementation
discovery is not included by default. Future model changes can affect judgment;
meaningful human answers and focused revisions remain useful.

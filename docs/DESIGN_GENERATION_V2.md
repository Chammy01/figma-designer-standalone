# Design Generation V2 — V1.2.3

`/figma/design` remains the beginner entry point. This milestone improves planning,
brief fidelity and inspection using the existing native Figma authoring/read tools.
It adds no MCP capability, new command, dependency or runtime policy.

## Previous generation and V2 architecture

The previous command concentrated on direct section authoring and recovery. It did
not require an explicit information architecture, brief-derived art direction,
composition map, role system or bounded evidence-led polish. Those omissions allowed
template habits and arbitrary styling; they do not prove every previous design was
generic. The existing Velvet Brew baseline already has several different compositions.

The command selects `figma-designer`; the agent points to the ordered passes in
`rules/figma-design-rules.md`. Passes 1–6 finish before authoring writes. A compact
direction/scope update is enough; the final report does not expose internal reasoning.

| Pass | Decision or verification |
| --- | --- |
| 1. Brief interpretation | Product, purpose, requested content, stated/implied audience, style, priorities and constraints. |
| 2. Information architecture | Meaningful section order or application work areas; primary versus supporting information. |
| 3. Art direction | Brief-derived character, type relationship, surface/color/image strategy, density and decorative language. |
| 4. Composition and rhythm | Content-driven focal points, scale, alignment, whitespace and varied appropriate section anatomy. |
| 5. Typography | Small role hierarchy, supported fonts/weights, truthful substitutions. |
| 6. Color/surface/spacing | Limited semantic roles and coherent rhythms with justified exceptions. |
| 7. Native authoring/reuse | Editable layers, suitable Auto Layout, stable production roots and justified verified components. |
| 8. Anti-generic check | Identify unjustified default patterns while retaining useful intentional repetition. |
| 9. Internal inspection | Stable production-root readback, concrete node/property evidence and honest uncertainty. |
| 10. Focused polish/final verification | At most one supported polish, then verify content, order, native structure, ownership and completed writes. |

## Design principles and brief fidelity

Prefer hierarchy over decoration, composition over card proliferation, typography
over chrome, content-driven layout over repetition, purposeful whitespace, style
fidelity, visual rhythm and native structure. Repeated cards, pills, gradients,
centered heroes, shadows and equal section dimensions are review prompts, not bans.
Tables, controls and repeated data should remain consistent rather than receive
arbitrary marketing-page variation.

Warm, colorful and quirky cannot silently become minimal beige SaaS. Editorial
work should use typography/scale rather than default icon cards; a dense application
must preserve work areas and compact operational hierarchy. The rules include
possible coffee, editorial, dashboard, playful, luxury, utilitarian and retro
directions as examples, not mandatory templates or one house style.

Requested content governs scope. Do not automatically add pricing, testimonials,
logos, newsletters or FAQs. Do not invent business logic, destinations or verified
awards, customers, reviews, addresses or partnerships. Fictional copy/data must be
identified as sample content. Unsupported image sourcing requires truthful
placeholders or native visual compositions rather than claimed stock photographs.

## Components, polish and reliability

Reuse verified existing components or establish static masters for truly repeated
functional anatomy. Unique decoration and unrelated cards do not need one component.
Verify instance type, actual source component and component-set identity where
applicable; name matching and component cloning are not proof. This does not create
canonical state libraries or change component-state/reaction architecture.

Inspect after the first stable draft. Fix only supported, scoped issues in one
automatic polish pass, or skip it when no defensible issue exists. Preserve valid
unconventional choices and unaffected IDs. Final readback remains mandatory even
when polish is skipped. Report remaining defects instead of hiding them behind PASS.

Timeout reconciliation, completed-work preservation, duplicate-root protection,
matching coordinate systems and ordering recovery remain explicit. A timed-out write
is indeterminate; re-read and stabilize before retrying missing work. Correctness
recovery is not permission for a second aesthetic pass.

Internal design inspection reuses critique evidence principles conceptually. It
does not automatically invoke `/figma/critique`, disable/reset the guard or unlock
an active critique. An independently invoked critique follows only after generation
is idle. The persistent critique guard and command remain unchanged.

## Tests and acceptance prompts

`scripts/figma-design.test.mjs` adds eight command/rule/fixture contracts covering
the seventeen requested workflow requirements and source/test registration. The
existing npm suite includes critique guard, evidence and browser/source contracts;
the existing MCP timeout/recovery tests remain unchanged. The five reference
briefs are in `scripts/fixtures/design-v2.json`; their expected strategies are
test inputs, not proof that a model actually generated those layouts.

| Case | Prompt summary | Expected distinction |
| --- | --- | --- |
| A | Rich, playful Velvet Brew coffee website; nine requested regions; warm, colorful and handcrafted. | Expressive hospitality, image-led/editable visual areas, menu and varied sections. |
| B | Independent art-director portfolio; intro, work, profile, clients, contact; editorial and unconventional. | Typography-led scale/asymmetry and restrained card use. |
| C | Logistics dashboard; sidebar, overview, deliveries, exceptions, activity, actions; practical and dense. | Application shell, readable data and strong operational grouping. |
| D | Geography learning app; navigation, challenge, progress, topics, achievements; playful and controlled. | Dominant challenge with subordinate progress and friendly visual roles. |
| E | Inventory screen; navigation, search, filters, table, warnings, bulk actions; compact/utilitarian. | Operational toolbar/table with little decoration and no promotional sections. |

Automated checks: **37/37 npm tests**, **275/275 plugin tests**, and **67/67
hardening/variant/live-source tests** passed. Release checks passed all 22 setup
fixtures, source enumeration, syntax/config checks, privacy checks and approved
artifact hashes. A source test initially encountered sandbox temporary-directory
EPERM; its rerun with normal temporary-directory access passed without code changes.

D and E also ran the actual command in PLAN_ONLY mode against the existing
read-only synthetic connector (no WebSocket or Figma access). They produced
challenge-led atlas/learning and compact inventory-table strategies, respectively.
No authoring tool was available or dispatched. These are planning checks, not native
generation acceptance. The initial D plan invented an age range from "children";
the brief rule was tightened against invented demographics and a fresh plan kept
age/reading level unknown. Both the initial observation and rerun are retained in
ignored local evidence rather than treating the initial plan as compliant.

## Live acceptance, comparisons and critique results

The user authorized the existing non-sensitive `Untitled` file and isolated
acceptance areas for a previous-command editorial baseline and V2 coffee, logistics
and editorial outputs, preserving the existing Page 1 coffee baseline. Four pages
were planned, but Figma rejected page 4 because the file's Starter plan permits
three pages. The remaining examples use separate frames at x=2200 on the two
acceptance pages; every pre-existing root is independently fingerprint-checked.
Each generation must record before/after roots and native structure;
each independent critique must record its unedited gate/findings and identical
before/after structural fingerprints with read tools only.

Live runs are in progress; no live V2 quality improvement is claimed yet. The
existing V1 coffee baseline and a V1 editorial run support two comparisons.
Screenshots/manual review may supplement structural evidence;
they are not deterministic automated aesthetic proof.

The previous-command editorial run completed on page `8:2`, root `9:15`,
1440×6028: 266 nodes including PAGE 1, FRAME 130 and TEXT 135. Its requested
intro/work/profile/clients/contact content is present, alongside header/colophon.
The screenshot shows expressive serif display, ruled editorial records and native
project plates, so card repetition is not a defensible blanket criticism of V1.
Four write timeouts required readback; late completion produced eight same-run
duplicate leftovers, removed before final verification. This is recovery evidence,
not a visual-quality score. Its independent critique returned **NEEDS_REVISION**:
1 HIGH (small accent/secondary text and CTA contrast), 1 MEDIUM (paper secondary
text reused on the inverted contact band), and 3 LOW (same-role type/token drift
and local frame-bound risk). It explicitly recognized varied section anatomy,
consistent content columns and legitimate editorial scale changes. It used 29 read
calls and zero write calls. The external before/after canonical structural SHA-256
was identical: `ec79a4164e6e34aaf75782e71d198ef9094e1e05253dd4f41e337ba0fcf81282`.

Navigation to the next acceptance page timed out after completing. Readback proved
the target page `9:306` already existed and was current; two matching document reads
confirmed it was empty/stable. The collector resumed that page and skipped the
completed baseline rather than repeating page creation or generation. No timeout
setting or runtime implementation was changed.

V2 coffee completed on page `9:306`, root `10:307`, 1440×5138: 439 nodes including
PAGE 1, FRAME 259 and TEXT 179. Its independent critique returned **PASS** with
0 HIGH, 1 MEDIUM (Featured Card supporting-copy contrast) and 4 LOW (footer contrast,
paired button heights, a conditional divider suggestion, optional row reuse).
It used 26 read calls, zero write calls, and identical external structural SHA-256:
`4b1f8a52d6537c913eb4be904dca1696065791824fd97a42f82885d3677095ce`.

The coffee command performed one focused pass on a literal quote entity and
supported column/opacity discrepancies, then final readback. Delayed writes still
required reconciliation and same-run duplicate cleanup; V2 does not eliminate that
existing runtime limitation. No components were established in this pilot.

Manual screenshot review supplements the structural critique: V2 uses a featured
drink plus supporting rail and a dominant testimonial plus supporting quotes,
where the old coffee used equal drink/review cards. Its brighter terracotta/berry/
marigold/sage roles better reflect the requested colorful direction. V1 already
had a menu list, story split and gallery, and its coffee illustrations are more
detailed; no universal aesthetic superiority or controlled causal improvement is
claimed. A focused menu export confirms the compact heading/list junction is not
a demonstrated overlap, despite appearing tight in a reduced full-page screenshot.

The pilot also added an unrequested mailing-list field and deferred available
reuse. Those observations are retained even though critique returned PASS. The
workflow now explicitly audits unrequested signup/features, accounts for repeated
controls rather than deferring reuse, keeps font probes after planning, and ranks
supported readability/contrast issues before cosmetic cleanup. Remaining briefs
exercise these tightened checks; the coffee pilot is not represented as proof of
those later refinements. Initial screenshots/reports remain unchanged.

## Limitations and future work

This is a model-guided workflow with contract tests, not a deterministic aesthetic
engine. MCP properties support hierarchy, spacing, roles and structure better than
image mood, actual wrapping, clipping or responsive behavior. Omitted properties
remain unknown. Used-font inspection is not a catalog of every available font.

Future work may evaluate rendered evidence and larger repeated acceptance samples,
or share a narrowly justified deterministic analysis helper. No missing operation
currently justifies a new MCP primitive. Automatic revision and multiple polish
cycles remain outside this milestone.

## Logistics V2 live acceptance

Closeout attempt: **2026-10-12**. Earlier observations above are historical evidence
and remain intact. The saved `/figma/design` run was incomplete, so the current
command resumed it in place. Velvet Brew and the V1 editorial baseline were not
regenerated. No V2 rule or MCP/runtime change was made during this closeout attempt.

Prompt:

```text
/figma/design
Create a desktop dashboard for a small logistics company.
Include sidebar, shipment status overview, active deliveries, exceptions,
recent activity and quick actions.
Make it practical, information-dense and easy to scan.
Avoid decorative marketing-page styling.
```

| Evidence | Recorded result |
| --- | --- |
| File/page | Existing authorized `Untitled`, page `9:306` — `Acceptance v2-coffee`. |
| Production root | `10:783` — `Dispatch Board — Daily Operations (Sample Data)`. |
| Location/bounds | Page-absolute x=2200, y=0; 1440×916. Coffee stays at x=0. |
| Native census | 361 nodes including root; 360 descendants; FRAME 193, TEXT 168, INSTANCE 0, COMPONENT 0. |
| Pre-continuation page | 789 nodes: PAGE 1, FRAME 445, TEXT 343; coffee, partial dashboard and one proven same-run orphan. |
| Final page roots | Exactly `10:307` and `10:783`; no orphan or accidental extra production root. |
| Stable root fingerprint | `4f60758879cfb33293abfd333b60b505fed31a4c1a9b4230adecf3ee7ba60526`. |

Strategy: a dark navigation rail, context/filter bar, six operational KPIs and
proportional status bar, a seven-column delivery table, an exceptions/activity
rail, and a compact quick-action strip. IBM Plex Sans/Mono, restrained ruled
surfaces and functional status colors differ materially from coffee's expressive
Fraunces/Karla, large visual areas and stacked narrative bands. There is no
marketing hero, pricing or testimonial section. The saved trace records passes
1–6 before authoring. Sample shipments, clients, routes and metrics are identified
as fictional; this is not a working logistics application.

Requested areas exist: navigation `11:837`, context `11:906`, overview `11:927`,
deliveries `11:978`, exceptions `11:1118`, activity `11:1125`, actions `11:1194`.
The source remains editable FRAME/TEXT structure, not a flattened image.

One automatic polish pass was recorded after inspection: activity overflow corrected,
empty panel bottoms reduced, root/rail/main height reconciled from 1200 to 916,
and two sample delivery rows added for density. Final table order is header →
nine rows → footer. `reorder_nodes` reported an index without achieving the expected
Auto Layout order; a reparent cycle and readback established the actual order.
This failure is retained as recovery evidence, not represented as reliable ordering.

Earlier timeouts produced delayed completion and same-run debris. The continuation
proved and removed orphan `11:865` (duplicate "312"), extra KPI nodes
`11:1016`/`11:1017`/`11:1132`/`11:1133`, duplicate KPI children
`11:977`/`11:1015`, label `11:920`, nav rows `11:903`/`11:923`, and leaked
table cells `11:1134`, `11:1201`–`11:1208`. The existing root and valid completed
content were preserved. Correctness reconciliation is separate from the one
deliberate polish pass; no second aesthetic iteration was performed.

Components were not created. The model cited distinct text/width/status colors
and possible override fidelity loss for independent chips, nav rows and buttons.
That is its explanation, **not a demonstrated missing MCP capability**: it did
not establish a failed supported instance/override operation. Reuse remains a
quality limitation, rather than a reason to claim a new MCP primitive is needed.
Font weight 600 was unavailable for the selected faces; verified 500/700 weights
were used. Parser margin/single-side-border limitations were handled with spacers
and native rule frames, without changing the parser. Additional static nav labels
and shortcut labels are inferred examples, not verified product features or behavior.

Manual screenshot review: the result is recognizably a dense dispatch application,
with the table as the main work area and subordinate operational panels. It is not
the coffee composition recolored. The screenshot also exposes limitations missed
by the generator's structural completion report: the distribution legend is crowded
at the following table boundary (`11:971` reaches local y=36 inside parent
`11:963` height 34), and footer `11:1096` still says "Showing 7 of 96" although
nine rows are present. Small muted labels warrant rendered readability review.
These are manual/source observations, not an automated critique or responsive test.
They were retained without editing the design to obtain a favorable gate.

### Logistics critique and integrity

After authoring was fully idle, the actual `/figma/critique` command was invoked.
The provider refused before model inspection:

```text
provider.auth — HTTP 403
OpenCode's free tier can only be used from within OpenCode
```

One supported first-party CLI attempt with the unchanged command body and same
guarded session confirmed the same refusal. No headers/authentication, model defaults,
guard state or rubric were altered to bypass it. This is an external provider-access
blocker, not a completed critique or a Figma read-capability gap.

| Critique evidence | Result |
| --- | --- |
| QUALITY_GATE | Not emitted. |
| FIGMA_CRITIQUE | Not emitted. |
| HIGH / MEDIUM / LOW | Unavailable, **not zero**. |
| Critique read/write calls | 0 / 0; provider failed before inspection. |
| Concrete findings/strengths/coverage | No critique output; only the separately labeled manual observations above. |
| Before/after page fingerprint | Identical: `9a64c2b4af26aa01028f81267305c220ea932afb5857dba35ea2c39c06ee3526`. |

The identical fingerprint proves no exposed structural change around the failed
attempt; zero calls do **not** prove a successful read-only critique. The original
critique command/guard remain byte-unchanged and their regression contracts pass.

All three pre-existing protected roots also match before/after canonical snapshots:

| Protected root | Unchanged root-scope SHA-256 |
| --- | --- |
| Original coffee `2:2` | `c0c4189ade6a144e47529660d4dd9bf922fd922d2d2c9d268dacd29c4e685c45` |
| V1 editorial `9:15` | `8c3fcccd32e6ce446b85b4af66095d957228f447170d68769dd160a5c0101d99` |
| Completed V2 coffee `10:307` | `5069e2395600c597b92d804a6df08c0d75fe677d6b704c065c45b0176bfbbd5b` |

These hashes use the existing `canonical-json-sha256-v1` mechanism and matching
read scope. Root hashes differ from earlier page hashes because their scope differs;
none is a complete Figma-file hash. The initial other-page loading errors resolved
by activating the known pages before verification; no baseline change was needed.

## Editorial V2 live acceptance

Prompt retained for the next valid attempt:

```text
/figma/design
Create a portfolio website for an independent art director.
Include intro, selected work, short profile, client list and contact.
Make it editorial, typography-led and slightly unconventional.
Use strong scale changes and avoid dashboard-style cards.
```

**Not started.** The provider-access blocker occurred before this generation.
The planned target remains page `8:2`, a new isolated frame at x=2200,y=0.
The V1 baseline `9:15` at x=0,y=0 remains unchanged; it is not a V2 output.
There is no V2 editorial root, native census, screenshot, polish pass, critique,
quality gate or before/after generation evidence to report. No additional page
was created and no substitute fixture is represented as live acceptance.

## Cross-brief V2 comparison

| Dimension | Velvet Brew V2 (completed) | Logistics V2 (completed generation) | Editorial V2 |
| --- | --- | --- | --- |
| IA/anatomy | Ordered narrative website bands. | Rail + work-area table + supporting operational panels. | Unavailable. |
| Composition | Hero split, featured rail, dense menu, lead quote, mosaic, visit plate. | Compact application shell and table/right-rail grouping. | Unavailable. |
| Density/whitespace | Large visual areas with dense menu and calmer narrative moments. | Tight rows/controls, little decoration; polish reduced empty panel bottoms. | Unavailable. |
| Typography | Expressive Fraunces display + Karla functional text. | IBM Plex Sans/Mono with compact role hierarchy. | Unavailable. |
| Color/surfaces | Warm cream, espresso and colorful hospitality accents/bands. | Dark rail, pale canvas, hairline rules, functional statuses. | Unavailable. |
| Cards/repetition | Featured/quote dominance and varied content layouts. | Useful repetition in data rows/status groups, not marketing-card sections. | Unavailable. |
| Actions/grouping | Menu/tasting/visit actions within narrative sections. | Context actions, table utilities and a quick-action strip. | Unavailable. |

Two completed V2 outputs demonstrate more than copy/color substitution. A
three-category claim remains unproven until editorial V2 is generated and reviewed.

V1/V2 conclusions remain mixed and limited: coffee's featured/review anatomy changed
and its requested colorful character is visible, while V1 already had varied sections
and more detailed coffee illustrations. The V1 editorial baseline was already
typography-led and received 1 HIGH / 1 MEDIUM / 3 LOW; there is no matched V2 editorial
result to compare. No V1 logistics baseline exists or is fabricated. Gates from
different model reviews do not establish objective aesthetic superiority.

## Final V1.2.3 assessment

**HOLD — live acceptance is incomplete.** Supported claims: the 10-pass workflow
exists; coffee remains valid; logistics generation completed in its original root;
both completed V2 outputs are native/editable and materially different; no duplicate
production root or unrelated-root mutation remains; one polish pass was recorded
per completed example; critique enforcement remains unchanged. No new MCP or V2
rule modification was needed during this closeout attempt.

Unsupported claims: completed logistics critique, live editorial V2 generation,
three-category differentiation, matched V1/V2 editorial improvement, deterministic
visual perfection, full responsiveness/accessibility, or completed milestone acceptance.

Closeout regressions passed: **37 npm tests** (including critique guard/contracts
and eight design V2 contracts), **275 plugin tests**, **67 hardening/variant/live-source
tests**, **22 setup fixtures**, source/release checks, privacy checks and approved
runtime hashes. Go tests/vet were not run locally because Go/MCP source is unchanged;
the unchanged hosted workflow still runs its Go job. Hosted CI status is reported
with the final pushed commit, rather than inferred from local tests.

Next required evidence, after legitimate provider access is restored: run critique
on existing dashboard `10:783` without another polish or regeneration; then run the
current design command for the editorial brief in the planned isolated area, verify
all protected roots, and run its independent critique after idle. Preserve actual
NEEDS_REVISION results rather than editing examples or the rubric to force PASS.
Adaptive Briefing and the other future milestones remain outside this closeout.

Raw traces, snapshots, screenshot, provider errors and
`closeout-hold-integrity.json` are retained locally under the ignored
`.figma-designer/design-v2/` directory. No auth material is included in the source
allowlist or commit.

FIGMA_DESIGN_GENERATION_V2: HOLD

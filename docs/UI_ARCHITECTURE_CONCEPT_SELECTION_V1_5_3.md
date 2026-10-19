# V1.5.3 architecture concepts and selection

## Decision scope

The product owner delegates design selection to OMP. No preference poll or approval round is needed. The three concepts below start from the creative workflow, not the existing DOM. All preserve existing backend operations, uncertainty semantics and evidence truth. All remove the dominant room and full-height left app rail.

The Impeccable direction seed `seed:77b30a28c97425ac` was consulted as creative input. Product-owner requirements override random assignment. Operate mode limits borrowed visual worlds to typography, palette, density and one signature move, never invented controls. Seven grounded references considered: design proof annotations, exhibition indexes, architectural revision sheets, print production dockets, editorial contents, photographic contact sheets, and typographic specimen sheets. Specimens contribute disciplined type and ruled comparisons, not giant decorative letters. Bitmap specimens, acetate manuals, transit diagrams, orienteering and ticket wallets were declined as literal presentation worlds: they reduce product clarity and audience identification. Useful disciplines retained are whole-pixel rendering, progressive disclosure, explicit stage order, immutable source/evidence distinction and preserved historical outcomes. They do not prescribe product geometry.

## CONCEPT A: Brief and revision workbench

| Dimension | Architecture |
|---|---|
| Product thesis | Keep the brief and design record side by side for rapid revision. |
| Navigation | Horizontal workflow tabs; Runs and Settings as right-aligned utilities. |
| Shell | Top navigation, slim title row, two-column Studio, bottom system disclosure. |
| Studio | 320px left brief/command column; fluid right revision record. |
| Composer | Persistent multiline input in the left column, above optional task context. |
| Conversation | Ruled revision entries in the right document; requests and outcomes paired. |
| Activity | Compact horizontal strip above revision entries. |
| Status | One expandable system disclosure; inline actionable banner. |
| Prototype | Journey requirements left; existing evidence/readiness right. |
| QA | Scope/verdict rail and wide findings ledger. |
| Browser | Preview/Behavior/Motion/Fidelity/Limitations category navigation above evidence. |
| Runs | Intent list left, selected run detail right. |
| Settings | Category index left, preference pane right. |
| Responsive | At 1024px, brief moves above document; utilities stay labeled. |
| Visual direction | Graphite with cool neutral tints, ruled panes and native sans typography. |
| Strengths | Brief stays visible; fast revision; compact activity; good desktop utilization. |
| Weaknesses | Two independent columns compete; brief consumes width after submission. |
| Complexity | Moderate; existing state and hash routes retained. |
| Product risks | Side-by-side geometry could read as another transcript interface; at 900px the architecture changes more dramatically. |

```text
+---------------------------------------------------------------------+
| Figma Designer   Studio  Prototype  QA  Browser       Runs  Settings  |
+---------------------------------------------------------------------+
| Design workspace                                                    |
+-----------------------+---------------------------------------------+
| Design brief          | Activity: inspecting current design          |
| multiline composer    +---------------------------------------------+
| Send / Stop           | Revision record                             |
|                       | request | outcome / next action             |
| Context               | request | outcome / next action             |
+-----------------------+---------------------------------------------+
| System and connection details                                       |
+---------------------------------------------------------------------+
```

## CONCEPT B: Inspect-first canvas

| Dimension | Architecture |
|---|---|
| Product thesis | Inspect the result as the center of the product; revise in context. |
| Navigation | Bottom workflow dock with Studio/Prototype/QA/Browser; top utilities. |
| Shell | Large result stage, contextual right inspector, bottom command shelf. |
| Studio | Main region shows available actual result/evidence; inspector holds revision record. |
| Composer | Full-width bottom command shelf. |
| Conversation | Inspector revision list with expandable requests/outcomes. |
| Activity | Thin stage-edge annotation, no character scene. |
| Status | Top connection disclosure plus inline stage warnings. |
| Prototype | Screen-flow stage with interaction evidence inspector, only available real evidence. |
| QA | Finding-driven canvas navigation with read-only evidence inspector. |
| Browser | Local preview stage and explicit evidence inspector tabs. |
| Runs | Full-screen intent index opening a run's result stage. |
| Settings | Dedicated preferences screen with grouped sections. |
| Responsive | Inspector becomes an inline lower sheet at 1024px. |
| Visual direction | Deep graphite stage, lighter inspector, bright focus boundaries. |
| Strengths | Visually inspectable work; strong creative-tool identity; large result space. |
| Weaknesses | Current API does not guarantee a safe current-design image; no embedded preview surface exists. |
| Complexity | High; new capture/embedding lifecycle beyond presentation refactoring. |
| Product risks | Empty canvas or misleading stale imagery; backend expansion or fake artwork would violate scope. Bottom composer resembles existing placement. |

```text
+---------------------------------------------------------------------+
| Figma Designer                         project       Runs  Settings  |
+--------------------------------------------------+------------------+
|                                                  | Inspect result   |
|          ACTUAL DESIGN / EVIDENCE STAGE           | Revisions        |
|          (only if available and current)          | Limitations      |
|                                                  |                  |
+--------------------------------------------------+------------------+
| Current activity                                                    |
| Multiline command                                     Send / Stop   |
+---------------------------------------------------------------------+
|                  Studio   Prototype   QA   Browser                   |
+---------------------------------------------------------------------+
```

## CONCEPT C: Design document

| Dimension | Architecture |
|---|---|
| Product thesis | Make intent, revision and evidence a continuous readable design document. |
| Navigation | Top horizontal workflow: Studio, Prototype, QA, Browser; utility Runs/Settings separated. |
| Shell | Full-width top bar, concise document heading, one main work surface, quiet footer status disclosure. |
| Studio | Top command surface, compact activity strip, full-width revision ledger below. No permanent side panel or decorative image. |
| Composer | Top of Studio, in the document's reading order, labeled multiline brief/revision command; controls adjacent. |
| Conversation | Revision ledger with request in a narrow annotation margin and outcome in a wide result column. Full request and full response disclose independently. Questions and recovery actions stay visible. |
| Activity | One compact strip: phase plus factual sentence, expandable observed steps and safe technical details. |
| Status | Unified footer disclosure for connection/model/runtime, actionable banner immediately before workspace. Healthy footer stays one line. |
| Prototype | Interaction brief at left with action, factual three-stage capability/readiness sequence at right; QA evidence shared, no invented screen graph. |
| QA | Two-column evidence desk: verdict/integrity in narrow sticky context; filter and findings in wide reading area. |
| Browser | Category selector for Preview, Behavior, Motion, Fidelity and Limitations; one active evidence chapter, independent freshness/integrity truth. |
| Runs | Two-pane journal: intent/purpose/outcome/time index and selected run document. Technical IDs in disclosure. |
| Settings | Native-style category index and one flat preference pane, AI/Figma/Browser/Application. No nested cards. |
| Responsive | Ledger annotations stack above outcomes below 1024px; QA and secondary panes stack at 900px; top nav wraps into a labeled second row. Command remains above long content. |
| Visual direction | Graphite family, luminance-separated command/document surfaces, disciplined Segoe UI, fine rules, restrained square geometry. |
| Strengths | Strongest silhouette change; readable history; direct Describe/Revise action; no unsupported preview dependency; accessible linear reading order. |
| Weaknesses | No always-visible artwork; scrolling long history requires returning to command at top (kept in its own visible workspace row on desktop). |
| Complexity | Moderate; native DOM/CSS with existing structured state, no new store/framework. |
| Product risks | Record must not hide waiting questions or recovery under closed disclosures; independent keyboard access to overflow regions is required. |

```text
+---------------------------------------------------------------------+
| Figma Designer   Studio  Prototype  QA  Browser       Runs  Settings  |
+---------------------------------------------------------------------+
| Design workspace                                    New design      |
+---------------------------------------------------------------------+
| What should we design?                                              |
| MULTILINE BRIEF / REVISION COMMAND                      Stop / Send  |
+---------------------------------------------------------------------+
| Designing   Factual progress sentence              Observed activity |
+---------------------------------------------------------------------+
| Revision record                                                     |
| request / purpose / time | OUTCOME / QUESTIONS / NEXT ACTION          |
| request / purpose / time | OUTCOME / FULL RESPONSE                    |
| request / purpose / time | RECOVERY TRUTH / EXPLICIT SAFE ACTIONS     |
+---------------------------------------------------------------------+
| Workspace connection                                         Details|
+---------------------------------------------------------------------+
```

## Structural rejection gate

A changes navigation position, panel proportions, composer location and dominant work region, but retains a side-by-side Studio relationship. B changes shell and dominant stage but depends on unavailable current imagery. C removes the old outer rail, room, conversation sidebar, bottom-left composer and narrow task geometry. None is a cosmetic rail variant. Any implementation that reintroduces the old room-first grid fails C regardless of palette.

## Product scoring

Scores are design judgments on a 1–5 scale, not measured product quality. Complexity score means implementation reasonableness: 5 is simpler. Independent critic findings are recorded below when received.

| Criterion | A | B | C |
|---|---:|---:|---:|
| Workflow clarity | 4 | 4 | 5 |
| Information hierarchy | 4 | 4 | 5 |
| Distinctiveness | 4 | 5 | 4 |
| Professional feel | 4 | 5 | 5 |
| Ease of revision | 5 | 4 | 5 |
| AI activity comprehension | 4 | 4 | 5 |
| QA usability | 5 | 3 | 5 |
| Browser usability | 5 | 4 | 5 |
| Responsive resilience | 3 | 3 | 5 |
| Accessibility | 4 | 3 | 5 |
| Monochromatic suitability | 5 | 5 | 5 |
| Implementation reasonableness | 4 | 2 | 4 |
| Maintainability | 4 | 2 | 5 |
| Visual identity | 4 | 5 | 4 |
| Total | 58 | 53 | 67 |

## Selection

Select **C: Design document**. Its hierarchy directly follows describing, observing, inspecting and revising. Requests become a durable work record instead of chat bubbles. QA and Browser gain task-specific reading structures. It does not require an invented canvas or backend rewrite. Architecture, rather than easiest implementation, decides the result: C scores best in workflow, accessibility, reflow and truthful evidence.

Reject A because the command column spends permanent width on input and retains a split-transcript tendency. Reject B because a result stage without a guaranteed current image would be an empty promise. Preserve B's emphasis on inspecting evidence through dedicated QA/Browser chapters, not a fake stage.

## Acceptance contract

At 1320×860 and 900×650, a grayscale blurred-label comparison must clearly show a new top-navigation/document silhouette. Current task and command lead. No bedroom or character appears in the active UI. Historical artwork remains on disk. No result status is upgraded by copy, ordering or styling.

## Independent concept review

Read-only reviewer `ConceptCritic` inspected baseline captures and independently selected C. Scores: A 55/70, B 51/70, C 59/70. These more conservative judgments supersede the initial optimistic total as the independent assessment; neither table certifies implementation quality.

Required gates adopted before coding: bounded visible command row with scrolling ledger on desktop; natural document flow at compact/reflow widths; latest unanswered question and recovery outside closed disclosures; persistent Browser cross-category truth summary; compact 900×650 height budget; descriptive Prototype stages with no implied automation; consistent request annotation and outcome grammar.

Prototype stages are **Design context** (existing editable design, not automatically certified), **Interaction intent** (user-defined controls/destinations submitted through the existing composer), and **Read-only review** (existing QA evidence, not native playback proof). They are instructions, never fake readiness indicators.

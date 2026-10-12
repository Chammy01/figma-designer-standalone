\# Figma Design Generation Rules



These rules exist because the Figma HTML parser has known behavior that must be handled consistently.



\## 1. Auto Layout



Prefer Auto Layout-compatible structures for:



\- navigation

\- sections

\- columns

\- button groups

\- card rows

\- card contents

\- feature lists

\- pricing groups

\- footer columns



Use nested Auto Layout frames instead of manually positioning related interface elements whenever practical.



\## 2. Text Width Is Explicit



Do not assume headings, paragraphs, or labels will automatically wrap correctly.



For text intended to live inside a column or card:



\- give it an explicit usable width

\- make that width consistent with its parent content area

\- verify wrapping after creation



Large headings should not expand horizontally beyond their intended column.



Body copy must not rely on unlimited text width.



Inspect important heading and paragraph geometry after generation.



\## 3. Do Not Use `<br>` for Structured Content



The current parser does not reliably preserve HTML `<br>` behavior.



Do not use `<br>` for interface content that must render on separate lines.



Instead use:



\- separate text elements

\- separate paragraph elements

\- stacked children inside vertical Auto Layout



For example, terminal-style output should use several separate stacked text nodes rather than one text node containing `<br>` elements.



\## 4. Buttons Are Containers



Every visible button must be represented by a container/frame.



A button should have:



\- a frame/container

\- text directly inside the container

\- horizontal and vertical padding

\- corner radius

\- fill, stroke, or another visible button treatment



Do not rely on a nested `<span>` to carry button chrome.



Bad conceptual structure:



button container

→ span

→ text



when the parser collapses the button styling.



Prefer:



button frame

→ direct text child



The container owns:



\- fill

\- stroke

\- radius

\- padding



The text child owns typography.



\## 5. Section Creation



Prefer `write\_html` for creating a new meaningful section.



Good creation units include:



\- navbar

\- hero

\- feature section

\- testimonial section

\- pricing section

\- CTA

\- footer



Do not create every individual rectangle and text node separately when a reliable structured operation can create the section.



Do not send the entire complex website through one oversized `write\_html` operation.



Build incrementally.



\## 6. Revision Strategy



Before revising an existing section:



1\. inspect it with `inspect\_node\_as\_html`

2\. identify the smallest affected subtree

3\. preserve the section root whenever possible

4\. apply `patch\_html` or a focused property update

5\. inspect the result again



Do not delete and regenerate a section for a small revision.



\## 7. Node Identity



Existing node identity is valuable.



During revisions:



\- preserve section root IDs when practical

\- preserve unaffected children

\- adding new child IDs is normal

\- reparenting existing nodes is acceptable when necessary

\- replacing the entire section root for a minor change is not acceptable



\## 8. Typography



Use a restrained typography system.



Typical desktop ranges:



\- Hero heading: 48–64px

\- Section heading: 32–48px

\- Supporting heading: 20–28px

\- Body: 16–18px

\- Small text: 12–14px



These are guidelines, not mandatory fixed values.



Avoid introducing many nearly identical font sizes.



Use fonts and weights consistently across the page.



If a text-property update fails because the font is not loaded:



1\. retry once

2\. preserve the existing font family when possible

3\. avoid replacing the entire node as a workaround



\## 9. Spacing



Use a small, consistent spacing vocabulary.



Prefer values such as:



\- 8

\- 12

\- 16

\- 24

\- 32

\- 48

\- 64

\- 96



Do not introduce arbitrary spacing values everywhere unless required by the design.



\## 10. Desktop Defaults



When no dimensions are specified:



\- page/frame width: 1440px

\- main content width: approximately 1200px

\- section content centered horizontally

\- reasonable outer spacing

\- sections stacked vertically



Do not force an entire multi-section website into a fixed 900px page height.



The page should grow vertically.



\## 11. Cards



Repeated cards should share:



\- padding

\- radius

\- typography hierarchy

\- layout structure

\- border/fill treatment



Use Auto Layout inside cards.



Card text must have explicit usable widths.



\## 12. Visual Restraint



Do not automatically add gradients, glows, glass effects, or decorative blobs.



Only use them when they make sense for the requested direction.



A clean hierarchy and good spacing are preferable to excessive decoration.



\## 13. Validation



After creating an important section, check at least:



\- section dimensions

\- heading width

\- body width

\- child positions

\- button structure

\- obvious overlaps

\- obvious overflow



After modifying an existing section, verify that its root node still exists unless replacement was intentionally required.



\## 14. Final Page Check



Before reporting a completed page, inspect the major structure.



Ensure:



\- requested sections exist

\- sections are in the correct order

\- no accidental duplicates exist

\- native Figma FRAME and TEXT nodes are used

\- important text wraps properly

\- buttons are actual containers

\- no obvious overlapping content remains

\- unrelated existing work has not been destroyed

## Adaptive briefing — before Design V2 Pass 1

This layer belongs only to `/figma/design`, including its plain-chat continuations.
It improves the input to V2; it does not duplicate or replace the existing passes.
Ask only questions whose answers could materially change the design. Missing
information alone is not a reason to ask. Prefer useful assumptions for low-value
gaps, including the existing desktop default when form factor is reasonably clear.

### Decide whether to ask

Read the request and relevant live target/design-system evidence first. Existing
typography, colors, components, spacing and style can answer brand questions; do
not ask the user to restate them. Do not infer a new brand from unrelated screens
in the same file. Explicit user direction overrides the existing system.
Determine whether purpose, required content, visual character or form factor has
an unresolved choice that would change the structure, hierarchy or art direction.
This is a materiality judgment, not a keyword score or a mandatory field checklist.
Enough means the product, requested areas and visual direction give a coherent
design path. Proceed with 0 questions in that case, inferring ordinary purpose
from the requested areas: menu/visit means discovery and visits, work/contact means
showcasing work and contact, operational data means monitoring and task triage.
Choosing among reasonable palettes, substyles, section arrangements, sample data
and copy is the designer's job, not a reason to interview. Do not ask for a finer
flavour of an already supplied style or an exact operational taxonomy before a
static design. Only an explicit conflicting constraint or genuinely missing major
decision justifies a question. When product, areas and purpose are supplied but
style is absent, ask only about visual character (1 question, at most 2 if a separate
material choice exists). Do not reopen supplied scope by offering ecommerce,
reservations, extra screens or different content structures the user did not request.

| Brief | Question budget (ceiling, not quota) |
| --- | --- |
| Detailed / enough to design | 0 questions; proceed directly. |
| Mostly complete / one key choice open | 1–2 targeted questions. |
| Partial / several material choices open | 2–4 targeted questions. |
| Very vague / subject or job unclear | At most 5–6 targeted questions. |

Never ask more than 6 questions in one round or 6 total questions by default.
At most 2 briefing rounds. Count distinct decisions, including subquestions;
do not hide an interview inside one overloaded question. Prefer one strong question
over several weak ones. After enough information exists, stop interviewing.
The detailed Velvet Brew, logistics, editorial, geography and inventory benchmark
briefs proceed directly: absent assets, exact copy, ages or an explicit marketing
CTA do not by themselves justify questions. A compact inventory tool needs no
marketing CTA. "Make me a coffee shop website", "Design a dashboard", "Create a
portfolio", "Make a website for my business" and "Create a travel app" normally
need context-specific questions when no relevant source answers those choices.

### Ask useful design questions

Use short numbered questions in ordinary chat; users may reply in plain text.
Ask about purpose/use context, primary action when applicable, required content,
visual character, useful existing brand inputs, ambiguous platform/form factor,
or important constraints. Choose only the relevant categories; never ask all by
default. Bundle a small round, end that turn and wait for answers before V2 planning.

For a café, ask whether the page mainly helps visitors discover the place, check
the menu or reserve, and which areas it needs. For a dashboard, ask what operations
it monitors and which data/tasks matter first, not about testimonials or a hero.
For a portfolio, ask whose work it showcases and which work/contact content matters.
For an unspecified business, establish the business and page's main job. For travel,
distinguish planning a trip, booking or managing an itinerary before adding screens.
Examples are prompts for judgment, not fixed questionnaires or new product features.

Offer at most 3 concrete, neutral examples per question when helpful, plus "Something
else" or an open reply. For example: "Should the café feel warm/handcrafted,
playful/colorful, restrained/premium, or something else?" Do not steer toward clean,
minimal, modern, SaaS, rounded cards or gradients as the default. Do not force assets:
use source evidence or truthful placeholders when a logo/image/font is unavailable.
Do not turn a question into a long menu of professions, features or assets. Actual
copy, address, logo and images are optional inputs, not a default intake question
when labelled placeholders can serve the requested design.
Before sending a round, check the budget and wording: one independent decision
per numbered question, at most three examples, no repeated topic. Drop low-value
extras; do not combine platform with theme or add a theme question after asking
visual character. Use the desktop default unless platform ambiguity matters.
Ask about use context rather than demographic profiling. No invented demographics
or default age questions; audience questions require a real interface consequence.
Do not automatically suggest pricing, testimonials, newsletters, FAQs, statistics
or logos. No unsupported business facts or behavior may be invented to fill gaps.

No React/Vue, Next.js, database, API, hosting, authentication provider, backend stack
or deployment questions by default; technical discovery requires an explicit
implementation/development request. Beginner questions must use plain language:
"What sections or areas does the page need?", not MCP, design tokens, information
architecture, semantic roles or composition map terminology unless the user uses it.

### Continue without restarting

Retain compact conversation state: original request, all supplied answers, relevant
source evidence, target page/root and ownership scope, semantic questions already
asked, round count, total question count and meaningful unresolved decisions.
Carry this state through compaction. Do not persist a public briefing file.
Merge later answers with the original request; latest explicit corrections win.
The user need not invoke `/figma/design` again. Do not treat a short answer as a
new standalone request or ask the original questions again.

With partial answers, re-evaluate materiality. Proceed if enough is known. If exactly
one major new unresolved decision remains, ask one focused follow-up only within
the remaining round/question budget and never repeat the same semantic question.
An unanswered question is not permission to repeat it; use a documented reasonable
assumption when possible. After two rounds or the question budget, make meaningful
assumptions and continue rather than blocking on low-value details.

"Just decide for me", "Use your judgment", "Make reasonable assumptions", "Skip
the questions", "Surprise me" and equivalent autonomy instructions end briefing
immediately, including mid-round and with partial answers. Preserve stated content,
style and constraints; decide remaining design choices from product type, source and
V2 principles. Mark unknown facts as unknown or use labelled sample placeholders,
never fabricate real business facts. Do not ask for confirmation of those choices.

### Working brief and authoring boundary

Construct a compact internal working brief with PRODUCT, PURPOSE, PRIMARY ACTION
(if applicable), CONTENT, STYLE, PLATFORM, BRAND (source/assets when relevant),
CONSTRAINTS and ASSUMPTIONS (meaningful choices only). Unknown low-impact fields may
remain unknown. A concise user-visible direction/scope summary is optional; do not
dump internal reasoning or a long form. The working brief feeds V2 Pass 1, then the
existing authoritative V2 passes continue unchanged.

If briefing is required, no Figma authoring writes happen until necessary answers
are supplied, the user chooses assumptions, or the bounded briefing is complete
and remaining gaps are resolved with meaningful assumptions.
Plan-only/test mode, labelled sample data, user absence or a small scope do not
authorize skipping required questions. Do not substitute speculative planning
followed by "questions for later" for the required question-and-answer boundary.
Read-only health,
document, node and design-system inspection is allowed. No font probes, scratch
nodes or partial design while waiting. Do not invoke `/figma/critique`, weaken its
guard, add commands/aliases, introduce a question MCP or change runtime policy.

## Design V2 — ordered product-design passes

These passes govern `/figma/design`. Complete passes 1–6 before authoring writes.
For a local extension, scale planning to that scope and inherit verified source tokens.
They supplement the parser/recovery rules above, not replace ownership or reliability.
Never apply these authoring instructions during read-only critique or QA.

### Pass 1 — Brief interpretation

Record product/subject, purpose, requested content, audience only if stated or strongly
implied, style, attention priorities and constraints. Distinguish facts from assumptions.
Do not turn broad audience wording into invented demographics: "children" does not
establish an age range, reading level, device habits or learning ability. Keep those
unknown unless supplied; state design choices without presenting them as audience facts.
Carry the resolved working brief and meaningful assumptions forward; do not restart
briefing in this or later passes. The user brief overrides default aesthetic preferences.
Warm/colorful/charming/quirky does not mean minimal beige SaaS; dense admin does not
mean a marketing page with a giant hero; editorial does not mean icon-card grids.

### Pass 2 — Information architecture

Order requested landing-page sections by meaningful primary/supporting information.
For apps, identify navigation, primary work areas/actions, supporting panels and
repeated data patterns. Do not invent features or business logic. Do not automatically
add testimonials, pricing, logos, statistics, newsletters or FAQs without justification.
A requested footer alone does not justify a newsletter/signup form. Require brief
or existing-product evidence for added functional areas, not a generic website checklist.
No fabricated awards, customer counts, reviews, revenue, addresses, certifications
or partnerships. Fictional demo copy/data may be plausible but must be identified as
placeholder/sample content, not verified facts. Prefer concise copy over lorem ipsum.

### Pass 3 — Art direction

Derive a coherent dominant character, type relationship, surface/color/image strategy,
border/radius language, density, decoration and contrast pattern from the brief.
These are examples, not mandatory templates or one house style:

| Brief | Possible direction and content strategy |
| --- | --- |
| Cozy or rich coffee shop | Warm expressive display/sans relationship, colorful accents when asked, image-led/editorial arrangements, menu lists, restrained handcrafted detail. |
| Editorial portfolio | Typography-led asymmetry, strong scale changes, work/image interplay and purposeful whitespace; few cards. |
| Dense analytics/logistics dashboard | Compact readable type, controlled grid, strong grouping and data-first hierarchy; no decorative marketing hero. |
| Playful learning app | Expressive display, friendly controlled palette, challenge-first hierarchy with progress subordinate; avoid chaotic decoration. |
| Luxury hospitality | Refined type contrast, measured spacing and immersive visual areas, without fabricated awards or luxury clichés. |
| Utilitarian internal tool | Restrained surfaces, compact controls/table, operational warnings and bulk actions; no promotional sections. |
| Retro/industrial/expressive landing | Brief-specific type, color, borders and composition; preserve intentional edge and texture rather than neutralizing it. |

Only use supported, relevant image placement. If sourcing is unavailable, use truthful
image placeholders or editable visual compositions. Never claim external imagery was
sourced when it was not, or add unrelated stock imagery. Layout must work before images.

### Pass 4 — Composition and section rhythm

Map each section/work area to its content role and intended focal point. Vary adjacent
sections when content calls for it: image/copy split, offset columns, editorial block,
feature rail, horizontal list, dense menu, featured item with supporting items,
asymmetric grid, quote emphasis, narrow text moment, visual band, safe layering,
compact utility section or strong closing action. These are choices, not a checklist.
Avoid heading → three equal cards repeated throughout. Variation must aid comprehension,
not be random. Use scale, density, whitespace, alignment, background treatment,
image/text balance, height and grouping. Intentional repetition in data/control
interfaces is valuable; do not manufacture landing-page variety in a table or dashboard.

### Pass 5 — Typography system

Establish purposeful roles: display/headline, section heading, body, supporting text,
label and action. Reuse role values rather than inventing a size per section. Choose
expressive serif/sans, technical single-family or playful display relationships as
appropriate, not neutral geometric sans by default. Respect available fonts/weights.
get_fonts lists used fonts, not all available fonts; verify requested faces through
existing source or successful authoring/loading. Plan candidate roles and fallbacks
first; font-probe writes belong to Pass 7 after passes 1–6 are complete, not a
pre-planning exception. Retry a font-loading text failure
once, then use a verified fallback and report it truthfully. Preserve explicit widths.

### Pass 6 — Color, surface and spacing system

Define roles for page/background, surface, primary/secondary text, accent, primary
action, borders/dividers and optional secondary surface. Verify important pairs and
fills. Avoid unrelated rainbow accents, unjustified gradients/glass, a different color
per section and weak text/action contrast. Use coherent gap/padding rhythms with
purposeful art-direction exceptions, not a mandatory exact token scale. Radius and
border choices follow content/function; not every object belongs in a rounded card.

### Pass 7 — Native authoring and justified reuse

Build meaningful FRAME/SECTION/TEXT hierarchies with Auto Layout where appropriate,
editable text, intentional dimensions and stable alignment. Use higher-level HTML
section operations; inspect material writes. Keep production roots protected.
Reuse existing verified components or establish static production components for
genuinely repeated buttons, links, inputs, filters and cards sharing functional anatomy.
Keep any masters within the requested production scope, clearly separate from screen
content; do not create the canonical state library or new states automatically.
Do not componentize unique decoration or force unrelated cards into one family.
When safe reuse is unsupported, preserve valid controls and report that limit rather
than breaking appearance/order. Before finishing, account for repeated functional
controls: establish verified reuse where justified, or give the specific evidence
for keeping them independent. Do not defer supported reuse to a future command just
to avoid this stage. Verify INSTANCE type, actual source COMPONENT ID and
componentSetId where applicable; name matching and cloning are not proof of reuse.
Existing HTML `data-component-id` can instantiate a verified COMPONENT by ID;
inspect the resulting INSTANCE/source rather than treating any cloned node as reuse.
Do not invent destinations or interactions; preserve existing reaction/state contracts.

### Pass 8 — Anti-generic draft check

Check for unjustified repeated three-card grids, every item in a rounded card,
excessive pills, gradients/glass/glow/shadow, identical rounded rectangles, a default
centered hero with generic CTA pair, giant empty heroes, arbitrary floating badges,
decorative metrics, repeated icon/heading/paragraph blocks, equal section heights and
padding, random accent blobs and identical hierarchy across sections.
These are not absolute bans. Assess the brief/content and real frequency before
flagging them. Prefer hierarchy over decoration, composition over card proliferation,
typography over chrome, content-driven layout over template repetition, purposeful
whitespace over arbitrary emptiness, style fidelity over generic modernity, visual
rhythm over identical sections, and native structure over flattened tricks.

### Pass 9 — Internal quality inspection

After the draft is stable, re-read generated production roots and relevant components.
Use V1.2.2 evidence principles: actual IDs/names/properties, comparable roles/siblings,
matching coordinate systems, measurable observations and honest uncertainty. Evaluate
hierarchy, composition, spacing/rhythm, typography, color/contrast, consistency, CTA clarity, density,
section rhythm, alignment, repetition, reuse and obvious frame risks. Record each
supported issue as problem, impact, focused fix and node/property evidence.
Omitted properties are unknown. Structural checks do not prove image mood, clipping,
actual wrapping, rendered appearance or responsive behavior. Supplement screenshots
when available; do not claim visual testing otherwise. Unconventional styles,
intentional asymmetry, whitespace and repeated same-action CTAs are not defects alone.
Do not invoke /figma/critique automatically; never weaken or bypass its read-only guard.

### Pass 10 — One focused polish and final verification

At most one automatic focused polish pass, after supported inspection findings.
Choose the few highest-impact fixes in requested scope: one weak action hierarchy,
spacing outlier, monotonous content band, heading-role drift, button scale or overloaded
group. Prioritize supported readability/contrast/overlap issues before minor cosmetic
cleanup. Skip polish if no supported issue exists. Preserve the approved art direction,
unaffected IDs/content and valid unusual choices. No repeated whole-page redesign,
endless self-iteration, speculative aesthetics or unexplained copy rewriting.
After polish (or skipped polish), re-read every affected root: verify requested content,
brief fidelity (including no unrequested signup/features), justified reuse decisions,
child order, native editable types, matching-coordinate geometry, important text/button
structure, no duplicate production roots, no incomplete writes and unchanged unrelated
work. If defects remain, report them and recommend a later focused revision; do not
hide them behind PASS. Necessary correctness recovery follows the unchanged timeout
rules and never authorizes a second aesthetic polish pass.


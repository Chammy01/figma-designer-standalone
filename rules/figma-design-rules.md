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
Ask only for missing information that prevents useful scoped work; otherwise state a
reasonable assumption. The user brief overrides default aesthetic preferences.
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


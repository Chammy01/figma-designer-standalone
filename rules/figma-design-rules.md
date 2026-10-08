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


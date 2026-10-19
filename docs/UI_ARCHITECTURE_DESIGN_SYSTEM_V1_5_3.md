# V1.5.3 monochromatic design system

## Direction

Operate mode. Graphite design document: strong readable text, fine rules, flat working surfaces and explicit selected state. The creative brief and revision record lead. Artwork is retained as source material but is not rendered in the workspace. No gradients, glows, decorative animations, card grids or AI sparkles.

## Tonal palette

Core hue is cool graphite (approximately 220°, low saturation). Dark and light modes follow the device preference, preserving the same hierarchy.

| Token role | Dark | Light |
|---|---|---|
| Canvas | #101216 | #eceef2 |
| Document | #191c22 | #ffffff |
| Command/elevated surface | #22262e | #f5f6f8 |
| Hover/selected surface | #2c323c | #e0e4ea |
| Border | #454d5b | #a4acb8 |
| Primary text | #f3f5f7 | #171b22 |
| Secondary text | #c4cad3 | #343e4d |
| Muted/help text | #a8b1bf | #505d70 |
| Primary action | #e2e7ef | #263142 |
| Action text | #171b22 | #ffffff |
| Focus | #d2dbea | #304d76 |

Normal UI belongs to one color family. Failures use an explicit FAIL/FAILED/attention label and strong boundary; no outcome relies on color. Safety exceptions are permitted but unnecessary for normal presentation. UNVERIFIED and historical findings remain textually distinct from current PASS.

## Typography

Segoe UI first on Windows, system UI fallback elsewhere. One sans family carries application chrome, controls, record and evidence. Monospace is reserved for actual technical evidence. Sizes: 12px metadata, 13px compact labels, 14px controls/body, 16px subsection, 22px page title, 28px initial brief heading. Body line-height 1.5; prose measure up to 72ch. Do not use all-caps ornament or decorative kickers. Tabular numerals for times and evidence counts.

## Geometry

Spacing scale: 4, 8, 12, 16, 24, 32, 48px. Top bar 64px minimum; content horizontally inset 32px on wide desktop, 20px at 1024px, 16px narrow. Document max width 1280px. Studio command is an independent top row, activity a compact row, record the flexible reading area. Main controls have 36px minimum height; primary Send 40px. Textareas allow multiline and vertical resize within a bounded desktop row.

Controls use 4px radius, command surface 8px, document/evidence panes square and ruled. No nested cards. Elevation is reserved for dialogs: one soft offset shadow. Dividers separate jobs, not every sentence. Existing authored 1.5px SVG nav icons may be reused, always with text labels.

## Interaction states

- Hover: tonal surface change, no movement.
- Active/selected: contrasting tonal fill and visible rule; aria-current for route, aria-pressed for local category buttons.
- Focus: 2px solid focus token with 3px offset; no focus removal.
- Disabled: native disabled attribute plus muted opacity; gating logic unchanged.
- Loading: factual checking text in stable content region. No fabricated progress.
- Errors: inline alert in document flow, with sanitized technical disclosure and explicit Check Again. Recovery never suggests replay without RETRY_SAFE.
- Empty: brief instruction and real next action; no giant illustration or invented work.
- Selection/caret/scrollbars: palette-derived, readable and conventional.
- Motion: no constant decorative animation. prefers-reduced-motion disables transitions and smooth scrolling.

## Surface composition

Studio: command, activity strip, revision ledger. Questions, latest recovery and outcome actions remain discoverable. Prototype: interaction intent and actual capability sequence. QA: verdict/integrity context beside findings. Browser: independent Preview/Behavior/Motion/Fidelity/Limitations chapters; integrity stays in Behavior evidence. Runs: intent-first master/detail journal. Settings: category index and flat preferences pane.

## Responsive transformations

1440/1320/1200: horizontal workflow navigation, full command, annotation/outcome record columns, QA context/findings split. 1024: reduced outer inset and narrower annotation margin. 900: navigation may use two rows; record and QA stack; category selectors remain labeled. At zoom/reflow widths, normal document scrolling replaces fixed desktop panes and every control remains reachable. No horizontal overflow or clipped fixed toast.

## Verification

Measure rendered text/background contrast, focus and control bounds. Exercise keyboard route/category navigation, long requests/errors, five required desktop sizes and a 450px CSS reflow viewport. Capture actual app and labeled deterministic fixtures separately. A design specification alone is not a visual PASS.

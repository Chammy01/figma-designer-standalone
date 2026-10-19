# V1.5.2 Monochromatic UI/UX Comprehensive Audit

**Date:** 2026-10-19  
**Repository:** `Chammy01/figma-designer-standalone`  
**Milestone:** V1.5.2 Complete Monochromatic UI/UX Overhaul  
**Discipline:** Impeccable (Craft Floor, Operate Mode) + Ponytail Lite (Minimal New Abstraction) + Humanizer (Plain Factual Prose)

---

## Executive Summary

The current user interface is a mix of three competing aesthetics:
1. A warm earthy olive/khaki dark palette (`#1c1d19`, `#252720`, `#3c4033`, `#d4b887`, `#efb18c`) with low-contrast green/brown tones.
2. A whimsical pixel-art bedroom scene taking up 70% of the Studio viewport, prioritizing nostalgic illustration over creative workflow.
3. A technical developer inspection dashboard across QA, Browser, Runs, and Settings, characterized by dense raw `<pre>` dumps, raw JSON inspection sections, ad-hoc tables, and fragmented cards.

To transform this into a cohesive, sophisticated, editorial, and focused creative design environment, the application requires a complete monochromatic overhaul built on a single disciplined tonal hue family (Slate / Cool Steel Gray), with structural simplification of the shell, workspace, composer, conversation, and inspection panels.

---

## Detailed Audit of 24 Dimensions

### 1. Current Information Architecture
- The application is divided into six flat views toggled via hash navigation: `#workspace` (Studio), `#prototype` (Prototype Workshop), `#qa` (Review Desk), `#browser` (Preview Room), `#runs` (Studio Journal), and `#settings` (Studio Settings).
- Views have unequal functional depth: Studio is a multi-column hybrid of visual scene, conversation, and composer; Prototype is an empty stub with two sentences and one button; QA and Browser are long vertical inspection dashboards with multiple sub-sections; Runs is a master-detail split; Settings is a two-column form list.
- Top-level persistent header repeats view titles and houses raw status pills, creating redundant headers above every view.

### 2. Current Navigation Structure
- Left sidebar (`106px` wide) with vertical icon-over-text stack: `⌂ Studio`, `↗ Prototype`, `✓ QA`, `▣ Browser`, `◷ Runs`, `⚙ Settings`.
- Navigation uses miscellaneous Unicode glyphs rather than a cohesive vector icon system.
- Spacing and hit targets are cramped (`10px 4px`), with an oversized `30px` Georgia serif brand mark (`f/`) that feels disconnected from the product type.
- Active states use simple color tinting (`--text`) without clear surface indicator or spatial grounding.

### 3. Current Studio Layout
- Employs a fixed CSS Grid: `grid-template-columns: minmax(0, 1fr) 286px` with `minmax(0, 1fr) auto` rows.
- The pixel bedroom scene dominates column 1 (`max-width: 690px`, `aspect-ratio: 620/520`), pushing the prompt composer to the bottom edge.
- The user's creative focus is visually secondary to an illustration of an agent sitting at a desk.
- Workflow action buttons (`Run QA`, `Build Browser`, `Test Browser`, `Check System`) float awkwardly beneath the room graphics.

### 4. Current Conversation Layout
- Located in a narrow right-side panel (`286px` wide).
- Contains an introductory hero block (`.intro`), message history, running state, recent activity log, expandable details, and validation summary all stacked vertically in under 300px width.
- Message items use `.message` with `.request-preview` and expandable `<details class="request-full">` which feels like an IRC log or debugger output rather than a project collaboration canvas.
- Results appear as `.result-card` with raw text output.

### 5. Current Prompt Composer
- Bordered container docked at the bottom of the studio grid.
- Contains an unstyled textarea (`min-height: 42px`, `height: 44px`), a small keyboard shortcut footnote, and an accent-colored "Send" button.
- Lacks focus elevation, modern breathing room, structured attachments, or graceful multiline expansion for complex briefs.

### 6. Current Connection and Status Presentation
- Split across two separate locations:
  1. Header pills (`#statuses`): `Figma · Connected`, `Designer · Ready`, `Model · First model` with pseudo-element colored dots.
  2. Connection banner (`#connection`): Full-width horizontal banner displaying `Connecting your workspace` with action buttons, rendered in low-contrast olive or warn colors.
- Information is duplicated between the banner, the header pills, and the Settings view.

### 7. QA Layout
- Single vertical column under `#qa`.
- Begins with an eyebrow (`THE REVIEW DESK · READ ONLY`) and large `<h2>Check how it works.</h2>`.
- Sections (`#qa-result`, `#qa-integrity`, `#qa-findings`, `#qa-raw`) are stacked with raw horizontal borders (`border-top: 1px solid var(--line)`).
- Findings list uses expandable `<details>` containing preformatted key-value lines.
- Dense, monospace-heavy, and reads like a terminal audit rather than an executive design assessment.

### 8. Browser Layout
- Similar to QA: vertical stack of five inspection sections (`#browser-status`, `#browser-tests`, `#browser-motion`, `#fidelity`, `#browser-regression`, `#native-parity`, `#font-limitations`, `#property-limitations`, `#browser-raw`).
- Findings and metrics are scattered across multiple `<dl class="metrics">` and `<div class="evidence-row">` elements.
- Information density is fragmented, requiring excessive scrolling to assess basic preview readiness.

### 9. Recent Runs Layout
- Master-detail view under `#runs`.
- Master list renders full-width transparent buttons with small text, separated by 1px border lines.
- Detail view renders below or alongside as `#run-detail`, simply re-rendering `runContent(run)` without enhanced diagnostic visualization.

### 10. Settings Layout
- Two-column grid (`200px minmax(0, 1fr)`) with large `32px` gaps.
- Sections: AI Provider/Model, Figma Connection, Developer Diagnostics.
- Nested form controls (`select`, `input`, `button`) lack visual polish and consistent height/padding.
- Expandable diagnostics render a raw JSON dump inside `<pre id="diagnostic-output">`.

### 11. Recovery and Error Presentation
- Error states render as a floating or sticky banner (`#error.recovery`).
- Uses raw code blocks and technical error codes in `<details>`.
- Buttons (`Check Again`, `Try Again`, `Keep Current Figma`) have inconsistent visual weight.
- Dialog for `USER_ACCEPTED_CURRENT_STATE` is an unstyled browser `<dialog>` element.

### 12. Typography System
- System font stack: `"Segoe UI", Arial, sans-serif` without defined typographic scale tokens.
- Brand mark uses Georgia serif (`font: italic 30px Georgia, serif`).
- Eyebrows use `font-size: 9px; letter-spacing: .16em; font-weight: 650; text-transform: uppercase`.
- Multiple inconsistent heading sizes (`27px`, `21px`, `19px`, `18px`, `17px`, `16px`, `15px`, `14px`, `13px`) scattered across media queries without a mathematical scale.

### 13. Spacing System
- Arbitrary spacing across CSS (`3px`, `4px`, `5px`, `6px`, `7px`, `8px`, `9px`, `10px`, `12px`, `13px`, `14px`, `15px`, `16px`, `18px`, `20px`, `22px`, `24px`, `25px`, `30px`, `32px`, `40px`).
- No defined 4px/8px modular scale.

### 14. Color Usage
- Warped olive/khaki dark palette:
  - Background: `--bg: #1c1d19` (muddy greenish dark)
  - Surface: `--surface: #252720`
  - Sidebar: `--side: #161813`
  - Text: `--text: #f1ebdc` (warm parchment)
  - Muted: `--muted: #b4b6a5`
  - Border: `--line: #3c4033`
  - Accent: `--accent: #d4b887` (khaki gold)
  - Soft: `--soft: #30362a`
  - Warn: `--warn: #efb18c`
- Status uses arbitrary green (`#bbd4a0`), warning tan (`#dec18a` / `#866022`), and red (`#f0aaa1` / `#a33c35`).
- Violates the monochromatic mandate: multiple conflicting hues (khaki, green, tan, orange, red).

### 15. Border and Radius Usage
- Inconsistent border radii: `7px`, `12px`, `20px` (pill), and `0px`.
- Some containers use border outlines; others use borders on one side only.
- Lack of visual hierarchy in stroke weight (all 1px solid).

### 16. Shadows and Elevation
- Virtually no elevation tokens or subtle surface drop-shadows.
- Depth is attempted through contrasting background colors (`#1c1d19` vs `#252720` vs `#161813`), leading to harsh, muddy contrasts rather than refined optical layering.

### 17. Responsive Behavior
- Breakpoints at `1100px`, `800px`, `620px`, and `520px`.
- Below `800px`, grid collapses into a long vertical column where the bedroom scene stays on top, composer is in the middle, and conversation is pushed to the bottom.
- Sidebar collapses from `106px` to `88px` to `64px`, dropping text labels and keeping small glyphs.
- Viewport target `1320 × 860` is constrained by the narrow right-hand panel (`286px`).

### 18. Accessibility Risks
- Muted text (`#b4b6a5` on `#252720`) has a contrast ratio around ~3.8:1, failing WCAG AA (4.5:1) for normal body text.
- Focus outlines use `--accent` (`#d4b887`) with `outline-offset: 4px`, which clashes with dark borders and lacks high-contrast visibility.
- Status indications frequently depend on small colored bullet points (`●`) or colored text (`outcome`).
- No visible skip links or structured landmark labeling.

### 19. Visual Inconsistency
- Bedroom pixel art is rendered with `image-rendering: pixelated`, while surrounding controls use modern flat vector styling.
- Headers on `#qa`, `#browser`, `#prototype`, and `#runs` use decorative eyebrows (`THE REVIEW DESK · READ ONLY`), which violates the craft floor ban on kickers/eyebrows.
- Monospace font is overused for regular request previews and details summaries.

### 20. Areas Feeling Like a Developer Dashboard
- QA and Browser inspection surfaces: raw dumps of checks, codes (`PROPERTY_strokeWidth`, `GEOMETRY_MAJOR_DRIFT`), raw hashes, and technical counts (`SCREENS_VALIDATED`, `NODES_COMPARED`).
- Recent Runs shows raw technical IDs on click.
- Settings includes a raw JSON dump in `<pre id="diagnostic-output">`.

### 21. Areas Containing Unnecessary Card Nesting
- Finding cards in QA/Browser nest `<article class="finding">` inside `<section class="inspection-section">` inside `<section class="view">`, with nested `<details>` and nested `<pre>`.
- Recovery cards nest `.recovery` inside `.run-recovery` inside `<details>` inside `.message`.

### 22. Areas Containing Duplicated Information
- Connection health is displayed in the top bar (`#statuses`), in the sub-header banner (`#connection`), and in the Settings view (`#figma-settings`, `#ai-status`).
- Task state is reported in `#run-state`, `#agent-message`, and `#conversation .message:last-child`.

### 23. Current Pixel-Art Integration
- Bedroom image asset (`bedroom-base.png` 620×520) with layered character (`character/*.png`) and monitor (`monitor/*.png`) occupies up to 690px width in the primary workspace.
- The pixel art is warm and colorful (brown floor, red bed, green blankets, blue window), which directly contradicts a monochromatic professional design tool.
- Solution: Retain existing art assets without deletion, but re-contextualize the pixel studio as a refined, restrained, monochromatic-filtered companion element or compact status vignette rather than the full-screen centerpiece.

### 24. Major UX Problems
1. The user enters the app to design with Figma, but 70% of the screen is occupied by an illustrative bedroom.
2. The prompt composer feels like an afterthought at the bottom of the viewport rather than the primary instrument.
3. Conversation history is squished into a narrow 286px sidebar where long briefs require scrolling and manual expansion.
4. QA and Browser validation screens are tedious vertical data dumps rather than clear executive balance sheets of design readiness.
5. Color palette feels muddy, warm, and dated rather than crisp, modern, and monochromatic.

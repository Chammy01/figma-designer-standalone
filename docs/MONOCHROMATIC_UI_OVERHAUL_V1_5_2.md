# V1.5.2 Monochromatic UI Overhaul Architecture Plan

**Scope:** Application shell, navigation, workspace composition, composer, conversation, status indicators, QA, Browser, Runs, Settings, error & recovery flows.  
**Constraint:** Monochromatic design system (Slate 220°), Ponytail Lite (compact clean diff, zero dead abstractions), Impeccable (Operate Mode, Craft Floor).

---

## 1. Shell and Navigation Architecture

### Current Problems
- Sidebar is too narrow and cluttered (`106px` with tiny stacked icons and vertical text).
- Top header carries redundant titles and multiple uncoordinated status dots.
- Main area uses nested vertical borders with inconsistent margins.

### Redesigned Architecture
1. **Sidebar (`aside.sidebar`):**
   - Clean, modern layout (`200px` standard desktop width, collapsible cleanly at narrow breakpoints).
   - Horizontal icon + label pairs with crisp SVG icons.
   - Distinct, grounded active state (`background: var(--bg-selected); color: var(--text-primary); border-left: 2px solid var(--text-primary)`).
   - "New" button styled as an editorial primary action.
2. **Top Bar (`header`):**
   - Slim, quiet header (`48px` height).
   - Single grouped workspace indicator: Document title and quiet connection pills.
   - No huge colorful status badges; clean monochrome indicators that glow only when an actionable state occurs.
3. **Main Content Container (`main`):**
   - Unified viewport with fluid scroll control (`overflow: hidden` on root, explicit scrolling in dedicated viewports).

---

## 2. Studio View Architecture (The Primary Workspace)

### Current Problems
- Giant pixel bedroom scene taking up 70% of the screen.
- Narrow right-side conversation panel (286px) where text wraps awkwardly.
- Prompt composer buried at the bottom edge.

### Redesigned Architecture
1. **Workspace Composition:**
   - Balanced, editorial workspace split:
     - Left / Center: Collaborative design canvas containing the conversation history, current active task, and floating prompt composer.
     - Right / Dock: Compact studio companion panel containing:
       - AI Designer status card (current phase, semantic animation, message, activity).
       - Restrained pixel-art studio vignette (clean monochromatic framed window).
       - Recent activity journal.
       - Current workspace validation summary.
2. **Prompt Composer:**
   - Elevated, prominent command input (`background: var(--bg-elevated); border: 1px solid var(--border-strong); border-radius: var(--radius-md)`).
   - Responsive multiline textarea with clean typography, clear keyboard shortcut hints (`Ctrl + Enter`), and a high-contrast primary Send button.
3. **Conversation Panel:**
   - Redesigned as structured project dialogue:
     - User request cards with clean typography and expandable full text.
     - AI responses formatted with clear hierarchy, status tags, and inline action buttons (e.g. `Revise`, `Run QA`, `Build Browser`).
     - Recovery prompts clearly framed with actionable buttons (`Keep Current Figma`, `Try Again`, `Continue From Current Design`).

---

## 3. Inspection Views Architecture (QA, Browser, Prototype, Runs, Settings)

1. **Prototype View:**
   - Transformed from an empty placeholder into an actionable interaction canvas detailing screen linkages, working controls, and transition availability.
2. **QA View:**
   - Executive review desk:
     - Status header: Verdict (`PASS`, `WARN`, `FAIL`) with evidence freshness and timestamp.
     - Metrics grid: Two-column tabular layout for working actions, broken controls, and limitations.
     - Findings: Monochromatic cards with clear severity tags, affected node paths, and collapsible detail inspection.
3. **Browser View:**
   - Clean 4-pillar structure:
     1. Preview Readiness (status, source freshness, generated timestamp, Open Preview action).
     2. Browser Test (acceptance status, check item details).
     3. Motion & Interaction (transition parity, token support).
     4. Source Fidelity & Limitations (coverage metrics, font differences, property limitations).
4. **Recent Runs:**
   - Clean tabular journal view: Date/time, mode, input preview, outcome badge, and detailed inspection panel.
5. **Settings:**
   - Grouped sections: AI Model & Provider, Figma Native Plugin Connection, Developer Diagnostics.
   - No nested cards: clean label-input rows with subtle horizontal dividers.

---

## 4. Preserved Invariants & Safety

- **No backend changes:** Preserves `app/server/*` endpoints, JSON contracts, and OpenCode client communication.
- **Read-only QA:** QA remains strictly read-only; no Figma write paths.
- **Browser Test Artifact Guard:** Full cross-process immutability guard and capability isolation remain untouched.
- **Reliability semantics:** `USER_ACCEPTED_CURRENT_STATE`, `RETRY_SAFE`, and reconciliation locks remain identical.
- **Test compatibility:** All DOM IDs (`#prompt`, `#send`, `#statuses`, `#model`, `#qa-result`, `#browser-tests`, etc.) and data attributes are preserved.

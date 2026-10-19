# V1.5.2 Monochromatic Design System Specification

**Base Hue:** Deep Cool Slate / Zinc (220° Hue)  
**Palette Type:** Monochromatic (Strict Luminance & Depth Variations of Single Hue Family)  
**Target Atmosphere:** Editorial, Professional Creative Suite, High-Precision, Calm, Architectural

---

## 1. Monochromatic Tonal Palette

All UI elements are derived from a single hue angle (~220°) in the CIELAB/OKLCH color space, parameterized into an 11-step scale:

| Token | Hex Equivalent | Role & Optical Purpose |
|---|---|---|
| `--mono-50` | `#f8fafc` | Maximum luminance text, primary active icon fills, crisp focus markers |
| `--mono-100` | `#f1f5f9` | Primary headings, button primary background, high-emphasis text |
| `--mono-200` | `#e2e8f0` | High-contrast secondary text, highlighted rows |
| `--mono-300` | `#cbd5e1` | Secondary text, active tab indicators, selected item labels |
| `--mono-400` | `#94a3b8` | Supporting text, focus rings, subtle interactive borders |
| `--mono-500` | `#64748b` | Muted labels, inactive icons, placeholder text, metadata |
| `--mono-600` | `#475569` | High-emphasis borders, active hover outlines |
| `--mono-700` | `#334155` | Default structural borders, subtle dividers |
| `--mono-800` | `#1e293b` | Elevated cards, input backgrounds, active hover surfaces |
| `--mono-900` | `#0f172a` | Primary sidebar, panels, container surfaces |
| `--mono-950` | `#080d1a` | Deep canvas root, background viewport |

---

## 2. Semantic Token Aliases

To prevent hardcoded hex values in component rules, CSS references standard semantic aliases:

```css
:root {
  /* Surfaces */
  --bg-canvas: var(--mono-950);
  --bg-surface: var(--mono-900);
  --bg-elevated: var(--mono-800);
  --bg-hover: color-mix(in srgb, var(--mono-800) 80%, var(--mono-700) 20%);
  --bg-active: var(--mono-700);
  --bg-selected: var(--mono-800);

  /* Typography */
  --text-primary: var(--mono-50);
  --text-secondary: var(--mono-300);
  --text-muted: var(--mono-500);
  --text-inverse: var(--mono-950);

  /* Borders & Dividers */
  --border-subtle: color-mix(in srgb, var(--mono-800) 60%, transparent);
  --border-default: var(--mono-800);
  --border-strong: var(--mono-700);
  --border-focus: var(--mono-400);

  /* Controls */
  --control-primary-bg: var(--mono-100);
  --control-primary-text: var(--mono-950);
  --control-secondary-bg: var(--mono-800);
  --control-secondary-text: var(--mono-200);
  --control-ghost-hover: var(--mono-800);

  /* Focus & Focus-Visible */
  --focus-ring: 2px solid var(--mono-400);
  --focus-offset: 2px;
}
```

---

## 3. Restrained Semantic Status Strategy

Status is conveyed through **shape, iconography, typography weight, and luminance** first. Colored overrides are strictly restrained to ensure accessibility without breaking monochromatic cohesion:

- **PASS / VERIFIED / CURRENT:**
  - Icon: `✓`
  - Text: `--text-primary` (`--mono-50`)
  - Accent: High luminance slate tone (`--mono-200`)
- **WARN / STALE / UNVERIFIED:**
  - Icon: `!`
  - Text: `--mono-300`
  - Indicator: Subtle warm-tinted slate border or dot (`#e2e8f0` at 80% opacity)
- **FAIL / BLOCKED / CRITICAL ERROR:**
  - Icon: `✕` or `!`
  - Text: `--mono-100` with restrained, low-saturation red border (`#f87171` at 0.9 opacity on error badges only)
  - Copy clearly states the root cause and recovery action.

---

## 4. Typography Scale

Clean, modern, human-crafted system typography (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`):

| Level | Size | Line Height | Weight | Tracking | Purpose |
|---|---|---|---|---|---|
| **Display** | 22px | 1.25 | 600 | -0.025em | Workspace title, view hero headings |
| **Section Title** | 16px | 1.35 | 600 | -0.02em | Panel titles, modal headings |
| **Subsection** | 14px | 1.4 | 550 | -0.01em | Card headings, finding titles |
| **Body** | 13px | 1.55 | 400 | normal | Main prose, conversation messages, forms |
| **Body Compact** | 12px | 1.45 | 400 | normal | Secondary descriptions, tables, metadata |
| **Caption / Label**| 11px | 1.4 | 550 | 0.02em | Field labels, status indicators, tabs |
| **Micro / Tag** | 10px | 1.3 | 600 | 0.04em | Badges, keyboard shortcuts, version tags |
| **Technical / Code**| 11px | 1.5 | 400 | normal | Hashes, fingerprints, logs (`monospace`) |

Eyebrow kickers (`A LITTLE SPACE FOR BIG IDEAS`, `THE REVIEW DESK · READ ONLY`) are removed in accordance with the Impeccable craft floor.

---

## 5. Spacing Scale

A strict 4px/8px modular grid:
- `4px` (`--space-1`): Gap between tight icon and text, micro tag padding
- `8px` (`--space-2`): Button internal vertical padding, control gaps
- `12px` (`--space-3`): Button horizontal padding, list item gaps
- `16px` (`--space-4`): Panel padding, container gutter
- `20px` (`--space-5`): Section margins
- `24px` (`--space-6`): Layout column gutters, view padding
- `32px` (`--space-8`): Large section separations

---

## 6. Radius Scale

Restrained, architectural corner curvature:
- `--radius-sm: 4px`: Badges, tags, small inputs, action buttons
- `--radius-md: 8px`: Form controls, message cards, floating menus
- `--radius-lg: 12px`: Panels, modals, elevated dialogs

---

## 7. Elevation and Dividers

- **Primary structure:** 1px hairline dividers (`--border-default: var(--mono-800)`).
- **Secondary depth:** Tone shifting between adjacent surfaces (`--bg-canvas: #080d1a` vs `--bg-surface: #0f172a` vs `--bg-elevated: #1e293b`).
- **Modals and Overlays:** `box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px var(--mono-700)`.

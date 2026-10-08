# v1.3.0 Bug Fixes (B-1 through B-8)

Eight surgical fixes to `plugin/src/write-html.ts` that resolved long-standing issues with the HTML-to-Figma conversion pipeline.

## Summary table

| # | Issue | File | Symptom |
|---|-------|------|---------|
| B-1 | Dead-code branch made HUG unreachable | `write-html.ts` | Buttons/headers never shrink to fit content |
| B-2 | `right` / `bottom` CSS not parsed | `write-html.ts` | Right-anchored elements rendered at x=0 |
| B-3 | `textAutoResize` set after characters | `write-html.ts` | Long text overflowed the specified width |
| B-4 | Empty frames collapsed to height 0 in auto-layout | `write-html.ts` | 1px dividers were invisible |
| B-5 | Root `display:flex` overrode absolute children | `write-html.ts` | Slide layouts broke when root used flex |
| B-6 | `write_html` had no positional input | `write-html.ts` + `tools_write_html.go` | All new nodes stacked at (0,0) |
| B-7 | 100px width fallback in non-flex contexts | `write-html.ts` | Children clipped to 100px even on 1080px slides |
| B-8 | Variables couldn't bind via class | `write-html.ts` | Token-driven workflows had to use API directly |

## B-1 — Dead-code HUG

The flex-child sizing block had two `else if (!pxWidth)` branches; the second was unreachable. Result: any frame without an explicit width inside an auto-layout parent got `FILL` instead of the intended `HUG`. Buttons and headers never auto-fit their content.

**Before:**
```ts
if (flexGrow || pctWidth === 100) frame.layoutSizingHorizontal = "FILL";
else if (!pxWidth) frame.layoutSizingHorizontal = "FILL";   // ← always taken
else if (!pxWidth) frame.layoutSizingHorizontal = "HUG";    // ← unreachable
```

**After:** the duplicate branch is removed; no-explicit-width children correctly get `HUG`.

## B-2 — `right` / `bottom` CSS

Added `computeAbsolutePosition(styles, parent, w, h)` helper that:
- Returns `{x: left, y: top}` directly when both are present
- Computes `x = parent.width - element.width - right` when only `right` is given
- Computes `y = parent.height - element.height - bottom` when only `bottom` is given

Applied in both `createFrameNode` and `createTextNode`.

## B-3 — Text overflow

Reordered text node creation so `textAutoResize = "HEIGHT"` is set **before** `characters` is assigned, then `resize()` is called. Previously, characters set the layout to `WIDTH_AND_HEIGHT` first, and the later `resize()` didn't always re-flow.

## B-4 — Divider preservation

When a child frame has explicit `pxHeight` but no children and the parent is auto-layout, Figma's `layoutSizingVertical = "HUG"` collapses it to 0. Fixed by gating the HUG assignment on `children.length > 0`.

## B-5 — Root flex

If the root parsed `<div>` has `display: flex` but its direct children use `position: absolute`, the absolute positions are silently overridden by flex flow. Now: when any direct child uses `position:absolute`, the parent's `display:flex` is ignored (treated as `block`).

## B-6 — `x` / `y` placement

`write_html` now accepts optional `x`, `y`, and `autoOffset` parameters:
- `x` / `y`: absolute position for the new root node(s)
- `autoOffset: true`: when omitted x/y, place the new node next to the last existing sibling (`last.x + last.width + 80`)

Replace mode also preserves the original target's position automatically.

## B-7 — 100px fallback

Two-part fix:

1. **At creation:** if no explicit width and parent has known width AND parent is not auto-layout, inherit parent width (so a slide-content div inside a 1080×1350 slide gets 1080×1350 instead of 100×100).

2. **After children:** for non-auto-layout frames with no explicit dimensions, refit to the children's bounding box.

## B-8 — Variable binding via class

Extended `StyleMapping` to support `variables: [{field, variableId}]` per class:

```json
{
  "primary-bg": {
    "paintStyleId": "S:abc",
    "variables": [
      {"field": "fillColor", "variableId": "VariableID:Brand/Primary"}
    ]
  }
}
```

Also supported via attributes:

```html
<div class="card" data-variable-field="fillColor" data-variable-id="VariableID:..."></div>
<div data-variables='[{"field":"fillColor","variableId":"..."}]'></div>
```

The plugin's new `applyVariableBindings` helper handles `fillColor` / `strokeColor` (which need the paint variable wrapper) and any field accepted by `setBoundVariable` (opacity, width, height, cornerRadius, padding*, itemSpacing).

## Tests

- 21 tests pass in `write-html.test.ts` (10 pre-existing + 10 new for B-1..B-8 + 1 misc)
- Full plugin suite: 268 pass / 0 fail
- Go suite: ok with 105 registered tools

# Figma MCP — Agent Operations Guide

> **Drop this file into any MCP-capable agent (Claude Code, Claude Cowork, Cursor, Copilot, …) to teach it how to operate this Figma MCP server.**
> **Version:** 1.3.1
> **References:** [tools-reference.md](tools-reference.md), [skill/SKILL.md](skill/SKILL.md), [skill/decision-tree.md](skill/decision-tree.md)

---

## Quick orientation

You have access to **`mcp__figma-mcp-go__*`** — 105 MCP tools that operate a live Figma file via a WebSocket bridge to a local plugin. Figma Desktop must be open with the plugin running; if it's not, every tool call will fail.

Typical use cases are social-media carousels (1080×1350 slides), mockups, and design-system automation. The toolkit is split into nine groups; pick from the right one.

| When the user asks for… | First reach for |
|--------------------------|-----------------|
| New slide / mockup | `slide_template` (5 built-in templates) → `write_html` for bespoke |
| Edit existing slide | **NEVER `delete_nodes` + rewrite.** Use `inspect_node_as_html` → `update_node_props` |
| Many small changes by name | `patch_html` with selectors |
| Position math | `align_nodes`, `distribute_nodes`, `move_to_anchor`, `pack_grid` |
| Bulk styles | `create_styles_from_palette` + `create_text_scale` |
| Component library | `create_component_from_html` + `instantiate_by_name` |
| What's there? | `inspect_node_as_html`, `explain_node`, `list_slides` |
| Why is it broken? | `health_check`, `get_recent_errors`, `explain_layout` |
| Hand off to dev | `export_node_as_react`, `export_html_self_contained` |

---

## Cardinal rules — read these every session

1. **Health check at the start of any non-trivial task.** Run `health_check` to confirm the bridge is alive. If `ok:false`, ask the user to reopen the plugin window in Figma — every other call will fail.

2. **Edit, don't rewrite.** This is the #1 thing that wastes tokens. The flow is:
   - `inspect_node_as_html nodeId=<slide>` → returns HTML body + `outline` (every child node ID)
   - Decide which IDs need to change
   - `update_node_props updates=[{nodeId, props}, ...]` to apply changes atomically

3. **Validate before large writes.** `validate_html` is free and catches typos, unsupported CSS, and missing fonts. Use it before any `write_html` call >100 chars.

4. **Position is part of the contract.** `write_html` defaults to (0, 0) — pass `x` and `y` explicitly, or set `autoOffset:true`. `write_html_batch` already handles this but single calls do not.

5. **Surface silent failures.** After non-trivial writes, call `get_recent_errors` to see what was skipped (failed style binding, missing font, malformed variable, etc.). The plugin tries to be lenient — this tool surfaces what it skipped.

6. **`requestId` for retries.** If a call might time out, include a `requestId`. Retries with the same ID return the cached result instead of duplicating nodes.

---

## Decision tree by user intent

### "Build me a carousel of N slides"

```
1. health_check                                                  # confirm bridge
2. (optional) create_styles_from_palette + create_text_scale     # one-time per file
3. For each slide i:
   - If template fits: slide_template action=instantiate template=cover|quote|list-3|comparison|cta slots={...} x=i*1160 y=0
   - Else: write_html targetNodeId=<page> html=<bespoke> styleMapping=<...> x=i*1160 y=0
4. make_slide_grid frameIds=[...] columns=N gap=80          # tidy positions
5. get_recent_errors                                              # check for silent failures
6. (optional) save_screenshots items=[...]                        # export PNGs
```

### "Fix the title color on slide 3"

```
1. inspect_node_as_html nodeId=<slide-3>
   → returns html + outline; find the title node ID
2. update_node_props updates=[{nodeId:<title>, props:{fillColor:"#000"}}]
```

### "Change every headline across this post"

```
patch_html
  targetNodeId: <page or post-frame>
  patches: [
    {selector: "name~:headline | type:TEXT", props: {fontSize: 64, fillColor: "#000"}}
  ]
```

The new v1.3.1 response includes per-node `applied` and `errors` arrays — check those if anything looks off.

### "These cards are misaligned"

```
align_nodes nodeIds=[<list>] mode=top
distribute_nodes nodeIds=[<list>] mode=horizontal-spacing
```

`distribute_nodes` sorts by current X/Y before distributing — if visual order matters, position roughly first or use `pack_grid` instead.

### "Convert this absolute layout to auto-layout"

```
auto_layout_from_positions nodeId=<frame> dryRun=true   # see inferred values
auto_layout_from_positions nodeId=<frame>               # apply if good
```

### "Set up brand colors and type scale"

```
create_styles_from_palette palette={"Brand/Primary":"#5B5FEF", ...}
create_text_scale scale={"Heading/Display":{...}, "Body/Default":{...}}
```

For W3C / Style Dictionary tokens:
```
import_design_tokens collectionName="Brand" exposeAsStyles=true tokens=<...>
```

### "Make this slide a Component, then stamp it 12 times"

```
1. create_component_from_html html=<...> targetNodeId=<page> name="Card/Default"
2. For each instance:
   instantiate_by_name componentName="Card/Default" parentId=<grid> x=... y=...
   (overrides param applies text/visibility overrides in the same call)
```

For bulk overrides on existing instances:
```
set_instance_overrides_batch updates=[
  {instanceId: A, overrides: {Title: "First", Body: "..."}},
  ...
]
```

### "Why is this node the wrong size?"

```
explain_layout nodeId=<id>
```

If still unclear:
```
inspect_node_as_html nodeId=<parent> depth=4
```

### "Hand this off to engineering"

```
export_node_as_react nodeId=<root> componentName="Hero" includeImports=true
# OR
export_html_self_contained nodeId=<root>
# OR for assets:
save_screenshots items=[{nodeId, outputPath, scale: 2}, ...]
export_frames_to_pdf items=[...]
```

---

## Tool catalog by task

### Reading the file

| Tool | Use when |
|------|----------|
| `health_check` | Start of session — confirm bridge alive |
| `get_metadata`, `get_pages` | Get file/page info |
| `get_node`, `get_nodes_info` | Single node detail |
| `get_design_context` | Tree summary at adjustable depth |
| `search_nodes`, `scan_text_nodes`, `scan_nodes_by_types` | Find nodes |
| `inspect_node_as_html` ★ | **Preferred:** HTML + outline + style summary in one call |
| `list_slides` | Carousel-specific: ordered slide-shaped frames |
| `get_styles`, `get_variable_defs`, `get_local_components`, `get_fonts` | Design system inventory |
| `get_screenshot` | Visual confirmation (returns base64 PNG) |
| `get_selection`, `get_viewport` | What's the user looking at? |

### Creating new content

| Tool | Use when |
|------|----------|
| `slide_template` ★ | First choice for slides — 5 built-in templates |
| `write_html`, `write_html_batch` | Bespoke layouts. Always pass `x`/`y` or `autoOffset:true` |
| `create_component_from_html` | Build a Component (not just a Frame) |
| `create_frame`, `create_text`, `create_rectangle`, `create_ellipse` | Imperative primitives — rarely needed if HTML pipeline works |
| `import_image` | Decode base64 → image fill |
| `instantiate_by_name` | Make instance by component name |
| `add_page`, `create_section` | File organization |

### Editing existing content (use these, not delete + rewrite)

| Tool | Use when |
|------|----------|
| `update_node_props` ★ | Universal property setter, batched. Use as default. |
| `patch_html` ★ | Selector-based bulk changes (`name:`, `name~:`, `type:`, `id:`, `*`) |
| `set_text`, `set_fills`, `set_strokes`, `set_opacity`, `set_corner_radius`, `set_effects` | Single-property setters (kept for compatibility) |
| `move_nodes`, `resize_nodes`, `rotate_nodes`, `reorder_nodes` | Geometry |
| `move_to_anchor` | "Place X right-of/below/aligned-with Y" |
| `align_nodes`, `distribute_nodes`, `pack_grid`, `make_slide_grid` | Multi-node layout |
| `auto_layout_from_positions` | Convert absolute → auto-layout |
| `regenerate_slide` ★ | Replace slide contents preserving frame |
| `batch_rename_nodes`, `find_replace_text` | Bulk text |
| `swap_component`, `detach_instance` | Component lifecycle |
| `clone_node`, `delete_nodes`, `reparent_nodes`, `group_nodes`, `ungroup_nodes` | Structure |
| `apply_style_to_node`, `apply_styles_batch` | Bind paint/text styles |

### Validation & debugging

| Tool | Use when |
|------|----------|
| `validate_html` ★ | Before any non-trivial `write_html` |
| `diff_node_vs_html` | Compare existing slide to intended HTML |
| `explain_layout` | "Why is this node sized this way?" |
| `explain_node` | One-line description (role + key props) |
| `get_recent_errors` ★ | After writes, surface silent failures |

### Styles & variables

| Tool | Use when |
|------|----------|
| `create_styles_from_palette` ★ | Bulk paint styles from `{name: hex}` |
| `create_text_scale` ★ | Bulk text styles from a typography scale |
| `import_design_tokens` | W3C / Style Dictionary tokens → Variables + Styles |
| `bind_variable_to_style` | Link a paint style to a variable so it follows mode changes |
| `create_paint_style`, `create_text_style`, `create_effect_style`, `create_grid_style` | Single-style creation |
| `create_variable_collection`, `create_variable`, `add_variable_mode`, `set_variable_value`, `bind_variable_to_node`, `delete_variable` | Variables |
| `update_paint_style`, `delete_style` | Lifecycle |
| `export_tokens` | Export current variables/styles as JSON or CSS |

### Export & handoff

| Tool | Output |
|------|--------|
| `get_screenshot` | base64 PNG |
| `save_screenshots` | Files to disk (PNG/SVG/JPG/PDF) |
| `export_frames_to_pdf` | Multi-page PDF |
| `export_node_as_react` | Tailwind TSX |
| `export_html_self_contained` | Single HTML file with embedded CSS + base64 images |
| `replace_image_globally` | Swap an image hash everywhere |
| `export_tokens` | Design tokens JSON / CSS |

★ = particularly important / frequently useful.

---

## Common gotchas

### `write_html` defaults to (0, 0)

If you call `write_html` without `x`/`y` or `autoOffset:true`, multiple consecutive calls will stack on top of each other. Either pass `x`/`y` explicitly, set `autoOffset:true`, or use `write_html_batch` (which handles spacing automatically).

### `right` / `bottom` CSS requires `position:absolute`

The B-2 fix added support for `right` and `bottom`, but only when `position:absolute` is also set. `validate_html` (v1.3.1) flags this. Without `position:absolute`, write_html silently uses (0, 0).

### Don't use `display:flex` on a div with absolute children

The B-5 fix silently drops flex when children use `position:absolute` (because flex would override the absolute positions). `validate_html` (v1.3.1) flags this. Cleaner to omit flex in that case.

### `delete_nodes` is rarely the right answer

When fixing existing content, use `update_node_props` or `patch_html` instead. Deletion costs tokens to delete, costs tokens to rebuild, and you lose every bound style and instance link.

### `regenerate_slide` is now safe (v1.3.1)

In v1.3.0 it was destructive on failure. In v1.3.1 it's transactional: if the new write fails, the original slide is left intact. But still — if the user wants per-element edits, prefer `update_node_props` over a full slide regenerate.

### Font loading is automatic in v1.3.1

`patch_html` and `update_node_props` now load fonts before any text-property change, so fontSize / text changes always apply on TEXT nodes (was a v1.3.0 bug).

### `slide_template` and `write_html` accept arbitrary 3-char hex (v1.3.1)

`#000`, `#FFF`, etc. now work. v1.3.0 produced NaN colors and crashed `set_fills`.

---

## Suggested workspace conventions

### Carousel slide dimensions
- Default: **1080 × 1350** (Instagram portrait)
- Square: **1080 × 1080** (Instagram square)
- Use these as `frameWidth` / `frameHeight` defaults in `slide_template` and `write_html_batch`.

### Slide spacing
- 80 px between slides in the working canvas (the `make_slide_grid` and `write_html_batch` defaults).
- 1160 px stride per slide (1080 + 80).

### Brand palette
No palette is hard-coded anywhere. Call `get_styles` to discover the file's actual paint styles before assuming any brand colors, and use `create_styles_from_palette` to set one up from scratch.

### Naming conventions
- Slide layer names: short, descriptive (e.g. "Cover", "Quote", "Comparison").
- Text inside slides: role-named (e.g. "Title", "Tagline", "Body", "Handle", "CTA").
- Components: namespaced with `/` (e.g. "Badge/Series", "Card/Default").

### Edit-not-rewrite ritual
When the user says "fix X on slide N":
1. `list_slides` (if N is unknown) or use the slide ID they reference
2. `inspect_node_as_html nodeId=<slide-N>`
3. From the outline, identify which descendant node IDs need to change
4. `update_node_props updates=[...]` — do it atomically
5. (optional) `get_screenshot nodeId=<slide-N>` to confirm visually

---

## Failure-mode triage

If a tool call returns an error:

1. **`Node not found: X:Y`** → user gave a wrong ID. Run `inspect_node_as_html` or `list_slides` to recover the right one.
2. **`HUG can only be set on auto-layout frames…`** → fixed in v1.3.1. If you still see this, your binary is older.
3. **`Expected number, received nan at color.b`** → fixed in v1.3.1 (3-char hex). If you still see this, your binary is older.
4. **`patch_html matched but applied:0`** → fixed in v1.3.1 (font load). Check `results[].nodes[].errors` for actual cause.
5. **`Cannot replace root node`** → tried `mode:replace` on the root. Use `mode:insert-children` instead.
6. **WebSocket error / no response** → plugin window closed. Ask the user to reopen it.
7. **`figma is not defined`** → plugin not running. Same as above.
8. **Nothing visibly happened** → call `get_recent_errors` and check.

For anything else, call `health_check` to confirm the bridge is alive, then re-attempt with a smaller payload.

---

## Operational checklist

Before doing real work:
- [ ] User has Figma Desktop open with the plugin running ("Figma MCP Go — Tharun")
- [ ] `health_check` returns `ok: true` with `version: "1.3.0"` (or higher)
- [ ] If you're going to make >5 tool calls, mention it to the user up front

After non-trivial work:
- [ ] `get_recent_errors limit=10` — check for silent failures
- [ ] `get_screenshot` of the result for visual confirmation (or `export_html_self_contained` for richer preview)

---

## When to break the rules

The cardinal rules are defaults, not laws. Override them when:

- **Skip `validate_html`** for tiny one-line HTML (e.g. setting a single layer name).
- **Skip `health_check`** if you just successfully called another tool — bridge is obviously alive.
- **Use `delete_nodes`** when the user's intent is genuinely deletion (cleanup, removing a slide that's no longer needed). The rule is about edits, not removals.
- **Use `write_html_batch`** instead of N calls to `write_html` for ≥3 slides. Single tool call beats N.

---

## Where to read more

- [tools-reference.md](tools-reference.md) — every tool with one-line descriptions
- [agent-toolkit-v1.3.md](agent-toolkit-v1.3.md) — deep dive into Categories A–H
- [bug-fixes-v1.3.md](bug-fixes-v1.3.md) — B-1..B-8 details
- [skill/SKILL.md](skill/SKILL.md) — short skill description for skill manifests
- [skill/decision-tree.md](skill/decision-tree.md) — overlap with this guide, in pure tabular form
- [recipes/carousel-slides.md](recipes/carousel-slides.md) — end-to-end carousel post workflow
- [recipes/edit-not-rewrite.md](recipes/edit-not-rewrite.md) — the patch-instead-of-redo pattern
- [recipes/design-system-bootstrap.md](recipes/design-system-bootstrap.md) — variables + styles from tokens

---

## Last word

The MCP is opinionated about **edit, don't rewrite**. Two-thirds of the v1.3.0 work was building tools that make editing cheaper than rewriting. Use them. If you find yourself about to call `delete_nodes` on something the user just made, stop and ask whether `update_node_props` or `patch_html` could do it.

When in doubt, look before you leap: `health_check`, `inspect_node_as_html`, `validate_html`, `get_recent_errors` are all cheap. They'll save you ten failed writes.

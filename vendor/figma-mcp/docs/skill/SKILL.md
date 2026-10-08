---
name: figma-mcp-toolkit
description: Operate Figma directly through 105 MCP tools — create, edit, validate, and observe designs without leaving the agent loop. Triggers on Figma URLs, "build a slide", "fix this layout", "create paint styles from", "instantiate component", "patch slide title", or any Figma editing request.
version: 1.3.0
---

# Figma MCP Toolkit

Operate a live Figma file via 105 MCP tools. This skill is workspace-agnostic — connect any Figma file and start editing. No REST API tokens, no rate limits.

## Quick mental model

The toolkit splits into nine groups:

| Group | When to use it |
|-------|---------------|
| **Read** (`get_*`, `search_*`, `scan_*`) | Inspect what's there before changing it |
| **Write — Create** (`create_frame`, `create_text`, `write_html`, `slide_template`) | New nodes |
| **Write — Modify** (`set_*`, `move_nodes`, `resize_nodes`, `update_node_props`, `patch_html`) | Edit existing nodes |
| **Layout** (`auto_layout_from_positions`, `align_nodes`, `distribute_nodes`, `pack_grid`, `move_to_anchor`) | Position math |
| **Components** (`create_component`, `instantiate_by_name`, `set_instance_overrides_batch`) | Reusable design system |
| **Styles** (`create_paint_style`, `create_styles_from_palette`, `import_design_tokens`, `bind_variable_to_style`) | Design tokens |
| **Validation** (`validate_html`, `diff_node_vs_html`, `explain_layout`) | Check before / inspect after |
| **Export** (`get_screenshot`, `export_node_as_react`, `export_html_self_contained`, `save_screenshots`, `export_frames_to_pdf`) | Hand off to engineering |
| **Diagnostics** (`health_check`, `get_recent_errors`, `explain_node`) | When things don't look right |

## The cardinal rules

1. **Never delete-and-rewrite** — use `update_node_props` or `patch_html`. Deletion costs tokens, rebuilding costs tokens, and you lose every bound style and instance link.
2. **Validate before writing big payloads** — `validate_html` is free and catches malformed HTML, missing fonts, and unsupported CSS before the real call.
3. **Health-check at session start** — `health_check` confirms the plugin is connected. If it fails, every other call will too.
4. **Surface silent failures** — call `get_recent_errors` after non-trivial writes to see what was skipped.
5. **Position is part of the contract** — `write_html` defaults to (0,0). Pass `x`/`y` or `autoOffset:true` so consecutive calls don't stack.
6. **For slides, use `slide_template` first** — five built-in templates cover most carousel patterns; only fall back to `write_html` for bespoke layouts.

## Decision tree

See [decision-tree.md](decision-tree.md) for "user said X → use tool Y".

## Examples

See [examples/](examples/) for canonical input/output pairs.

## Limitations

- Figma must be open with the plugin running — there is no cloud / headless mode.
- `display: grid` is not supported.
- `margin` is parsed but not applied (use padding on parent or gap inside auto-layout).
- Complex `flex: a b c%` shorthands aren't parsed; use `flex: 1` or `flexGrow: 1`.
- Partial percentage widths (e.g. `width: 33%`) fall back to HUG; use explicit pixel widths or `100%` (= FILL).

## Internal references

- [Architecture](../architecture.md)
- [Tools reference](../tools-reference.md)
- [Bug fixes (v1.3.0)](../bug-fixes-v1.3.md)
- [Agent toolkit (v1.3.0)](../agent-toolkit-v1.3.md)
- [Carousel recipe](../recipes/carousel-slides.md)
- [Edit-not-rewrite recipe](../recipes/edit-not-rewrite.md)

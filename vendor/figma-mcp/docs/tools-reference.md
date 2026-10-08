# Tools Reference

105 tools, organized by category. For deep details on any tool, see the descriptions registered in `internal/tools_*.go` (these are also surfaced to MCP-aware clients via `tools/list`).

## Read

| Tool | Purpose |
|------|---------|
| `get_document` | Full current page tree |
| `get_metadata` | File name, pages, current page |
| `get_pages` | Lightweight page list |
| `get_selection` | Currently-selected nodes |
| `get_node` | Single node by ID |
| `get_nodes_info` | Multiple nodes by ID |
| `get_design_context` | Depth-limited tree (`detail`: minimal/compact/full) |
| `search_nodes` | Find nodes by name substring + type |
| `scan_text_nodes` | All text nodes in a subtree |
| `scan_nodes_by_types` | Nodes matching given types |
| `get_viewport` | Viewport center, zoom, visible bounds |
| `get_styles` | Paint, text, effect, grid styles |
| `get_variable_defs` | Variable collections + values |
| `get_local_components` | Components + variants |
| `get_annotations` | Dev-mode annotations |
| `get_fonts` | Fonts in current page, sorted by frequency |
| `get_reactions` | Prototype reactions on a node |

## Write — create / modify (existing v1.x)

| Tool | Purpose |
|------|---------|
| `create_frame`, `create_rectangle`, `create_ellipse`, `create_text` | Primitive nodes |
| `create_component`, `create_section`, `add_page` | Containers |
| `import_image` | Decode base64 → image fill |
| `set_text`, `set_fills`, `set_strokes`, `set_opacity`, `set_corner_radius` | Single-property setters |
| `set_auto_layout`, `set_blend_mode`, `set_constraints`, `set_visible` | Layout / appearance |
| `set_effects` | Drop shadow / blur |
| `move_nodes`, `resize_nodes`, `rotate_nodes`, `reorder_nodes` | Geometry |
| `clone_node`, `delete_nodes`, `rename_node`, `reparent_nodes` | Lifecycle |
| `lock_nodes`, `unlock_nodes`, `group_nodes`, `ungroup_nodes` | Organization |
| `batch_rename_nodes`, `find_replace_text` | Bulk operations |
| `swap_component`, `detach_instance` | Components |
| `set_reactions`, `remove_reactions` | Prototypes |
| `delete_page`, `rename_page`, `navigate_to_page` | Pages |
| `apply_style_to_node`, `apply_styles_batch` | Style binding |
| `create_paint_style`, `create_text_style`, `create_effect_style`, `create_grid_style`, `update_paint_style`, `delete_style` | Style CRUD |
| `create_variable_collection`, `add_variable_mode`, `create_variable`, `set_variable_value`, `bind_variable_to_node`, `delete_variable` | Variables |
| `write_html`, `write_html_batch`, `get_html` | HTML round-trip |

## Export

| Tool | Purpose |
|------|---------|
| `get_screenshot` | Base64 PNG |
| `save_screenshots` | Batch export to disk |
| `export_frames_to_pdf` | Multi-page PDF |
| `export_tokens` | Variables + styles → JSON / CSS |

## v1.3.0 — Agent toolkit (Categories A–H)

### A. Edit-not-rewrite

| Tool | Purpose |
|------|---------|
| `update_node_props` | Universal property setter, batched |
| `patch_html` | CSS-selector-style patches over a subtree |
| `inspect_node_as_html` | HTML + ID outline + style summary |
| `move_to_anchor` | Move a node relative to another (align/below/right-of/...) |

### B. Validation & preview

| Tool | Purpose |
|------|---------|
| `validate_html` | Dry-run parse, returns tree + warnings |
| `diff_node_vs_html` | Compare node vs. intended HTML |
| `explain_layout` | Plain-English explanation of sizing/position |

### C. Layout intelligence

| Tool | Purpose |
|------|---------|
| `auto_layout_from_positions` | Convert absolute children to auto-layout |
| `align_nodes` | Align selected nodes |
| `distribute_nodes` | Distribute selected nodes evenly |
| `pack_grid` | Pack nodes into N×M grid |

### D. Component ergonomics

| Tool | Purpose |
|------|---------|
| `create_component_from_html` | HTML → Component (not Frame) |
| `instantiate_by_name` | Make instance by component name |
| `set_instance_overrides_batch` | Apply many overrides in one call |

### E. Style ecosystem

| Tool | Purpose |
|------|---------|
| `create_styles_from_palette` | N hex colors → N paint styles |
| `create_text_scale` | Type scale → N text styles |
| `import_design_tokens` | W3C tokens → Variables + Styles |
| `bind_variable_to_style` | Link paint style to variable |

### F. Asset & export

| Tool | Purpose |
|------|---------|
| `export_node_as_react` | React + Tailwind component |
| `export_html_self_contained` | Single-file HTML preview |
| `replace_image_globally` | Swap image hash everywhere |

### G. Slide / carousel

| Tool | Purpose |
|------|---------|
| `slide_template` | Built-in templates (cover/quote/list-3/comparison/cta) |
| `regenerate_slide` | Replace contents preserving frame |
| `make_slide_grid` | Arrange slides in preview grid |
| `list_slides` | Ordered slide-shaped frames in page |

### H. Diagnostics

| Tool | Purpose |
|------|---------|
| `health_check` | Confirm bridge alive, return inventory |
| `get_recent_errors` | Last N silent failures |
| `explain_node` | Plain-English description of a node |

## Total: 105 tools

For the full schema of any tool (parameter names, types, descriptions), use your MCP client's `tools/list` introspection.

# Write-path audit — V1.4.3B

Audited before implementation against owned 1.0.0 a0b2e1c. The adjacent JSON retains each exact public input schema and per-tool audit fields. A conservative partial/multiple-mutation flag means callers must not assume atomicity, including one-node handlers that create before font/property assignment. No automatic transport retry exists. Every plugin response can be lost after native commit. Existing HTML requestId cache is process-local and covers only selected paths; it is not general operation idempotency.

Flow: MCP tool handler → Node.Send → leader bridge or follower /rpc → plugin main dispatcher → listed handler. Several Go handlers rebuild params, so reliability metadata needs a shared context wrapper and must also be validated at direct RPC/plugin boundaries. Read tools, file exports and UI selection/viewport operations are distinguished from document mutations.

| Tool | Category | Dispatch | Native mutation |
|---|---|---|---|
| add_page | PAGE | plugin/src/write-page.ts | true |
| add_variable_mode | VARIABLE | plugin/src/write-variables.ts | true |
| align_nodes | UPDATE | plugin/src/layout.ts | true |
| apply_style_to_node | STYLE | plugin/src/write-styles.ts | true |
| apply_styles_batch | STYLE | plugin/src/write-styles.ts | true |
| auto_layout_from_positions | UPDATE | plugin/src/layout.ts | true |
| batch_rename_nodes | UPDATE | plugin/src/write-modify.ts | true |
| bind_variable_to_node | VARIABLE | plugin/src/write-styles.ts | true |
| bind_variable_to_style | VARIABLE | plugin/src/style-ecosystem.ts | true |
| clone_node | CREATE | plugin/src/write-modify.ts | true |
| combine_as_variants | COMPONENT | plugin/src/components-v2.ts | true |
| create_component | COMPONENT | plugin/src/write-create.ts | true |
| create_component_from_html | HTML/BATCH | plugin/src/components-v2.ts | true |
| create_effect_style | STYLE | plugin/src/write-styles.ts | true |
| create_ellipse | CREATE | plugin/src/write-create.ts | true |
| create_frame | CREATE | plugin/src/write-create.ts | true |
| create_grid_style | STYLE | plugin/src/write-styles.ts | true |
| create_paint_style | STYLE | plugin/src/write-styles.ts | true |
| create_rectangle | CREATE | plugin/src/write-create.ts | true |
| create_section | CREATE | plugin/src/write-create.ts | true |
| create_styles_from_palette | STYLE | plugin/src/style-ecosystem.ts | true |
| create_text | CREATE | plugin/src/write-create.ts | true |
| create_text_scale | CREATE | plugin/src/style-ecosystem.ts | true |
| create_text_style | STYLE | plugin/src/write-styles.ts | true |
| create_variable | VARIABLE | plugin/src/write-variables.ts | true |
| create_variable_collection | VARIABLE | plugin/src/write-variables.ts | true |
| delete_nodes | DELETE | plugin/src/write-components.ts | true |
| delete_page | PAGE | plugin/src/write-page.ts | true |
| delete_style | STYLE | plugin/src/write-styles.ts | true |
| delete_variable | VARIABLE | plugin/src/write-variables.ts | true |
| detach_instance | COMPONENT | plugin/src/write-components.ts | true |
| distribute_nodes | UPDATE | plugin/src/layout.ts | true |
| group_nodes | UPDATE | plugin/src/write-components.ts | true |
| import_design_tokens | CREATE | plugin/src/style-ecosystem.ts | true |
| import_image | CREATE | plugin/src/write-create.ts | true |
| instantiate_by_name | UPDATE | plugin/src/components-v2.ts | true |
| lock_nodes | UPDATE | plugin/src/write-modify.ts | true |
| make_slide_grid | UPDATE | plugin/src/slides.ts | true |
| move_nodes | UPDATE | plugin/src/write-modify.ts | true |
| move_to_anchor | UPDATE | plugin/src/edit.ts | true |
| navigate_to_page | OTHER | plugin/src/write-components.ts | false |
| pack_grid | UPDATE | plugin/src/layout.ts | true |
| patch_html | HTML/BATCH | plugin/src/edit.ts | true |
| regenerate_slide | UPDATE | plugin/src/slides.ts | true |
| remove_reactions | PROTOTYPE | plugin/src/write-prototype.ts | true |
| rename_node | UPDATE | plugin/src/write-modify.ts | true |
| rename_page | PAGE | plugin/src/write-page.ts | true |
| reorder_nodes | ORDERING | plugin/src/write-modify.ts | true |
| reparent_nodes | REPARENT | plugin/src/write-modify.ts | true |
| replace_image_globally | UPDATE | plugin/src/export-v2.ts | true |
| resize_nodes | UPDATE | plugin/src/write-modify.ts | true |
| rotate_nodes | UPDATE | plugin/src/write-modify.ts | true |
| set_auto_layout | UPDATE | plugin/src/write-modify.ts | true |
| set_blend_mode | UPDATE | plugin/src/write-modify.ts | true |
| set_constraints | UPDATE | plugin/src/write-modify.ts | true |
| set_corner_radius | UPDATE | plugin/src/write-modify.ts | true |
| set_effects | STYLE | plugin/src/write-styles.ts | true |
| set_fills | STYLE | plugin/src/write-modify.ts | true |
| set_instance_overrides_batch | COMPONENT | plugin/src/components-v2.ts | true |
| set_opacity | UPDATE | plugin/src/write-modify.ts | true |
| set_reactions | PROTOTYPE | plugin/src/write-prototype.ts | true |
| set_strokes | STYLE | plugin/src/write-modify.ts | true |
| set_text | UPDATE | plugin/src/write-modify.ts | true |
| set_variable_value | VARIABLE | plugin/src/write-variables.ts | true |
| set_visible | UPDATE | plugin/src/write-modify.ts | true |
| slide_template | UPDATE | plugin/src/slides.ts | true |
| swap_component | COMPONENT | plugin/src/write-components.ts | true |
| ungroup_nodes | UPDATE | plugin/src/write-components.ts | true |
| unlock_nodes | UPDATE | plugin/src/write-modify.ts | true |
| update_node_props | UPDATE | plugin/src/edit.ts | true |
| update_paint_style | STYLE | plugin/src/write-styles.ts | true |
| write_html | HTML/BATCH | plugin/src/write-html.ts | true |
| write_html_batch | HTML/BATCH | plugin/src/write-html.ts | true |

## Result and failure audit

Create/HTML paths can create nodes before later failure; batch update/delete/reparent/style/component paths can return per-item errors without throwing. A successful transport response is not sufficient for COMMITTED. The reliability boundary must inspect soft failures and retain partial results conservatively. Style/variable IDs are not node IDs and must not be mislabelled. Source/component identity must be checked inside the same serialized plugin execution, before and after guarded instantiation/swap.

Preconditions will initially cover node type/parent/name/source/set/reaction count/child count/visibility and a scoped revision. Unsupported or unresolved targets must fail before dispatch. Existing unguarded semantics remain available.

# Recipe — Edit, don't rewrite

The single most expensive failure mode for an agent operating Figma is the rewrite loop: notice something is slightly wrong, delete the slide, regenerate, find a *different* something slightly wrong, delete again, ad infinitum.

This recipe codifies the alternative.

## When the user says "fix the title color"

```
inspect_node_as_html nodeId=<slide>
# → returns html + outline; scan outline for the title node ID

update_node_props updates=[
  {nodeId: <title>, props: {fillColor: "#000"}}
]
```

Done. 2 tool calls. No rebuild.

## When the user says "the slide is mostly right but everything's slightly off"

Use `diff_node_vs_html`:

```
# Compose the intended HTML mentally or from a saved template
# Then:
diff_node_vs_html
  nodeId: <slide>
  targetHtml: <intended>
```

Returns:
- `diffs` — what's different
- `patch` — ready-to-apply update array

Pipe `patch` straight into:

```
update_node_props updates=<patch>
```

## When you need to change "all headlines on this page"

```
patch_html
  targetNodeId: <pageId>
  patches: [
    {selector: "name~:headline", props: {fillColor: "#000", fontSize: 64}}
  ]
```

The selector walks the subtree and applies to every match.

## When the wrong thing is the *layout*

Don't rewrite. Use:

- `align_nodes` — alignment errors
- `distribute_nodes` — uneven gaps
- `move_to_anchor` — single node out of place
- `auto_layout_from_positions` — convert absolute mess to auto-layout

## When something is genuinely broken and edit can't fix it

OK, *now* you can rewrite — but at the slide level, not the post level:

```
regenerate_slide
  frameId: <slide>
  html: <new HTML>
  preserveBackground: true
```

This replaces the slide's children but keeps its position, name, size, and (by default) background. The frame stays put.

## When you absolutely must delete

Document why in your reasoning. Common legitimate cases:
- Removing a slide that's no longer needed (use `delete_nodes`)
- Replacing an instance with a fundamentally different component (use `swap_component` if same family, `delete_nodes` + `instantiate_by_name` otherwise)

The smell test: if you find yourself deleting > 1 slide at a time, stop and ask whether `regenerate_slide` or `update_node_props` could do it.

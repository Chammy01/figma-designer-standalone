# Decision Tree — "Which tool when?"

Quick lookup: user-facing intent → tools to use, in priority order.

## "Build me an Instagram carousel of N slides"

1. `slide_template action=list` — see what's available
2. For each slide: `slide_template action=instantiate template=cover|quote|list-3|comparison|cta slots={...} x=...`
3. `make_slide_grid` to lay them out for review
4. `health_check` after batch to confirm everything's wired

If the templates don't fit your design language: `write_html` with explicit `x`/`y` per slide.

## "Build a custom slide / mockup from scratch"

1. `validate_html` first — catches bad CSS for free
2. `write_html` with `targetNodeId`, `styleMapping`, `x`, `y`
3. `inspect_node_as_html` to verify the result if anything looks off

## "Fix the title color on slide 3"

1. `inspect_node_as_html nodeId=<slide3>` — find the title's `nodeId`
2. `update_node_props updates=[{nodeId:<title>, props:{fillColor:"#000"}}]`

NOT `delete_nodes` + `write_html`.

## "Change the same color across many nodes"

1. If they share a paint style: `update_paint_style` (one call)
2. Else: `patch_html targetNodeId=<root> patches=[{selector:"name~:headline", props:{fillColor:"#000"}}]`
3. Else: collect IDs and use `update_node_props` with multiple updates

## "Realign these cards"

1. `align_nodes nodeIds=[...] mode=top` — align tops
2. `distribute_nodes nodeIds=[...] mode=horizontal-spacing` — even gaps
3. Or `pack_grid nodeIds=[...] columns=N gap=24` for an N-column layout

## "Convert this absolute layout to auto-layout"

1. `auto_layout_from_positions nodeId=<frame> dryRun=true` — see inferred values
2. If they look right, drop `dryRun` and apply

## "Place X to the right of Y"

`move_to_anchor nodeId=X anchorId=Y mode=right-of gap=16`

## "Set up our brand colors"

1. `create_styles_from_palette palette={"Brand/Primary":"#5B5FEF",...}` — fastest
2. Or `import_design_tokens tokens={...}` if you have a W3C token JSON

## "Make a component out of this slide"

`create_component_from_html html=<...> targetNodeId=<page> name="Card/Default"`

## "Instantiate this card 12 times with different copy"

```
instantiate_by_name componentName="Card/Default" parentId=<grid> x=0 y=0
```
Then for each copy:
```
set_instance_overrides_batch updates=[
  {instanceId: A, overrides: {Title: "First", Subtitle: "..."}},
  {instanceId: B, overrides: {Title: "Second", Subtitle: "..."}},
  ...
]
```

## "Hand this off to engineering"

- React + Tailwind: `export_node_as_react`
- Standalone HTML preview: `export_html_self_contained`
- PNG / PDF: `save_screenshots` or `export_frames_to_pdf`

## "Why is this node the wrong size?"

1. `explain_layout nodeId=...` — narrates the sizing factors
2. If still unclear, `inspect_node_as_html nodeId=...` to see the full subtree

## "I'm getting weird results"

1. `health_check` — confirm bridge is alive
2. `get_recent_errors limit=20` — see silent failures
3. If nothing logged, the issue is in your input — try `validate_html`

## "I want to know what tools exist"

The MCP discovery interface lists all 105 tools with descriptions. Most agents expose this via a "list tools" command. If you're an LLM and your client surfaces tool descriptions, search for keywords like "style", "slide", "layout".

# Example: Edit-not-rewrite

Goal: change the headline color and tagline text on an existing slide, preserving everything else (bound styles, position, instance links).

## The wrong way (don't do this)

```
delete_nodes nodeIds=[<oldSlide>]
write_html targetNodeId=<page> html=<the entire slide HTML again, with the change>
```

Cost: 2 tool calls, lose every bound style, agent re-derives the layout, possibly introduces drift.

## The right way

```
inspect_node_as_html nodeId=<slide>
```

Returns:
```json
{
  "html": "...",
  "outline": [
    {"nodeId": "1:24", "name": "Slide", "type": "FRAME", ...},
    {"nodeId": "1:25", "name": "Title", "type": "TEXT", ...},
    {"nodeId": "1:26", "name": "Tagline", "type": "TEXT", ...}
  ]
}
```

Then:
```
update_node_props
  updates: [
    {nodeId: "1:25", props: {fillColor: "#000000"}},
    {nodeId: "1:26", props: {text: "Updated tagline copy"}}
  ]
```

## Variant — if you don't know the IDs

```
patch_html
  targetNodeId: "1:24"
  patches: [
    {selector: "name:Title", props: {fillColor: "#000000"}},
    {selector: "name:Tagline", props: {text: "Updated tagline copy"}}
  ]
```

`patch_html` walks the subtree and matches by selector — useful when the slide came from a template and you know the layer names but not the IDs.

## Variant — diff against intended

If you have the "ideal" HTML and want to know what's drifted:

```
diff_node_vs_html
  nodeId: "1:24"
  targetHtml: "<the intended HTML>"
```

Returns a `diffs` list and a ready-to-apply `patch` array — feed straight into `update_node_props`.

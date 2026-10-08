# Example: Create a cover slide

Goal: build a 1080×1350 cover slide with a title, tagline, and Instagram handle, on the current page, at x=0.

## Approach 1 — using `slide_template` (preferred, fastest)

```
slide_template
  action: "instantiate"
  template: "cover"
  slots: { "title": "How AI Changes Design", "tagline": "A field guide for designers", "handle": "@studio.example" }
  parentId: <currentPageId>
  x: 0
  y: 0
  frameWidth: 1080
  frameHeight: 1350
```

Result: a single Figma frame with three text children, named correctly, ready for further edits.

## Approach 2 — using `write_html` (custom design)

```
write_html
  targetNodeId: <currentPageId>
  html: |
    <div style="width:1080px; height:1350px; background:#FDF4E3;" layer-name="Cover">
      <p layer-name="Title" style="position:absolute; left:70px; top:160px; font-family:Outfit; font-weight:500; font-size:96px; color:#134686;">How AI Changes Design</p>
      <p layer-name="Tagline" style="position:absolute; left:70px; top:300px; font-family:Inter; font-size:32px; color:#666;">A field guide for designers</p>
      <p layer-name="Handle" style="position:absolute; left:70px; top:1260px; font-family:Inter; font-size:24px; color:#134686;">@studio.example</p>
    </div>
  x: 0
  y: 0
```

## Sanity check

After either approach, verify:

```
inspect_node_as_html nodeId=<newSlideId>
```

If the title looks wrong, fix it without rewriting:

```
update_node_props
  updates: [
    {nodeId: <titleId>, props: {text: "How AI Reshapes Design", fontSize: 88}}
  ]
```

## What NOT to do

- Don't pass `display: flex` on the root — children using `position: absolute` will lose their positions (mitigated by B-5 fix, but cleaner without).
- Don't omit `width` and `height` on the root and expect a 1080×1350 slide — be explicit.
- Don't use `delete_nodes` + `write_html` to fix a typo. Use `update_node_props`.

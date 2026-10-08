# Recipe — Instagram carousel post (end to end)

Goal: produce a 5-slide 1080×1350 carousel from a content brief, with consistent typography and an editable structure.

## 0. Health check

```
health_check
```

Confirm the bridge is alive. If `ok:false` or the call errors, ask the user to reopen the plugin window in Figma.

## 1. Set up styles (one-time per file)

```
create_styles_from_palette palette={
  "Brand/Primary":   "#134686",
  "Brand/Accent":    "#FF6B6B",
  "Surface/Default": "#FDF4E3",
  "Text/Primary":    "#000000"
}

create_text_scale scale={
  "Heading/Cover":   {"fontFamily":"Outfit","fontSize":96,"fontWeight":"Medium"},
  "Heading/Section": {"fontFamily":"Outfit","fontSize":64,"fontWeight":"Medium"},
  "Body/Default":    {"fontFamily":"Inter","fontSize":32}
}
```

Capture the returned style IDs into a `styleMapping` you'll reuse:

```json
{
  "headline-cover":   {"textStyleId":"<Heading/Cover>", "paintStyleId":"<Brand/Primary>"},
  "headline-section": {"textStyleId":"<Heading/Section>","paintStyleId":"<Brand/Primary>"},
  "body":             {"textStyleId":"<Body/Default>",  "paintStyleId":"<Text/Primary>"}
}
```

## 2. Build slides

For uniform slides, prefer templates:

```
slide_template action=instantiate template=cover slots={...} x=0 y=0
slide_template action=instantiate template=list-3 slots={...} x=1160 y=0
slide_template action=instantiate template=quote slots={...} x=2320 y=0
slide_template action=instantiate template=comparison slots={...} x=3480 y=0
slide_template action=instantiate template=cta slots={...} x=4640 y=0
```

For bespoke slides, use `write_html` with explicit `x` and `styleMapping`:

```
write_html
  targetNodeId: <currentPageId>
  html: <bespoke HTML for slide 2>
  styleMapping: <captured above>
  x: 1160
  y: 0
```

## 3. Verify

```
list_slides
```

Should return your 5 slides in order.

```
make_slide_grid frameIds=<the 5 IDs> columns=5 gap=80
```

This re-tidies the X/Y of all 5 slides in case any drifted.

## 4. Polish individual slides

```
inspect_node_as_html nodeId=<slide-3>
```

If anything looks off:

```
update_node_props updates=[
  {nodeId: <quote text>, props: {fontSize: 56, fillColor: "#FFFFFF"}}
]
```

## 5. Sanity check before publishing

```
get_recent_errors
```

Catches silent failures (font missing, style ID typo'd).

```
export_html_self_contained nodeId=<slide-1>
```

Returns a single-file HTML you can open in a browser to verify visual fidelity vs. Figma.

## 6. Export final assets

```
save_screenshots items=[
  {nodeId: <slide-1>, outputPath: "out/slide-1.png", scale: 2},
  {nodeId: <slide-2>, outputPath: "out/slide-2.png", scale: 2},
  ...
]
```

or as a multi-page PDF:

```
export_frames_to_pdf items=[
  {nodeId: <slide-1>, outputPath: "out/post.pdf"}, ...
]
```

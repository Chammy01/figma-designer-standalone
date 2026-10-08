# Recipe — Design system bootstrap

Goal: turn a brand brief (palette, type scale, spacing, radii) into a working set of Figma Variables + Styles in one tool sequence.

## Path A — fastest (palette + type scale)

```
create_styles_from_palette palette={
  "Brand/Primary":   "#5B5FEF",
  "Brand/Accent":    "#FFD700",
  "Surface/Default": "#FFFFFF",
  "Surface/Inverse": "#0A0A0A",
  "Text/Primary":    "#0A0A0A",
  "Text/Secondary":  "#666666"
}

create_text_scale scale={
  "Display/Large":   {"fontFamily":"Outfit","fontSize":120,"fontWeight":"Medium","lineHeight":128},
  "Display/Medium":  {"fontFamily":"Outfit","fontSize":80, "fontWeight":"Medium","lineHeight":88},
  "Heading/Section": {"fontFamily":"Outfit","fontSize":48, "fontWeight":"Medium","lineHeight":56},
  "Body/Large":      {"fontFamily":"Inter", "fontSize":24, "fontWeight":"Regular","lineHeight":36},
  "Body/Default":    {"fontFamily":"Inter", "fontSize":16, "fontWeight":"Regular","lineHeight":24},
  "Caption/Default": {"fontFamily":"Inter", "fontSize":12, "fontWeight":"Regular","lineHeight":16}
}
```

Done. You now have 6 paint styles and 6 text styles, ready to bind via `apply_styles_batch` or `styleMapping` in `write_html`.

## Path B — full token JSON (W3C / Style Dictionary)

```
import_design_tokens
  collectionName: "Brand Tokens"
  exposeAsStyles: true
  tokens: {
    "color": {
      "brand": {
        "primary":   {"$value": "#5B5FEF", "$type": "color"},
        "accent":    {"$value": "#FFD700", "$type": "color"}
      },
      "surface": {
        "default":   {"$value": "#FFFFFF", "$type": "color"},
        "inverse":   {"$value": "#0A0A0A", "$type": "color"}
      },
      "text": {
        "primary":   {"$value": "#0A0A0A", "$type": "color"},
        "secondary": {"$value": "#666666", "$type": "color"}
      }
    },
    "spacing": {
      "xs":  {"$value": "4px",  "$type": "dimension"},
      "sm":  {"$value": "8px",  "$type": "dimension"},
      "md":  {"$value": "16px", "$type": "dimension"},
      "lg":  {"$value": "24px", "$type": "dimension"},
      "xl":  {"$value": "32px", "$type": "dimension"},
      "xxl": {"$value": "64px", "$type": "dimension"}
    },
    "radius": {
      "sm": {"$value": "4px",  "$type": "radius"},
      "md": {"$value": "12px", "$type": "radius"},
      "lg": {"$value": "24px", "$type": "radius"}
    }
  }
```

Result: a `Brand Tokens` Variable Collection containing COLOR + FLOAT variables, plus matching paint styles for the colors. Variables can be bound to node properties or to paint styles.

## Path C — bind a variable to a paint style

After import, link styles to variables so style values follow mode changes:

```
bind_variable_to_style
  styleId: "<S:Brand/Primary>"
  variableId: "<VariableID:Brand Tokens/color/brand/primary>"
```

Now `Brand/Primary` paint style displays whatever value the variable holds in the active mode.

## Path D — using styles in HTML

When using `write_html`:

```
write_html
  styleMapping: {
    "headline":   {"textStyleId":"<Display/Large>", "paintStyleId":"<Brand/Primary>"},
    "body":       {"textStyleId":"<Body/Default>",  "paintStyleId":"<Text/Primary>"},
    "subtle":     {"textStyleId":"<Caption/Default>","paintStyleId":"<Text/Secondary>"}
  }
  html: <div><p class="headline">...</p><p class="body">...</p></div>
```

Or with variables (B-8):

```
styleMapping: {
  "card-bg": {
    "variables": [{"field":"fillColor","variableId":"<VariableID:.../surface/default>"}]
  }
}
```

## Sanity check

```
get_styles
get_variable_defs
```

Confirm the styles and variables exist with the names you expect.

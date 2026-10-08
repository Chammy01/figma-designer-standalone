# Example: Bootstrap design tokens

Goal: take a brand color palette + type scale and produce matching Figma Variables and Styles.

## Path 1 — palette only (fastest)

```
create_styles_from_palette
  palette: {
    "Brand/Primary": "#5B5FEF",
    "Brand/Accent": "#FFD700",
    "Surface/Default": "#FDF4E3",
    "Surface/Inverse": "#134686",
    "Text/Primary": "#000000",
    "Text/Secondary": "#666666"
  }
```

Returns 6 paint style IDs. Use them in subsequent `write_html` via `styleMapping`:

```json
{
  "headline": {"paintStyleId": "S:Brand/Primary"},
  "body": {"paintStyleId": "S:Text/Primary"}
}
```

## Path 2 — typography scale

```
create_text_scale
  scale: {
    "Heading/Display":  {"fontFamily":"Outfit", "fontSize": 96, "fontWeight":"Medium", "lineHeight": 104},
    "Heading/Section":  {"fontFamily":"Outfit", "fontSize": 48, "fontWeight":"Medium", "lineHeight": 56},
    "Body/Default":     {"fontFamily":"Inter",  "fontSize": 18, "fontWeight":"Regular","lineHeight": 28},
    "Caption/Default":  {"fontFamily":"Inter",  "fontSize": 14, "fontWeight":"Regular","lineHeight": 20}
  }
```

## Path 3 — full token JSON

If you have a W3C / Style Dictionary export:

```
import_design_tokens
  collectionName: "Waves Brand"
  exposeAsStyles: true
  tokens: {
    "color": {
      "brand": {
        "primary": {"$value": "#5B5FEF", "$type": "color"},
        "accent":  {"$value": "#FFD700", "$type": "color"}
      }
    },
    "spacing": {
      "xs": {"$value": "4px",  "$type": "dimension"},
      "sm": {"$value": "8px",  "$type": "dimension"},
      "md": {"$value": "16px", "$type": "dimension"},
      "lg": {"$value": "32px", "$type": "dimension"}
    },
    "radius": {
      "sm": {"$value": "4px",  "$type": "radius"},
      "md": {"$value": "12px", "$type": "radius"}
    }
  }
```

Result: a `Waves Brand` Variable Collection with COLOR and FLOAT variables, plus matching Paint Styles for the colors (because `exposeAsStyles=true`).

## Path 4 — bind a paint style to a variable

After both exist:

```
bind_variable_to_style styleId="S:Brand/Primary" variableId="VariableID:Waves Brand/color/brand/primary"
```

Now `Brand/Primary` paint style follows the variable's mode (light/dark, theme A/B).

/**
 * style-ecosystem.ts — Category E: bulk style/variable creation.
 *
 *   create_styles_from_palette
 *   create_text_scale
 *   import_design_tokens
 *   bind_variable_to_style
 */

function hexToRgb(hex: string): { r: number; g: number; b: number; a?: number } | null {
  const v = hex.replace("#", "");
  if (v.length === 3) {
    const r = parseInt(v[0] + v[0], 16) / 255;
    const g = parseInt(v[1] + v[1], 16) / 255;
    const b = parseInt(v[2] + v[2], 16) / 255;
    return { r, g, b };
  }
  if (v.length === 6) {
    return {
      r: parseInt(v.slice(0, 2), 16) / 255,
      g: parseInt(v.slice(2, 4), 16) / 255,
      b: parseInt(v.slice(4, 6), 16) / 255,
    };
  }
  if (v.length === 8) {
    return {
      r: parseInt(v.slice(0, 2), 16) / 255,
      g: parseInt(v.slice(2, 4), 16) / 255,
      b: parseInt(v.slice(4, 6), 16) / 255,
      a: parseInt(v.slice(6, 8), 16) / 255,
    };
  }
  return null;
}

function fontWeightToStyle(weight: string): string {
  const map: Record<string, string> = {
    "100": "Thin", "200": "Extra Light", "300": "Light",
    "400": "Regular", "500": "Medium", "600": "Semi Bold",
    "700": "Bold", "800": "Extra Bold", "900": "Black",
    normal: "Regular", bold: "Bold",
  };
  return map[weight] || weight; // pass through "Italic", "Medium" etc.
}

function parsePxNumeric(v: string | number): number | null {
  if (typeof v === "number") return v;
  const m = String(v).match(/(-?\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

export const handleStyleEcosystemRequest = async (request: any) => {
  switch (request.type) {

    case "create_styles_from_palette": {
      const palette = (request.params?.palette || {}) as Record<string, string>;
      const created: any[] = [];
      const failed: any[] = [];
      for (const name of Object.keys(palette)) {
        const hex = palette[name];
        const rgb = hexToRgb(hex);
        if (!rgb) {
          failed.push({ name, reason: `Invalid hex color: ${hex}` });
          continue;
        }
        try {
          const style = figma.createPaintStyle();
          style.name = name;
          const paint: any = { type: "SOLID", color: { r: rgb.r, g: rgb.g, b: rgb.b } };
          if (rgb.a != null) paint.opacity = rgb.a;
          style.paints = [paint];
          created.push({ name, styleId: style.id, color: hex });
        } catch (e) {
          failed.push({ name, reason: e instanceof Error ? e.message : String(e) });
        }
      }
      figma.commitUndo();
      return {
        type: request.type,
        requestId: request.requestId,
        data: { created, failed },
      };
    }

    case "create_text_scale": {
      const scale = (request.params?.scale || {}) as Record<string, any>;
      const created: any[] = [];
      const failed: any[] = [];
      for (const name of Object.keys(scale)) {
        const def = scale[name];
        try {
          const family = (def.fontFamily || "Inter").replace(/['"]/g, "").split(",")[0].trim();
          const style = def.fontStyle
            ? def.fontStyle
            : (def.fontWeight ? fontWeightToStyle(String(def.fontWeight)) : "Regular");
          await figma.loadFontAsync({ family, style });
          const t = figma.createTextStyle();
          t.name = name;
          t.fontName = { family, style };
          if (def.fontSize) t.fontSize = Number(def.fontSize);
          if (def.lineHeight) {
            const lh = Number(def.lineHeight);
            t.lineHeight = { value: lh, unit: "PIXELS" };
          }
          if (def.letterSpacing) {
            const ls = Number(def.letterSpacing);
            t.letterSpacing = { value: ls, unit: "PIXELS" };
          }
          created.push({ name, styleId: t.id, fontFamily: family, fontStyle: style, fontSize: def.fontSize });
        } catch (e) {
          failed.push({ name, reason: e instanceof Error ? e.message : String(e) });
        }
      }
      figma.commitUndo();
      return {
        type: request.type,
        requestId: request.requestId,
        data: { created, failed },
      };
    }

    case "import_design_tokens": {
      const tokens = request.params?.tokens || {};
      const collectionName = (request.params?.collectionName as string) || "Imported Tokens";
      const expose = request.params?.exposeAsStyles !== false;

      const collection = figma.variables.createVariableCollection(collectionName);
      const modeId = collection.modes[0].modeId;
      const created: { variables: any[]; paintStyles: any[]; textStyles: any[] } = {
        variables: [], paintStyles: [], textStyles: [],
      };
      const failed: any[] = [];

      const visit = (obj: any, prefix: string) => {
        for (const key of Object.keys(obj)) {
          const val = obj[key];
          if (val && typeof val === "object" && "$value" in val) {
            const tokenName = prefix ? `${prefix}/${key}` : key;
            const type = String(val.$type || "").toLowerCase();
            try {
              if (type === "color") {
                const rgb = hexToRgb(String(val.$value));
                if (!rgb) { failed.push({ name: tokenName, reason: `bad color: ${val.$value}` }); continue; }
                const v = figma.variables.createVariable(tokenName, collection, "COLOR");
                v.setValueForMode(modeId, { r: rgb.r, g: rgb.g, b: rgb.b });
                created.variables.push({ name: tokenName, variableId: v.id, type: "COLOR" });
                if (expose) {
                  const ps = figma.createPaintStyle();
                  ps.name = tokenName;
                  ps.paints = [{ type: "SOLID", color: { r: rgb.r, g: rgb.g, b: rgb.b } }];
                  created.paintStyles.push({ name: tokenName, styleId: ps.id });
                }
              } else if (type === "dimension" || type === "spacing" || type === "size") {
                const px = parsePxNumeric(val.$value);
                if (px == null) { failed.push({ name: tokenName, reason: `bad dimension: ${val.$value}` }); continue; }
                const v = figma.variables.createVariable(tokenName, collection, "FLOAT");
                v.setValueForMode(modeId, px);
                created.variables.push({ name: tokenName, variableId: v.id, type: "FLOAT", value: px });
              } else if (type === "border-radius" || type === "radius") {
                const px = parsePxNumeric(val.$value);
                if (px == null) { failed.push({ name: tokenName, reason: `bad radius: ${val.$value}` }); continue; }
                const v = figma.variables.createVariable(tokenName, collection, "FLOAT");
                v.setValueForMode(modeId, px);
                created.variables.push({ name: tokenName, variableId: v.id, type: "FLOAT", value: px });
              } else {
                // unsupported type — skip silently
              }
            } catch (e) {
              failed.push({ name: tokenName, reason: e instanceof Error ? e.message : String(e) });
            }
          } else if (val && typeof val === "object") {
            visit(val, prefix ? `${prefix}/${key}` : key);
          }
        }
      };
      visit(tokens, "");

      figma.commitUndo();
      return {
        type: request.type,
        requestId: request.requestId,
        data: {
          collectionId: collection.id,
          collectionName: collection.name,
          created,
          failed,
        },
      };
    }

    case "bind_variable_to_style": {
      const styleId = request.params?.styleId as string;
      const variableId = request.params?.variableId as string;
      const style = await figma.getStyleByIdAsync(styleId);
      if (!style || style.type !== "PAINT") throw new Error(`Not a paint style: ${styleId}`);
      const variable = await figma.variables.getVariableByIdAsync(variableId);
      if (!variable) throw new Error(`Variable not found: ${variableId}`);
      const ps = style as any;
      const paints = JSON.parse(JSON.stringify(ps.paints));
      if (!Array.isArray(paints) || paints.length === 0 || paints[0].type !== "SOLID") {
        throw new Error("Style has no SOLID paint to bind");
      }
      paints[0] = figma.variables.setBoundVariableForPaint(paints[0], "color", variable);
      ps.paints = paints;
      figma.commitUndo();
      return {
        type: request.type,
        requestId: request.requestId,
        data: { styleId, variableId, ok: true },
      };
    }

    default:
      return null;
  }
};

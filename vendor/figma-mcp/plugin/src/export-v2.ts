/**
 * export-v2.ts — Category F: asset & export.
 *
 *   export_node_as_react
 *   export_html_self_contained
 *   replace_image_globally
 */

import { recordError } from "./diagnostics";

function paintToHex(p: any): string {
  const c = p.color || { r: 0, g: 0, b: 0 };
  const h = (n: number) => Math.round(n * 255).toString(16).padStart(2, "0");
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`.toUpperCase();
}

function bytesToBase64(bytes: Uint8Array): string {
  // Plugin sandbox lacks btoa for Uint8Array directly; do it manually.
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  let i = 0;
  while (i < bytes.length) {
    const b1 = bytes[i++] || 0;
    const b2 = bytes[i++] || 0;
    const b3 = bytes[i++] || 0;
    out += chars[b1 >> 2];
    out += chars[((b1 & 0x03) << 4) | (b2 >> 4)];
    out += i - 1 > bytes.length ? "=" : chars[((b2 & 0x0f) << 2) | (b3 >> 6)];
    out += i > bytes.length ? "=" : chars[b3 & 0x3f];
  }
  return out;
}

// ── React generator ──────────────────────────────────────────────────────────

function tailwindFromBox(node: any): string[] {
  const out: string[] = [];
  if ("width" in node) out.push(`w-[${Math.round(node.width)}px]`);
  if ("height" in node) out.push(`h-[${Math.round(node.height)}px]`);
  if ("layoutMode" in node && node.layoutMode !== "NONE") {
    out.push("flex");
    out.push(node.layoutMode === "VERTICAL" ? "flex-col" : "flex-row");
    if (node.itemSpacing) out.push(`gap-[${node.itemSpacing}px]`);
    if (node.paddingTop || node.paddingRight || node.paddingBottom || node.paddingLeft) {
      out.push(`p-[${node.paddingTop || 0}px_${node.paddingRight || 0}px_${node.paddingBottom || 0}px_${node.paddingLeft || 0}px]`);
    }
  }
  const fills = node.fills;
  if (Array.isArray(fills) && fills.length > 0 && fills[0].type === "SOLID") {
    const hex = paintToHex(fills[0]).slice(1);
    out.push(`bg-[#${hex}]`);
  }
  if ("cornerRadius" in node && typeof node.cornerRadius === "number" && node.cornerRadius > 0) {
    out.push(`rounded-[${node.cornerRadius}px]`);
  }
  if (node.opacity != null && node.opacity < 1) out.push(`opacity-[${node.opacity}]`);
  return out;
}

function tailwindFromText(node: any): string[] {
  const out: string[] = [];
  const family = typeof node.fontName === "symbol" ? "Inter" : node.fontName.family;
  out.push(`font-['${family.replace(/\s/g, "_")}']`);
  if (typeof node.fontSize === "number") out.push(`text-[${node.fontSize}px]`);
  const fills = node.fills;
  if (Array.isArray(fills) && fills.length > 0 && fills[0].type === "SOLID") {
    const hex = paintToHex(fills[0]).slice(1);
    out.push(`text-[#${hex}]`);
  }
  const alignMap: Record<string, string> = { LEFT: "text-left", CENTER: "text-center", RIGHT: "text-right", JUSTIFIED: "text-justify" };
  if (alignMap[node.textAlignHorizontal]) out.push(alignMap[node.textAlignHorizontal]);
  if (typeof node.lineHeight !== "symbol" && node.lineHeight?.unit === "PIXELS") {
    out.push(`leading-[${node.lineHeight.value}px]`);
  }
  return out;
}

function nodeToTSX(node: any, indent: number, fonts: Set<string>, images: Set<string>): string {
  const pad = "  ".repeat(indent);
  if (node.type === "TEXT") {
    const family = typeof node.fontName === "symbol" ? "Inter" : node.fontName.family;
    fonts.add(family);
    const cls = tailwindFromText(node).join(" ");
    const safe = String(node.characters || "").replace(/\{/g, "&#123;").replace(/\}/g, "&#125;");
    return `${pad}<p className="${cls}">${safe}</p>`;
  }
  if (node.type === "RECTANGLE" && Array.isArray(node.fills) && node.fills[0]?.type === "IMAGE") {
    images.add(node.fills[0].imageHash);
    const cls = tailwindFromBox(node).join(" ");
    return `${pad}<img className="${cls}" src={imageMap["${node.fills[0].imageHash}"] /* TODO: replace */} alt="" />`;
  }
  if (node.type === "RECTANGLE" || node.type === "ELLIPSE") {
    const cls = tailwindFromBox(node).join(" ") + (node.type === "ELLIPSE" ? " rounded-full" : "");
    return `${pad}<div className="${cls}" />`;
  }
  if ("children" in node) {
    const cls = tailwindFromBox(node).join(" ");
    const inner = node.children.map((c: any) => nodeToTSX(c, indent + 1, fonts, images)).join("\n");
    return `${pad}<div className="${cls}">\n${inner}\n${pad}</div>`;
  }
  return "";
}

// ── Self-contained HTML exporter ─────────────────────────────────────────────

async function nodeToSelfContainedHTML(
  node: any,
  depth: number,
  maxDepth: number,
  includeImages: boolean
): Promise<string> {
  if (depth > maxDepth) return "";

  if (node.type === "TEXT") {
    const styles: string[] = [];
    const family = typeof node.fontName === "symbol" ? "Inter" : node.fontName.family;
    const fweight = typeof node.fontName === "symbol" ? "Regular" : node.fontName.style;
    styles.push(`font-family:'${family}'`);
    styles.push(`font-weight:${fweight === "Bold" ? 700 : fweight === "Medium" ? 500 : 400}`);
    if (typeof node.fontSize === "number") styles.push(`font-size:${node.fontSize}px`);
    const fills = node.fills;
    if (Array.isArray(fills) && fills[0]?.type === "SOLID") styles.push(`color:${paintToHex(fills[0])}`);
    if (typeof node.lineHeight !== "symbol" && node.lineHeight?.unit === "PIXELS") {
      styles.push(`line-height:${node.lineHeight.value}px`);
    }
    const escaped = String(node.characters || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
    return `<p style="${styles.join(";")}">${escaped}</p>`;
  }

  const styles: string[] = [];
  styles.push(`width:${Math.round(node.width)}px`);
  styles.push(`height:${Math.round(node.height)}px`);
  const fills = node.fills;
  if (Array.isArray(fills) && fills.length > 0) {
    if (fills[0].type === "SOLID") styles.push(`background:${paintToHex(fills[0])}`);
    else if (fills[0].type === "IMAGE" && includeImages) {
      try {
        const image = figma.getImageByHash(fills[0].imageHash);
        if (image) {
          const bytes = await image.getBytesAsync();
          const b64 = bytesToBase64(bytes);
          styles.push(`background:url(data:image/png;base64,${b64}) center/cover`);
        }
      } catch (e) {
        recordError("export_html_self_contained", `image embed failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  if ("cornerRadius" in node && typeof node.cornerRadius === "number" && node.cornerRadius > 0) {
    styles.push(`border-radius:${node.cornerRadius}px`);
  }
  if ("layoutMode" in node && node.layoutMode !== "NONE") {
    styles.push("display:flex");
    styles.push(`flex-direction:${node.layoutMode === "VERTICAL" ? "column" : "row"}`);
    if (node.itemSpacing) styles.push(`gap:${node.itemSpacing}px`);
    if (node.paddingTop || node.paddingBottom || node.paddingLeft || node.paddingRight) {
      styles.push(`padding:${node.paddingTop || 0}px ${node.paddingRight || 0}px ${node.paddingBottom || 0}px ${node.paddingLeft || 0}px`);
    }
  } else {
    styles.push("position:relative");
  }

  let inner = "";
  if ("children" in node) {
    for (const c of node.children) {
      let childHtml = await nodeToSelfContainedHTML(c, depth + 1, maxDepth, includeImages);
      if (node.layoutMode === "NONE" || !("layoutMode" in node)) {
        // Wrap absolute children
        childHtml = `<div style="position:absolute;left:${Math.round(c.x)}px;top:${Math.round(c.y)}px">${childHtml}</div>`;
      }
      inner += childHtml;
    }
  }

  return `<div style="${styles.join(";")}">${inner}</div>`;
}

export const handleExportV2Request = async (request: any) => {
  switch (request.type) {

    case "export_node_as_react": {
      const nodeId = request.nodeIds && request.nodeIds[0];
      if (!nodeId) throw new Error("nodeId is required");
      const node = await figma.getNodeByIdAsync(nodeId);
      if (!node) throw new Error(`Node not found: ${nodeId}`);
      const componentName = (request.params?.componentName as string) || "FigmaNode";
      const includeImports = !!request.params?.includeImports;

      const fonts = new Set<string>();
      const images = new Set<string>();
      const inner = nodeToTSX(node, 1, fonts, images);

      const importBlock = includeImports ? "import React from 'react';\n\n" : "";
      const imageMapBlock = images.size > 0
        ? `\nconst imageMap: Record<string, string> = {\n${Array.from(images).map(h => `  "${h}": "/* TODO: image src for ${h} */",`).join("\n")}\n};\n`
        : "";
      const tsx = `${importBlock}${imageMapBlock}\nexport default function ${componentName}() {\n  return (\n${inner}\n  );\n}\n`;
      return {
        type: request.type,
        requestId: request.requestId,
        data: {
          tsx,
          fontsUsed: Array.from(fonts),
          imagesUsed: Array.from(images),
        },
      };
    }

    case "export_html_self_contained": {
      const nodeId = request.nodeIds && request.nodeIds[0];
      if (!nodeId) throw new Error("nodeId is required");
      const node = await figma.getNodeByIdAsync(nodeId) as any;
      if (!node) throw new Error(`Node not found: ${nodeId}`);
      const depth = (request.params?.depth as number) || 12;
      const includeImages = request.params?.includeImages !== false;
      const body = await nodeToSelfContainedHTML(node, 0, depth, includeImages);
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${(node.name || "export").replace(/</g, "&lt;")}</title></head><body style="margin:0;padding:24px;background:#f5f5f5">${body}</body></html>`;
      return {
        type: request.type,
        requestId: request.requestId,
        data: { html, nodeId, name: node.name },
      };
    }

    case "replace_image_globally": {
      const oldHash = request.params?.oldImageHash as string;
      let newHash = request.params?.newImageHash as string;
      const newB64 = request.params?.newImageBase64 as string;
      if (!oldHash) throw new Error("oldImageHash is required");
      if (!newHash) {
        // Decode base64 and import
        if (!newB64) throw new Error("newImageBase64 or newImageHash is required");
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        const lookup: Record<string, number> = {};
        for (let i = 0; i < chars.length; i++) lookup[chars[i]] = i;
        const clean = newB64.replace(/[^A-Za-z0-9+/=]/g, "").replace(/=/g, "");
        const outLen = Math.floor(clean.length * 3 / 4);
        const bytes = new Uint8Array(outLen);
        let j = 0;
        for (let i = 0; i < clean.length; i += 4) {
          const a = lookup[clean[i]] || 0, b = lookup[clean[i + 1]] || 0, c = lookup[clean[i + 2]] || 0, d = lookup[clean[i + 3]] || 0;
          bytes[j++] = (a << 2) | (b >> 4);
          if (j < outLen) bytes[j++] = ((b & 15) << 4) | (c >> 2);
          if (j < outLen) bytes[j++] = ((c & 3) << 6) | d;
        }
        const img = figma.createImage(bytes);
        newHash = img.hash;
      }

      const affected: any[] = [];
      const walk = (n: any) => {
        if ("fills" in n && Array.isArray(n.fills)) {
          let touched = false;
          const newFills = n.fills.map((f: any) => {
            if (f.type === "IMAGE" && f.imageHash === oldHash) {
              touched = true;
              return { ...f, imageHash: newHash };
            }
            return f;
          });
          if (touched) {
            n.fills = newFills;
            affected.push({ id: n.id, name: n.name });
          }
        }
        if ("children" in n) {
          for (const c of n.children) walk(c);
        }
      };
      for (const page of figma.root.children) {
        await page.loadAsync();
        walk(page);
      }
      figma.commitUndo();
      return {
        type: request.type,
        requestId: request.requestId,
        data: { affectedNodes: affected, total: affected.length, oldImageHash: oldHash, newImageHash: newHash },
      };
    }

    default:
      return null;
  }
};

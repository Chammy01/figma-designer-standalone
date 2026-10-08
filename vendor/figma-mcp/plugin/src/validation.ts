/**
 * validation.ts — Category B: Validation & Preview tools.
 *
 * Implements:
 *   validate_html       — dry-run HTML parse, returns tree + warnings
 *   diff_node_vs_html   — compare existing node to intended HTML
 *   explain_layout      — narrate why a node is sized/positioned as it is
 */

// ── Lightweight HTML parser (mirrors write-html.ts but without Figma side-effects) ─

interface ParsedNode {
  tag: string;
  attrs: Record<string, string>;
  styles: Record<string, string>;
  classes: string[];
  children: ParsedNode[];
  text: string;
}

function parseHTML(html: string): ParsedNode[] {
  const nodes: ParsedNode[] = [];
  let pos = 0;

  const skipWs = () => { while (pos < html.length && /\s/.test(html[pos])) pos++; };
  const parseStr = (q: string): string => {
    let r = ""; pos++;
    while (pos < html.length && html[pos] !== q) {
      if (html[pos] === "\\") { pos++; if (pos < html.length) r += html[pos]; }
      else r += html[pos];
      pos++;
    }
    pos++; return r;
  };
  const parseAttrs = (): Record<string, string> => {
    const a: Record<string, string> = {};
    while (pos < html.length && html[pos] !== ">" && html[pos] !== "/") {
      skipWs();
      if (html[pos] === ">" || html[pos] === "/") break;
      let n = "";
      while (pos < html.length && html[pos] !== "=" && html[pos] !== ">" && html[pos] !== "/" && !/\s/.test(html[pos])) n += html[pos++];
      if (!n) break;
      skipWs();
      if (html[pos] === "=") {
        pos++; skipWs();
        if (html[pos] === '"' || html[pos] === "'") a[n] = parseStr(html[pos]);
        else { let v = ""; while (pos < html.length && !/[\s>]/.test(html[pos])) v += html[pos++]; a[n] = v; }
      } else a[n] = "true";
    }
    return a;
  };
  const parseCSS = (s: string): Record<string, string> => {
    const out: Record<string, string> = {};
    if (!s) return out;
    const parts: string[] = [];
    let cur = "", depth = 0;
    for (const ch of s) {
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      else if (ch === ";" && depth === 0) { parts.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    if (cur.trim()) parts.push(cur.trim());
    for (const p of parts) {
      const i = p.indexOf(":"); if (i === -1) continue;
      const k = p.slice(0, i).trim(), v = p.slice(i + 1).trim();
      out[k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
    }
    return out;
  };
  const parseNode = (): ParsedNode | null => {
    skipWs();
    if (pos >= html.length) return null;
    if (html[pos] !== "<") {
      let t = "";
      while (pos < html.length && html[pos] !== "<") t += html[pos++];
      t = t.trim(); if (!t) return null;
      return { tag: "#text", attrs: {}, styles: {}, classes: [], children: [], text: t };
    }
    if (html.slice(pos, pos + 4) === "<!--") {
      const e = html.indexOf("-->", pos + 4);
      pos = e === -1 ? html.length : e + 3;
      return null;
    }
    if (html[pos + 1] === "/") return null;
    pos++;
    let tag = "";
    while (pos < html.length && !/[\s>\/]/.test(html[pos])) tag += html[pos++];
    tag = tag.toLowerCase();
    const attrs = parseAttrs();
    const styles = parseCSS(attrs["style"] || "");
    const classes = (attrs["class"] || "").split(/\s+/).filter(Boolean);
    const selfClosing = ["img", "br", "hr", "input", "meta", "link"];
    skipWs();
    if (html[pos] === "/") { pos++; skipWs(); }
    if (html[pos] === ">") pos++;
    const node: ParsedNode = { tag, attrs, styles, classes, children: [], text: "" };
    if (selfClosing.includes(tag)) return node;
    while (pos < html.length) {
      skipWs();
      if (html[pos] === "<" && html[pos + 1] === "/") {
        const e = html.indexOf(">", pos);
        pos = e === -1 ? html.length : e + 1;
        break;
      }
      const child = parseNode();
      if (child === null) {
        if (html[pos] === "<" && html[pos + 1] === "/") {
          const e = html.indexOf(">", pos);
          pos = e === -1 ? html.length : e + 1;
          break;
        }
        continue;
      }
      node.children.push(child);
    }
    return node;
  };
  while (pos < html.length) {
    skipWs(); if (pos >= html.length) break;
    const n = parseNode(); if (n) nodes.push(n);
  }
  return nodes;
}

// ── Validation pass ──────────────────────────────────────────────────────────

interface Warning {
  path: string;
  level: "info" | "warn" | "error";
  message: string;
}

interface FontRequirement {
  family: string;
  style: string;
  count: number;
}

const KNOWN_CSS = new Set([
  "width", "height", "padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "margin", "marginTop", "marginRight", "marginBottom", "marginLeft", // margin not supported, will warn
  "color", "background", "backgroundColor", "borderRadius", "border", "borderColor", "borderWidth",
  "fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight", "letterSpacing",
  "textAlign", "textDecoration", "opacity",
  "display", "flexDirection", "justifyContent", "alignItems", "gap", "flexWrap", "flex", "flexGrow",
  "position", "left", "top", "right", "bottom",
  "overflow", "x", "y",
]);

const UNSUPPORTED_CSS = new Set([
  "margin", "marginTop", "marginRight", "marginBottom", "marginLeft",
  "boxShadow", "transform", "filter", "backdropFilter",
  "gridTemplateColumns", "gridTemplateRows", "gridGap",
  "float", "clear", "zIndex",
]);

function fontWeightToStyle(weight: string): string {
  const map: Record<string, string> = {
    "100": "Thin", "200": "Extra Light", "300": "Light",
    "400": "Regular", "500": "Medium", "600": "Semi Bold",
    "700": "Bold", "800": "Extra Bold", "900": "Black",
    normal: "Regular", bold: "Bold",
  };
  return map[weight] || "Regular";
}

function walkValidate(
  parsed: ParsedNode,
  path: string,
  warnings: Warning[],
  fonts: Map<string, FontRequirement>,
  styleIds: Set<string>,
  classNames: Set<string>
): any {
  if (parsed.tag === "#text") return { tag: "#text", text: parsed.text };

  // Font collection (text-ish elements)
  const textTags = ["p", "span", "h1", "h2", "h3", "h4", "h5", "h6", "pre", "code", "label", "a"];
  if (textTags.includes(parsed.tag)) {
    const family = parsed.styles.fontFamily?.replace(/['"]/g, "").split(",")[0].trim() || "Inter";
    const style = parsed.styles.fontWeight
      ? fontWeightToStyle(parsed.styles.fontWeight)
      : (parsed.styles.fontStyle === "italic" ? "Italic" : "Regular");
    const key = `${family}|${style}`;
    const existing = fonts.get(key);
    if (existing) existing.count++;
    else fonts.set(key, { family, style, count: 1 });
  }

  // CSS warnings
  for (const k of Object.keys(parsed.styles)) {
    if (UNSUPPORTED_CSS.has(k)) {
      warnings.push({ path, level: "warn", message: `CSS '${k}' is not supported and will be ignored` });
    } else if (!KNOWN_CSS.has(k) && !k.startsWith("-")) {
      warnings.push({ path, level: "info", message: `CSS '${k}' is unknown — may be silently ignored` });
    }
  }

  // Style ID collection
  for (const c of parsed.classes) classNames.add(c);
  for (const a of ["data-style-id", "data-text-style-id", "data-paint-style-id", "data-component-id"]) {
    const v = parsed.attrs[a];
    if (v) styleIds.add(v);
  }

  // Sanity checks
  if (parsed.tag === "div" && parsed.styles.display === "flex") {
    const hasAbsKid = parsed.children.some(c => c.styles && c.styles.position === "absolute");
    if (hasAbsKid) {
      warnings.push({
        path,
        level: "info",
        message: "display:flex on this div will be ignored because it has children with position:absolute (B-5 fix)",
      });
    }
  }
  if (parsed.styles.right && !parsed.styles.left) {
    if (parsed.styles.position !== "absolute") {
      // CAVEAT 2 fix (v1.3.1): right/bottom only apply when position:absolute is set.
      // Without that, right CSS is silently ignored.
      warnings.push({
        path,
        level: "warn",
        message: "right is set but position is not absolute — write_html will silently ignore it. Add position:absolute.",
      });
    } else {
      warnings.push({
        path,
        level: "info",
        message: "right CSS will compute left from parent width — make sure the parent has a known size",
      });
    }
  }
  if (parsed.styles.bottom && !parsed.styles.top) {
    if (parsed.styles.position !== "absolute") {
      warnings.push({
        path,
        level: "warn",
        message: "bottom is set but position is not absolute — write_html will silently ignore it. Add position:absolute.",
      });
    }
  }
  if (parsed.styles.width && parsed.styles.width.endsWith("%") && parsed.styles.width !== "100%") {
    warnings.push({
      path,
      level: "warn",
      message: `partial percentage width '${parsed.styles.width}' is not supported — only 100% maps to FILL, others fall back to HUG`,
    });
  }
  // Flag `display:flex` mixing with absolute children — surfaces the B-5 behavior up-front
  if (parsed.styles.display === "flex") {
    const hasAbsKid = parsed.children.some(c => c.styles && c.styles.position === "absolute");
    if (hasAbsKid) {
      warnings.push({
        path,
        level: "info",
        message: "display:flex on this div will be silently ignored because children use position:absolute",
      });
    }
  }
  // Flag div with no width AND no height AND no children — likely a bug
  if (parsed.tag === "div" && !parsed.styles.width && !parsed.styles.height && parsed.children.length === 0) {
    warnings.push({
      path,
      level: "info",
      message: "empty div with no width/height — will fall back to 100×100 placeholder",
    });
  }

  const childResults = parsed.children.map((c, i) =>
    walkValidate(c, `${path}/${parsed.tag}[${i}]`, warnings, fonts, styleIds, classNames)
  );

  return {
    tag: parsed.tag,
    classes: parsed.classes,
    layerName: parsed.attrs["layer-name"] || parsed.attrs["data-name"],
    width: parsed.styles.width,
    height: parsed.styles.height,
    children: childResults.length > 0 ? childResults : undefined,
    text: parsed.tag === "#text" ? parsed.text : undefined,
  };
}

// ── Diff pass for diff_node_vs_html ──────────────────────────────────────────

function nodeToProps(node: any): Record<string, any> {
  const p: Record<string, any> = {};
  if ("name" in node) p.name = node.name;
  if (node.type === "TEXT") {
    p.text = node.characters;
    if (typeof node.fontSize === "number") p.fontSize = node.fontSize;
    const fills = node.fills;
    if (Array.isArray(fills) && fills[0]?.type === "SOLID") {
      p.fillColor = paintToHex(fills[0]);
    }
  } else if ("fills" in node) {
    const fills = node.fills;
    if (Array.isArray(fills) && fills[0]?.type === "SOLID") {
      p.fillColor = paintToHex(fills[0]);
    }
  }
  if ("width" in node) p.width = Math.round(node.width);
  if ("height" in node) p.height = Math.round(node.height);
  if ("cornerRadius" in node && typeof node.cornerRadius === "number") p.cornerRadius = node.cornerRadius;
  return p;
}

function paintToHex(p: any): string {
  const c = p.color || { r: 0, g: 0, b: 0 };
  const h = (n: number) => Math.round(n * 255).toString(16).padStart(2, "0");
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`.toUpperCase();
}

function htmlNodeToProps(parsed: ParsedNode): Record<string, any> {
  const p: Record<string, any> = {};
  if (parsed.attrs["layer-name"]) p.name = parsed.attrs["layer-name"];
  if (parsed.tag === "#text") { p.text = parsed.text; return p; }
  const textTags = ["p", "span", "h1", "h2", "h3", "h4", "h5", "h6"];
  if (textTags.includes(parsed.tag)) {
    const collected = parsed.children.filter(c => c.tag === "#text").map(c => c.text).join("");
    if (collected) p.text = collected;
  }
  const styles = parsed.styles;
  if (styles.fontSize) {
    const m = styles.fontSize.match(/(\d+(?:\.\d+)?)/);
    if (m) p.fontSize = parseFloat(m[1]);
  }
  if (styles.color && styles.color.startsWith("#")) p.fillColor = styles.color.toUpperCase();
  if (styles.backgroundColor && styles.backgroundColor.startsWith("#")) p.fillColor = styles.backgroundColor.toUpperCase();
  if (styles.width) {
    const m = styles.width.match(/(\d+(?:\.\d+)?)/);
    if (m) p.width = parseFloat(m[1]);
  }
  if (styles.height) {
    const m = styles.height.match(/(\d+(?:\.\d+)?)/);
    if (m) p.height = parseFloat(m[1]);
  }
  if (styles.borderRadius) {
    const m = styles.borderRadius.match(/(\d+(?:\.\d+)?)/);
    if (m) p.cornerRadius = parseFloat(m[1]);
  }
  return p;
}

function diffWalk(figmaNode: any, parsed: ParsedNode, diffs: any[], patches: any[]) {
  const cur = nodeToProps(figmaNode);
  const tgt = htmlNodeToProps(parsed);
  const changed: Record<string, any> = {};
  for (const k of Object.keys(tgt)) {
    if (cur[k] !== tgt[k]) {
      diffs.push({ nodeId: figmaNode.id, field: k, current: cur[k], target: tgt[k] });
      changed[k] = tgt[k];
    }
  }
  if (Object.keys(changed).length > 0) {
    patches.push({ nodeId: figmaNode.id, props: changed });
  }
  // Recurse children pairwise — naive matching by index, but good enough for first-pass diffs.
  if ("children" in figmaNode || parsed.children.some(c => c.tag !== "#text")) {
    const figChildren = ((figmaNode.children ?? []) as any[]).filter(c => c.type !== "VECTOR" && c.type !== "GROUP");
    const htmlChildren = parsed.children.filter(c => c.tag !== "#text");
    const len = Math.min(figChildren.length, htmlChildren.length);
    for (let i = 0; i < len; i++) {
      diffWalk(figChildren[i], htmlChildren[i], diffs, patches);
    }
    for (let i = len; i < Math.max(figChildren.length, htmlChildren.length); i++) {
      diffs.push({ nodeId: figmaNode.id, field: "children", index: i,
        kind: i < figChildren.length ? "extra" : "missing",
        current: figChildren[i]?.id ?? null, target: htmlChildren[i]?.tag ?? null });
    }
  }
}

// ── Explain layout ───────────────────────────────────────────────────────────

function explainLayoutOf(node: any): { explanation: string; factors: any[] } {
  const factors: any[] = [];
  const lines: string[] = [];

  if ("layoutMode" in node && node.layoutMode !== "NONE") {
    lines.push(`This frame uses auto-layout (${node.layoutMode}). Children flow ${node.layoutMode === "VERTICAL" ? "top to bottom" : "left to right"}.`);
    factors.push({ name: "layoutMode", value: node.layoutMode, source: "self" });
    if (node.itemSpacing) {
      lines.push(`Item spacing is ${node.itemSpacing}px.`);
      factors.push({ name: "itemSpacing", value: node.itemSpacing, source: "self" });
    }
    if (node.paddingTop || node.paddingBottom || node.paddingLeft || node.paddingRight) {
      lines.push(`Padding: top ${node.paddingTop}, right ${node.paddingRight}, bottom ${node.paddingBottom}, left ${node.paddingLeft}.`);
      factors.push({ name: "padding", value: { top: node.paddingTop, right: node.paddingRight, bottom: node.paddingBottom, left: node.paddingLeft }, source: "self" });
    }
  } else {
    lines.push(`This node is positioned absolutely at (${node.x}, ${node.y}).`);
    factors.push({ name: "position", value: { x: node.x, y: node.y }, source: "self" });
  }

  if ("layoutSizingHorizontal" in node && node.layoutSizingHorizontal) {
    lines.push(`Horizontal sizing: ${node.layoutSizingHorizontal}.`);
    factors.push({ name: "layoutSizingHorizontal", value: node.layoutSizingHorizontal, source: "self" });
  }
  if ("layoutSizingVertical" in node && node.layoutSizingVertical) {
    lines.push(`Vertical sizing: ${node.layoutSizingVertical}.`);
    factors.push({ name: "layoutSizingVertical", value: node.layoutSizingVertical, source: "self" });
  }

  if ("width" in node && "height" in node) {
    lines.push(`Current size: ${Math.round(node.width)} × ${Math.round(node.height)}.`);
    factors.push({ name: "size", value: `${Math.round(node.width)}x${Math.round(node.height)}`, source: "computed" });
  }

  // Parent context
  const parent = node.parent;
  if (parent && "layoutMode" in parent && parent.layoutMode !== "NONE") {
    lines.push(`Parent is auto-layout (${parent.layoutMode}); this node's position is determined by flow, not absolute coordinates.`);
    factors.push({ name: "parentLayoutMode", value: parent.layoutMode, source: "parent" });
  }

  if ("constraints" in node && node.constraints) {
    lines.push(`Constraints: horizontal=${node.constraints.horizontal}, vertical=${node.constraints.vertical}.`);
    factors.push({ name: "constraints", value: node.constraints, source: "self" });
  }

  return { explanation: lines.join(" "), factors };
}

// ── Request handler ──────────────────────────────────────────────────────────

export const handleValidationRequest = async (request: any) => {
  switch (request.type) {
    case "validate_html": {
      const html = request.params?.html as string;
      if (!html) throw new Error("html is required");
      const warnings: Warning[] = [];
      const fonts = new Map<string, FontRequirement>();
      const styleIds = new Set<string>();
      const classNames = new Set<string>();
      const parsed = parseHTML(html);
      const tree = parsed.map((p, i) =>
        walkValidate(p, `[${i}]`, warnings, fonts, styleIds, classNames)
      );
      // Cross-check style mapping references existing styles
      let styleMappingRefs: string[] = [];
      const sm = request.params?.styleMapping;
      if (sm) {
        try {
          const obj = typeof sm === "string" ? JSON.parse(sm) : sm;
          for (const k of Object.keys(obj)) {
            if (!classNames.has(k)) {
              warnings.push({
                path: "styleMapping",
                level: "info",
                message: `class '${k}' is in styleMapping but never used in HTML`,
              });
            }
            const m = obj[k];
            if (m.textStyleId) styleMappingRefs.push(m.textStyleId);
            if (m.paintStyleId) styleMappingRefs.push(m.paintStyleId);
          }
        } catch (_) { /* ignore */ }
      }
      return {
        type: request.type,
        requestId: request.requestId,
        data: {
          tree,
          warnings,
          fontsNeeded: Array.from(fonts.values()),
          stylesReferenced: Array.from(styleIds),
          classNamesUsed: Array.from(classNames),
          styleMappingReferences: styleMappingRefs,
          summary: {
            errors: warnings.filter(w => w.level === "error").length,
            warnings: warnings.filter(w => w.level === "warn").length,
            info: warnings.filter(w => w.level === "info").length,
          },
        },
      };
    }

    case "diff_node_vs_html": {
      const nodeId = request.nodeIds && request.nodeIds[0];
      if (!nodeId) throw new Error("nodeId is required");
      const node = await figma.getNodeByIdAsync(nodeId);
      if (!node) throw new Error(`Node not found: ${nodeId}`);
      const html = request.params?.targetHtml as string;
      if (!html) throw new Error("targetHtml is required");
      const parsed = parseHTML(html);
      const diffs: any[] = [];
      const patches: any[] = [];
      if (parsed.length > 0) {
        diffWalk(node as any, parsed[0], diffs, patches);
      }
      return {
        type: request.type,
        requestId: request.requestId,
        data: {
          rootNodeId: nodeId,
          diffs,
          patch: patches,
          summary: { changedFields: diffs.length, changedNodes: patches.length },
        },
      };
    }

    case "explain_layout": {
      const nodeId = request.nodeIds && request.nodeIds[0];
      if (!nodeId) throw new Error("nodeId is required");
      const node = await figma.getNodeByIdAsync(nodeId);
      if (!node) throw new Error(`Node not found: ${nodeId}`);
      const result = explainLayoutOf(node);
      return {
        type: request.type,
        requestId: request.requestId,
        data: {
          nodeId,
          name: (node as any).name,
          type: (node as any).type,
          ...result,
        },
      };
    }

    default:
      return null;
  }
};

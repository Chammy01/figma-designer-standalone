/**
 * write-html.ts — HTML-to-Figma conversion engine.
 *
 * Parses an HTML string with inline CSS and creates the equivalent Figma node tree.
 * Supports write_html, write_html_batch, and get_html commands.
 *
 * CSS -> Figma mapping:
 *   display:flex       -> Auto Layout
 *   flexDirection      -> layoutMode (HORIZONTAL | VERTICAL)
 *   gap                -> itemSpacing
 *   padding*           -> paddingTop/Right/Bottom/Left
 *   backgroundColor    -> fills (solid paint)
 *   color              -> text fills
 *   fontFamily         -> fontName.family
 *   fontSize           -> fontSize (px)
 *   fontWeight         -> fontName.style lookup
 *   borderRadius       -> cornerRadius
 *   width/height       -> resize
 *   opacity            -> opacity
 *   border             -> strokes + strokeWeight
 *   textAlign          -> textAlignHorizontal
 *   position:absolute  -> absolute positioning within parent
 */

import { getBounds } from "./serializers";
import { makeSolidPaint, getParentNode, applyAutoLayout } from "./write-helpers";

// Request deduplication — tracks completed requestIds to prevent duplicate nodes on retry
const completedRequests = new Map<string, any>();

// ── Types ───────────────────────────────────────────────────────────────────

interface ParsedNode {
  tag: string;
  attrs: Record<string, string>;
  styles: Record<string, string>;
  classes: string[];
  children: ParsedNode[];
  text: string;
}

// B-8: variable binding entries — {field, variableId} pairs.
// `field` is the Figma node field name. Special values "fillColor" and
// "strokeColor" wrap a SOLID paint with a bound variable; all other values
// (opacity, width, height, cornerRadius, paddingTop, paddingRight,
// paddingBottom, paddingLeft, itemSpacing, etc.) call setBoundVariable
// directly on the node.
interface VariableBinding {
  field: string;
  variableId: string;
}

interface StyleMapping {
  [className: string]: {
    textStyleId?: string;
    paintStyleId?: string;
    variables?: VariableBinding[];
  };
}

interface BoundStyles {
  text?: string;
  fill?: string;
  variables?: { field: string; variableId: string }[];
}

interface CreatedNode {
  id: string;
  name: string;
  type: string;
  bounds: any;
  children?: CreatedNode[];
  boundStyles?: BoundStyles;
}

// ── HTML Parser ─────────────────────────────────────────────────────────────
// A lightweight HTML parser that handles inline styles, attributes, and nesting.
// We avoid external dependencies since this runs inside the Figma plugin sandbox.

function parseHTML(html: string): ParsedNode[] {
  const nodes: ParsedNode[] = [];
  let pos = 0;

  function skipWhitespace() {
    while (pos < html.length && /\s/.test(html[pos])) pos++;
  }

  function parseString(quote: string): string {
    let result = "";
    pos++; // skip opening quote
    while (pos < html.length && html[pos] !== quote) {
      if (html[pos] === "\\") {
        pos++;
        if (pos < html.length) result += html[pos];
      } else {
        result += html[pos];
      }
      pos++;
    }
    pos++; // skip closing quote
    return result;
  }

  function parseAttributes(): Record<string, string> {
    const attrs: Record<string, string> = {};
    while (pos < html.length && html[pos] !== ">" && html[pos] !== "/") {
      skipWhitespace();
      if (html[pos] === ">" || html[pos] === "/") break;

      // Parse attribute name
      let name = "";
      while (pos < html.length && html[pos] !== "=" && html[pos] !== ">" && html[pos] !== "/" && !/\s/.test(html[pos])) {
        name += html[pos++];
      }
      if (!name) break;

      skipWhitespace();
      if (html[pos] === "=") {
        pos++; // skip =
        skipWhitespace();
        if (html[pos] === '"' || html[pos] === "'") {
          attrs[name] = parseString(html[pos]);
        } else {
          // Unquoted attribute value
          let val = "";
          while (pos < html.length && !/[\s>]/.test(html[pos])) {
            val += html[pos++];
          }
          attrs[name] = val;
        }
      } else {
        attrs[name] = "true"; // Boolean attribute
      }
    }
    return attrs;
  }

  function parseCSS(styleStr: string): Record<string, string> {
    const styles: Record<string, string> = {};
    if (!styleStr) return styles;

    // Split on semicolons but respect parentheses (for rgb(), etc.)
    const parts: string[] = [];
    let current = "";
    let parenDepth = 0;
    for (const ch of styleStr) {
      if (ch === "(") parenDepth++;
      else if (ch === ")") parenDepth--;
      else if (ch === ";" && parenDepth === 0) {
        parts.push(current.trim());
        current = "";
        continue;
      }
      current += ch;
    }
    if (current.trim()) parts.push(current.trim());

    for (const part of parts) {
      const colonIdx = part.indexOf(":");
      if (colonIdx === -1) continue;
      const prop = part.slice(0, colonIdx).trim();
      const val = part.slice(colonIdx + 1).trim();
      // Convert kebab-case to camelCase
      const camelProp = prop.replace(/-([a-z])/g, (_m, c) => c.toUpperCase());
      styles[camelProp] = val;
    }
    return styles;
  }

  function parseNode(): ParsedNode | null {
    skipWhitespace();
    if (pos >= html.length) return null;

    // Text node
    if (html[pos] !== "<") {
      let text = "";
      while (pos < html.length && html[pos] !== "<") {
        text += html[pos++];
      }
      text = text.trim();
      if (!text) return null;
      // Decode basic HTML entities
      text = text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ");
      return { tag: "#text", attrs: {}, styles: {}, classes: [], children: [], text };
    }

    // Skip comments
    if (html.slice(pos, pos + 4) === "<!--") {
      const endComment = html.indexOf("-->", pos + 4);
      pos = endComment === -1 ? html.length : endComment + 3;
      return null;
    }

    // Closing tag — return null to signal parent to stop
    if (html[pos + 1] === "/") {
      return null;
    }

    // Opening tag
    pos++; // skip <
    let tag = "";
    while (pos < html.length && !/[\s>\/]/.test(html[pos])) {
      tag += html[pos++];
    }
    tag = tag.toLowerCase();

    const attrs = parseAttributes();
    const styles = parseCSS(attrs["style"] || "");
    const classes = (attrs["class"] || "").split(/\s+/).filter(Boolean);

    // Self-closing tags
    const selfClosing = ["img", "br", "hr", "input", "meta", "link"];
    skipWhitespace();
    if (html[pos] === "/") {
      pos++; // skip /
      skipWhitespace();
    }
    if (html[pos] === ">") pos++; // skip >

    const node: ParsedNode = { tag, attrs, styles, classes, children: [], text: "" };

    if (selfClosing.includes(tag)) {
      return node;
    }

    // Parse children until closing tag
    while (pos < html.length) {
      skipWhitespace();
      // Check for closing tag
      if (html[pos] === "<" && html[pos + 1] === "/") {
        // Skip to end of closing tag
        const closeEnd = html.indexOf(">", pos);
        pos = closeEnd === -1 ? html.length : closeEnd + 1;
        break;
      }
      const child = parseNode();
      if (child === null) {
        // If we hit a closing tag for a parent, break
        if (html[pos] === "<" && html[pos + 1] === "/") {
          const closeEnd = html.indexOf(">", pos);
          pos = closeEnd === -1 ? html.length : closeEnd + 1;
          break;
        }
        continue;
      }
      node.children.push(child);
    }

    return node;
  }

  while (pos < html.length) {
    skipWhitespace();
    if (pos >= html.length) break;
    const node = parseNode();
    if (node) nodes.push(node);
  }

  return nodes;
}

// ── CSS Value Parsers ───────────────────────────────────────────────────────

function parsePx(val: string | undefined): number | null {
  if (!val) return null;
  const match = val.match(/^(-?\d+(?:\.\d+)?)\s*px$/i);
  return match ? parseFloat(match[1]) : null;
}

function parsePercent(val: string | undefined): number | null {
  if (!val) return null;
  const match = val.match(/^(-?\d+(?:\.\d+)?)\s*%$/);
  return match ? parseFloat(match[1]) : null;
}

function parseColor(val: string | undefined): string | null {
  if (!val) return null;
  // Hex color
  if (val.startsWith("#")) return val;
  // rgb/rgba
  const rgbMatch = val.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, "0");
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, "0");
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  }
  // Named colors (common ones)
  const namedColors: Record<string, string> = {
    black: "#000000", white: "#FFFFFF", red: "#FF0000", green: "#00FF00",
    blue: "#0000FF", yellow: "#FFFF00", transparent: "#00000000",
  };
  return namedColors[val.toLowerCase()] || null;
}

function fontWeightToStyle(weight: string): string {
  const map: Record<string, string> = {
    "100": "Thin", "200": "Extra Light", "300": "Light",
    "400": "Regular", "500": "Medium", "600": "Semi Bold",
    "700": "Bold", "800": "Extra Bold", "900": "Black",
    normal: "Regular", bold: "Bold",
  };
  return map[weight] || "Regular";
}

function parseShorthandPadding(val: string): { top: number; right: number; bottom: number; left: number } {
  const parts = val.split(/\s+/).map(v => parsePx(v) || 0);
  if (parts.length === 1) return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
  if (parts.length === 2) return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
  if (parts.length === 3) return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
  return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
}

function parseBorder(val: string): { width: number; color: string } | null {
  // "1.5px solid #F6B446" or "2px solid red"
  const match = val.match(/(\d+(?:\.\d+)?)\s*px\s+\w+\s+(#[0-9a-fA-F]+|\w+)/);
  if (!match) return null;
  const color = parseColor(match[2]);
  return color ? { width: parseFloat(match[1]), color } : null;
}

// B-2: Resolve absolute position from CSS, supporting right/bottom by computing
// against the parent's known width/height. Returns 0 fallback when nothing
// specified, matching previous behavior.
function computeAbsolutePosition(
  styles: Record<string, string>,
  parent: any,
  elementWidth: number,
  elementHeight: number
): { x: number; y: number } {
  const left = parsePx(styles.left);
  const top = parsePx(styles.top);
  const right = parsePx(styles.right);
  const bottom = parsePx(styles.bottom);

  let x = left ?? parsePx((styles as any).x);
  let y = top ?? parsePx((styles as any).y);

  // If only `right` is given and parent width is known, compute left = parentW - elementW - right
  if (x == null && right != null && parent && typeof parent.width === "number" && parent.width > 0) {
    x = parent.width - elementWidth - right;
  }
  if (y == null && bottom != null && parent && typeof parent.height === "number" && parent.height > 0) {
    y = parent.height - elementHeight - bottom;
  }

  return { x: x ?? 0, y: y ?? 0 };
}

// ── Figma Node Creator ──────────────────────────────────────────────────────

async function createFigmaNode(
  parsed: ParsedNode,
  parent: any,
  styleMapping: StyleMapping
): Promise<CreatedNode | null> {
  const { tag, styles, classes, attrs, children } = parsed;

  // Text nodes become text within parent's text node
  if (tag === "#text") {
    // Will be handled by parent
    return null;
  }

  // Determine if this is a text element
  const textTags = ["p", "span", "h1", "h2", "h3", "h4", "h5", "h6", "pre", "code", "label", "a"];
  const isTextElement = textTags.includes(tag) || (tag === "div" && hasOnlyTextChildren(parsed));

  if (isTextElement) {
    return await createTextNode(parsed, parent, styleMapping);
  }

  // hr -> Line/divider
  if (tag === "hr") {
    return await createDivider(parsed, parent);
  }

  // img -> Rectangle with image fill
  if (tag === "img") {
    return await createImageNode(parsed, parent);
  }

  // SVG -> Skip for now (SVGs need special handling)
  if (tag === "svg") {
    return null;
  }

  // Everything else -> Frame
  return await createFrameNode(parsed, parent, styleMapping);
}

function hasOnlyTextChildren(node: ParsedNode): boolean {
  if (node.children.length === 0) return false;
  return node.children.every(c => c.tag === "#text" || c.tag === "span" || c.tag === "br");
}

function collectText(node: ParsedNode): string {
  if (node.tag === "#text") return node.text;
  if (node.tag === "br") return "\n";
  return node.children.map(collectText).join("");
}

async function createTextNode(
  parsed: ParsedNode,
  parent: any,
  styleMapping: StyleMapping
): Promise<CreatedNode> {
  const { styles, classes, attrs } = parsed;
  const text = collectText(parsed).trim() || attrs["data-text"] || "";

  const fontFamily = styles.fontFamily?.replace(/['"]/g, "").split(",")[0].trim() || "Inter";
  const fontStyle = styles.fontWeight ? fontWeightToStyle(styles.fontWeight) : (styles.fontStyle === "italic" ? "Italic" : "Regular");

  await figma.loadFontAsync({ family: fontFamily, style: fontStyle });

  const textNode = figma.createText();
  textNode.fontName = { family: fontFamily, style: fontStyle };

  // B-3: set textAutoResize BEFORE characters so width constraint is respected
  // during initial layout. Setting characters first locks in WIDTH_AND_HEIGHT
  // which then ignores subsequent resize().
  const width = parsePx(styles.width);
  if (width) {
    textNode.textAutoResize = "HEIGHT";
  }

  textNode.characters = text;

  // Apply width AFTER characters so Figma re-flows correctly with the constraint
  if (width) {
    textNode.resize(width, textNode.height);
  }

  // Font size
  const fontSize = parsePx(styles.fontSize);
  if (fontSize) textNode.fontSize = fontSize;

  // Text color
  const color = parseColor(styles.color);
  if (color) textNode.fills = [makeSolidPaint(color)];

  // Text alignment
  if (styles.textAlign) {
    const alignMap: Record<string, TextNode["textAlignHorizontal"]> = {
      left: "LEFT", center: "CENTER", right: "RIGHT", justify: "JUSTIFIED",
    };
    const align = alignMap[styles.textAlign];
    if (align) textNode.textAlignHorizontal = align;
  }

  // Line height
  const lineHeight = parsePx(styles.lineHeight);
  if (lineHeight) {
    textNode.lineHeight = { value: lineHeight, unit: "PIXELS" };
  }

  // Letter spacing
  const letterSpacing = parsePx(styles.letterSpacing);
  if (letterSpacing) {
    textNode.letterSpacing = { value: letterSpacing, unit: "PIXELS" };
  }

  // Text decoration
  if (styles.textDecoration === "underline") textNode.textDecoration = "UNDERLINE";
  if (styles.textDecoration === "line-through") textNode.textDecoration = "STRIKETHROUGH";

  // B-2: position with right/bottom support (computed against parent dims)
  const pos = computeAbsolutePosition(styles, parent, textNode.width, textNode.height);
  textNode.x = pos.x;
  textNode.y = pos.y;

  // Layer name
  const layerName = attrs["layer-name"] || attrs["data-name"];
  if (layerName) textNode.name = layerName;

  // Opacity
  if (styles.opacity) textNode.opacity = parseFloat(styles.opacity);

  // Apply named style bindings LAST — they override inline CSS properties.
  // Must happen after characters are set (text styles require text content).
  const classBound = await applyStyleMappingToNode(textNode, classes, styleMapping);
  const attrBound = await applyDataStyleAttributes(textNode, attrs);
  const allVars = [...(classBound.variables || []), ...(attrBound.variables || [])];
  const boundStyles: BoundStyles = {
    text: attrBound.text || classBound.text || undefined,
    fill: attrBound.fill || classBound.fill || undefined,
    ...(allVars.length > 0 ? { variables: allVars } : {}),
  };

  (parent as any).appendChild(textNode);

  return {
    id: textNode.id,
    name: textNode.name,
    type: textNode.type,
    bounds: getBounds(textNode),
    ...(boundStyles.text || boundStyles.fill || boundStyles.variables ? { boundStyles } : {}),
  };
}

async function createFrameNode(
  parsed: ParsedNode,
  parent: any,
  styleMapping: StyleMapping
): Promise<CreatedNode> {
  const { styles, classes, attrs, children } = parsed;

  // Check for data-component-id — clone instead of creating new
  if (attrs["data-component-id"]) {
    return await cloneComponentNode(attrs["data-component-id"], parsed, parent);
  }

  const frame = figma.createFrame();

  // Size — priority: explicit px > parent width (non-flex) > 1px placeholder
  // (B-7: was hard-coded 100px which clipped content; we now inherit parent
  // size when available and re-fit to children later if still unset.)
  const pxWidth = parsePx(styles.width);
  const pxHeight = parsePx(styles.height);
  const pctWidth = parsePercent(styles.width);
  const parentIsFlexLayout =
    parent && "layoutMode" in parent && parent.layoutMode !== "NONE";

  let initialWidth: number;
  if (pxWidth !== null) {
    initialWidth = pxWidth;
  } else if (pctWidth === 100 && parent && typeof parent.width === "number" && parent.width > 0) {
    initialWidth = parent.width;
  } else if (!parentIsFlexLayout && parent && typeof parent.width === "number" && parent.width > 0) {
    initialWidth = parent.width;
  } else {
    initialWidth = 100; // last-resort default
  }
  const initialHeight = pxHeight ?? 100;
  frame.resize(initialWidth, initialHeight);

  // Position — uses computeAbsolutePosition for right/bottom support (B-2)
  if (styles.position === "absolute") {
    const pos = computeAbsolutePosition(styles, parent, frame.width, frame.height);
    frame.x = pos.x;
    frame.y = pos.y;
  }

  // Background color
  const bgColor = parseColor(styles.backgroundColor) || parseColor(styles.background);
  if (bgColor) {
    frame.fills = [makeSolidPaint(bgColor)];
  } else {
    frame.fills = []; // Transparent by default (like HTML divs)
  }

  // Border radius
  const borderRadius = parsePx(styles.borderRadius);
  if (borderRadius) frame.cornerRadius = borderRadius;

  // Border/stroke
  const border = styles.border ? parseBorder(styles.border) : null;
  if (border) {
    frame.strokes = [makeSolidPaint(border.color)];
    frame.strokeWeight = border.width;
  }
  const borderColor = parseColor(styles.borderColor);
  if (borderColor && !border) {
    frame.strokes = [makeSolidPaint(borderColor)];
    const borderWidth = parsePx(styles.borderWidth);
    if (borderWidth) frame.strokeWeight = borderWidth;
  }

  // Opacity
  if (styles.opacity) frame.opacity = parseFloat(styles.opacity);

  // Auto Layout (flex)
  // B-5: if any direct child uses position:absolute, ignore parent flex.
  // Mixing flex layout with absolute children silently breaks slide layouts —
  // absolute positions get overridden by flex flow. Better to honor the
  // children's intent than force a contradictory layout.
  const hasAbsoluteChildren = children.some(
    c => c.styles && c.styles.position === "absolute"
  );
  const display = hasAbsoluteChildren ? "block" : styles.display;
  if (display === "flex") {
    const direction = styles.flexDirection || "row";
    frame.layoutMode = direction === "column" ? "VERTICAL" : "HORIZONTAL";

    // Gap / itemSpacing
    const gap = parsePx(styles.gap);
    if (gap) frame.itemSpacing = gap;

    // Padding (shorthand or individual)
    if (styles.padding) {
      const pad = parseShorthandPadding(styles.padding);
      frame.paddingTop = pad.top;
      frame.paddingRight = pad.right;
      frame.paddingBottom = pad.bottom;
      frame.paddingLeft = pad.left;
    }
    if (styles.paddingTop) frame.paddingTop = parsePx(styles.paddingTop) || 0;
    if (styles.paddingRight) frame.paddingRight = parsePx(styles.paddingRight) || 0;
    if (styles.paddingBottom) frame.paddingBottom = parsePx(styles.paddingBottom) || 0;
    if (styles.paddingLeft) frame.paddingLeft = parsePx(styles.paddingLeft) || 0;

    // Alignment -> Figma axis alignment
    const justifyMap: Record<string, "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN"> = {
      "flex-start": "MIN", "start": "MIN", center: "CENTER",
      "flex-end": "MAX", "end": "MAX", "space-between": "SPACE_BETWEEN",
    };
    const alignMap: Record<string, "MIN" | "CENTER" | "MAX"> = {
      "flex-start": "MIN", "start": "MIN", center: "CENTER",
      "flex-end": "MAX", "end": "MAX", stretch: "MIN",
    };

    if (styles.justifyContent && justifyMap[styles.justifyContent]) {
      frame.primaryAxisAlignItems = justifyMap[styles.justifyContent];
    }
    if (styles.alignItems && alignMap[styles.alignItems]) {
      frame.counterAxisAlignItems = alignMap[styles.alignItems];
    }

    // Sizing mode
    if (styles.width) frame.primaryAxisSizingMode = "FIXED";
    if (styles.height) {
      // Vertical -> height is primary, Horizontal -> height is counter
      if (direction === "column") {
        frame.primaryAxisSizingMode = "FIXED";
      } else {
        frame.counterAxisSizingMode = "FIXED";
      }
    }

    // Flex wrap
    if (styles.flexWrap === "wrap") frame.layoutWrap = "WRAP";
  }

  // Even without display:flex, apply padding if present
  if (!display || display !== "flex") {
    if (styles.padding) {
      const pad = parseShorthandPadding(styles.padding);
      // Only apply padding if we have children (otherwise it's decorative)
      if (children.length > 0) {
        frame.layoutMode = "VERTICAL"; // Need auto-layout for padding
        frame.paddingTop = pad.top;
        frame.paddingRight = pad.right;
        frame.paddingBottom = pad.bottom;
        frame.paddingLeft = pad.left;
        frame.primaryAxisSizingMode = "FIXED";
        frame.counterAxisSizingMode = "FIXED";
      }
    }
  }

  // Layer name
  const layerName = attrs["layer-name"] || attrs["data-name"];
  if (layerName) frame.name = layerName;

  // Clip content (overflow hidden)
  if (styles.overflow === "hidden") frame.clipsContent = true;

  // Apply named style bindings LAST — they override inline CSS properties.
  const classBound = await applyStyleMappingToNode(frame, classes, styleMapping);
  const attrBound = await applyDataStyleAttributes(frame, attrs);
  const allFrameVars = [...(classBound.variables || []), ...(attrBound.variables || [])];
  const frameBoundStyles: BoundStyles = {
    text: attrBound.text || classBound.text || undefined,
    fill: attrBound.fill || classBound.fill || undefined,
    ...(allFrameVars.length > 0 ? { variables: allFrameVars } : {}),
  };

  // Append to parent
  (parent as any).appendChild(frame);

  // Flex-child sizing (must happen after appendChild so the parent layout context is available)
  const parentIsAutoLayout =
    parent && "layoutMode" in parent && parent.layoutMode !== "NONE";

  if (parentIsAutoLayout) {
    // Only handles the common `flex: 1` shorthand; complex values like `flex: 1 1 0%` are not parsed
    const flexShorthand = (styles.flex || "").trim().split(/\s+/)[0];
    const flexGrow = flexShorthand === "1" || styles.flexGrow === "1";

    // Wrap each sizing assignment in its own try block. Setting HUG/FILL on a
    // child whose own layout context disallows it throws; we never want one
    // assignment failure to kill the whole frame creation.
    try {
      if (flexGrow || pctWidth === 100) {
        // flex:1 or width:100% → fill available space in parent auto-layout (FILL works regardless of self layoutMode)
        frame.layoutSizingHorizontal = "FILL";
      } else if (!pxWidth && frame.layoutMode !== "NONE") {
        // HUG only legal when this frame itself is auto-layout. Without this guard
        // we'd crash on a non-auto-layout child of an auto-layout parent (the
        // v1.3.0 regression — fixed in v1.3.1).
        frame.layoutSizingHorizontal = "HUG";
      }
    } catch (_) { /* best-effort; leave default */ }

    // Vertical sizing: same constraint — HUG requires self auto-layout.
    try {
      if (!pxHeight && children.length > 0 && frame.layoutMode !== "NONE") {
        frame.layoutSizingVertical = "HUG";
      }
    } catch (_) { /* best-effort */ }
  }

  // Recursively create children
  const createdChildren: CreatedNode[] = [];
  for (const child of children) {
    const created = await createFigmaNode(child, frame, styleMapping);
    if (created) createdChildren.push(created);
  }

  // If height was "auto" or not set and we have auto-layout, let it hug
  // When this frame itself has auto-layout and no explicit height, hug its own children
  if (!styles.height && frame.layoutMode !== "NONE") {
    if (frame.layoutMode === "VERTICAL") {
      frame.primaryAxisSizingMode = "AUTO";
    } else {
      frame.counterAxisSizingMode = "AUTO";
    }
  }

  // B-7: For non-auto-layout frames with no explicit dimensions, refit to the
  // bounding box of children. Without this, an unsized container collapses to
  // the 100px placeholder we used during initial creation.
  if (frame.layoutMode === "NONE" && frame.children.length > 0) {
    let maxX = 0;
    let maxY = 0;
    for (const c of frame.children) {
      const cx = typeof (c as any).x === "number" ? (c as any).x : 0;
      const cy = typeof (c as any).y === "number" ? (c as any).y : 0;
      const cw = typeof (c as any).width === "number" ? (c as any).width : 0;
      const ch = typeof (c as any).height === "number" ? (c as any).height : 0;
      maxX = Math.max(maxX, cx + cw);
      maxY = Math.max(maxY, cy + ch);
    }
    const newW = !pxWidth && maxX > 0 ? maxX : frame.width;
    const newH = !pxHeight && maxY > 0 ? maxY : frame.height;
    if (newW !== frame.width || newH !== frame.height) {
      frame.resize(newW, newH);
    }
  }

  return {
    id: frame.id,
    name: frame.name,
    type: frame.type,
    bounds: getBounds(frame),
    children: createdChildren,
    ...(frameBoundStyles.text || frameBoundStyles.fill || frameBoundStyles.variables
      ? { boundStyles: frameBoundStyles }
      : {}),
  };
}

async function createDivider(
  parsed: ParsedNode,
  parent: any
): Promise<CreatedNode> {
  const { styles, attrs } = parsed;
  const rect = figma.createRectangle();
  const width = parsePx(styles.width) || 940;
  const height = parsePx(styles.height) || 2;
  rect.resize(width, height);

  const color = parseColor(styles.backgroundColor) || parseColor(styles.borderColor) || "#CCCCCC";
  rect.fills = [makeSolidPaint(color)];

  if (styles.opacity) rect.opacity = parseFloat(styles.opacity);

  const layerName = attrs["layer-name"] || "Divider";
  rect.name = layerName;

  (parent as any).appendChild(rect);

  return {
    id: rect.id,
    name: rect.name,
    type: rect.type,
    bounds: getBounds(rect),
  };
}

async function createImageNode(
  parsed: ParsedNode,
  parent: any
): Promise<CreatedNode> {
  const { styles, attrs } = parsed;
  const src = attrs["src"] || "";
  const width = parsePx(styles.width) || 200;
  const height = parsePx(styles.height) || 200;

  const rect = figma.createRectangle();
  rect.resize(width, height);

  // If src starts with "base64:" decode and create image fill
  if (src.startsWith("base64:") || src.startsWith("data:image")) {
    try {
      let b64Data = src;
      if (src.startsWith("data:image")) {
        b64Data = src.split(",")[1] || "";
      } else {
        b64Data = src.slice(7); // Remove "base64:" prefix
      }

      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      const lookup: Record<string, number> = {};
      for (let i = 0; i < chars.length; i++) lookup[chars[i]] = i;
      const padded = b64Data.replace(/[^A-Za-z0-9+/=]/g, "");
      const clean = padded.replace(/=/g, "");
      let outLen = Math.floor(padded.length * 3 / 4);
      if (padded.endsWith("==")) outLen -= 2;
      else if (padded.endsWith("=")) outLen -= 1;
      const bytes = new Uint8Array(outLen);
      let j = 0;
      for (let i = 0; i < clean.length; i += 4) {
        const a = lookup[clean[i]] || 0;
        const bv = lookup[clean[i + 1]] || 0;
        const c = lookup[clean[i + 2]] || 0;
        const d = lookup[clean[i + 3]] || 0;
        bytes[j++] = (a << 2) | (bv >> 4);
        if (j < outLen) bytes[j++] = ((bv & 15) << 4) | (c >> 2);
        if (j < outLen) bytes[j++] = ((c & 3) << 6) | d;
      }

      const image = figma.createImage(bytes);
      rect.fills = [{ type: "IMAGE", imageHash: image.hash, scaleMode: "FILL" }];
    } catch (e) {
      // Fallback: gray placeholder
      rect.fills = [makeSolidPaint("#CCCCCC")];
    }
  } else {
    // No inline image data — use placeholder
    rect.fills = [makeSolidPaint("#E0E0E0")];
    rect.name = attrs["alt"] || "Image Placeholder";
  }

  if (styles.borderRadius) {
    const br = parsePx(styles.borderRadius);
    if (br) rect.cornerRadius = br;
  }
  if (styles.opacity) rect.opacity = parseFloat(styles.opacity);

  const layerName = attrs["layer-name"] || attrs["alt"] || "Image";
  rect.name = layerName;

  (parent as any).appendChild(rect);

  return {
    id: rect.id,
    name: rect.name,
    type: rect.type,
    bounds: getBounds(rect),
  };
}

async function cloneComponentNode(
  componentId: string,
  parsed: ParsedNode,
  parent: any
): Promise<CreatedNode> {
  const node = await figma.getNodeByIdAsync(componentId);
  if (!node) throw new Error(`Component not found: ${componentId}`);

  let clone: SceneNode;
  if (node.type === "COMPONENT") {
    clone = (node as ComponentNode).createInstance();
  } else {
    clone = (node as SceneNode).clone();
  }

  const { styles, attrs } = parsed;

  // Apply position overrides
  const cx = parsePx(styles.left);
  const cy = parsePx(styles.top);
  if (cx != null) clone.x = cx;
  if (cy != null) clone.y = cy;

  // Apply size overrides
  const w = parsePx(styles.width);
  const h = parsePx(styles.height);
  if (w != null || h != null) {
    clone.resize(w != null ? w : clone.width, h != null ? h : clone.height);
  }

  const layerName = attrs["layer-name"];
  if (layerName) clone.name = layerName;

  // For non-instance clones, ensure child fills are preserved.
  // Figma's clone() copies properties but sometimes fill visibility
  // on nested children needs to be re-asserted.
  if (clone.type !== "INSTANCE" && "children" in clone) {
    for (const child of (clone as FrameNode).children) {
      if ("fills" in child) {
        const fills = (child as GeometryMixin).fills;
        if (Array.isArray(fills) && fills.length > 0) {
          (child as GeometryMixin).fills = [...fills];
        }
      }
    }
  }

  (parent as any).appendChild(clone);

  return {
    id: clone.id,
    name: clone.name,
    type: clone.type,
    bounds: getBounds(clone),
  };
}

// ── Style Mapping Engine ────────────────────────────────────────────────────

async function applyStyleMappingToNode(
  node: SceneNode,
  classes: string[],
  styleMapping: StyleMapping
): Promise<BoundStyles> {
  const bound: BoundStyles = {};
  for (const cls of classes) {
    const mapping = styleMapping[cls];
    if (!mapping) continue;

    if (mapping.textStyleId && "setTextStyleIdAsync" in node) {
      try {
        await (node as TextNode).setTextStyleIdAsync(mapping.textStyleId);
        bound.text = mapping.textStyleId;
      } catch (e) { /* skip */ }
    }

    if (mapping.paintStyleId && "setFillStyleIdAsync" in node) {
      try {
        await (node as any).setFillStyleIdAsync(mapping.paintStyleId);
        bound.fill = mapping.paintStyleId;
      } catch (e) { /* skip */ }
    }

    // B-8: variable bindings via class
    if (mapping.variables && mapping.variables.length > 0) {
      const boundVars = await applyVariableBindings(node, mapping.variables);
      if (boundVars.length > 0) {
        bound.variables = (bound.variables || []).concat(boundVars);
      }
    }
  }
  return bound;
}

async function applyDataStyleAttributes(node: SceneNode, attrs: Record<string, string>): Promise<BoundStyles> {
  const bound: BoundStyles = {};

  if (attrs["data-text-style-id"] && "setTextStyleIdAsync" in node) {
    try {
      await (node as TextNode).setTextStyleIdAsync(attrs["data-text-style-id"]);
      bound.text = attrs["data-text-style-id"];
    } catch (e) { /* style not found, skip */ }
  }
  if (attrs["data-paint-style-id"] && "setFillStyleIdAsync" in node) {
    try {
      await (node as any).setFillStyleIdAsync(attrs["data-paint-style-id"]);
      bound.fill = attrs["data-paint-style-id"];
    } catch (e) { /* style not found, skip */ }
  }
  if (attrs["data-style-id"]) {
    try {
      const style = await figma.getStyleByIdAsync(attrs["data-style-id"]);
      if (style) {
        if (style.type === "TEXT" && "setTextStyleIdAsync" in node) {
          await (node as TextNode).setTextStyleIdAsync(attrs["data-style-id"]);
          bound.text = attrs["data-style-id"];
        } else if (style.type === "PAINT" && "setFillStyleIdAsync" in node) {
          await (node as any).setFillStyleIdAsync(attrs["data-style-id"]);
          bound.fill = attrs["data-style-id"];
        }
      }
    } catch (e) { /* skip */ }
  }

  // B-8: variable bindings via data-* attributes
  // Single binding: data-variable-field="fillColor" data-variable-id="VariableID:..."
  if (attrs["data-variable-field"] && attrs["data-variable-id"]) {
    const boundVars = await applyVariableBindings(node, [
      { field: attrs["data-variable-field"], variableId: attrs["data-variable-id"] },
    ]);
    if (boundVars.length > 0) bound.variables = boundVars;
  }
  // Multi-binding: data-variables='[{"field":"fillColor","variableId":"..."}]'
  if (attrs["data-variables"]) {
    try {
      const list: VariableBinding[] = JSON.parse(attrs["data-variables"]);
      if (Array.isArray(list)) {
        const boundVars = await applyVariableBindings(node, list);
        if (boundVars.length > 0) {
          bound.variables = (bound.variables || []).concat(boundVars);
        }
      }
    } catch (e) { /* malformed JSON, skip */ }
  }

  return bound;
}

// B-8: bind one or more variables to a node. Handles fillColor / strokeColor
// (which need a paint wrapper) and generic numeric/boolean fields (which use
// setBoundVariable directly).
async function applyVariableBindings(
  node: SceneNode,
  bindings: VariableBinding[]
): Promise<{ field: string; variableId: string }[]> {
  const applied: { field: string; variableId: string }[] = [];
  if (!figma.variables || typeof figma.variables.getVariableByIdAsync !== "function") {
    return applied;
  }

  for (const b of bindings) {
    try {
      const variable = await figma.variables.getVariableByIdAsync(b.variableId);
      if (!variable) continue;

      if (b.field === "fillColor" && "fills" in node) {
        const fills = JSON.parse(JSON.stringify((node as any).fills));
        const wrap = (paint: any) =>
          figma.variables.setBoundVariableForPaint(paint, "color", variable);
        if (Array.isArray(fills) && fills.length > 0 && fills[0].type === "SOLID") {
          fills[0] = wrap(fills[0]);
        } else {
          fills.unshift(wrap({ type: "SOLID", color: { r: 0, g: 0, b: 0 } }));
        }
        (node as any).fills = fills;
        applied.push({ field: b.field, variableId: b.variableId });
      } else if (b.field === "strokeColor" && "strokes" in node) {
        const strokes = JSON.parse(JSON.stringify((node as any).strokes));
        if (Array.isArray(strokes) && strokes.length > 0 && strokes[0].type === "SOLID") {
          strokes[0] = figma.variables.setBoundVariableForPaint(strokes[0], "color", variable);
          (node as any).strokes = strokes;
          applied.push({ field: b.field, variableId: b.variableId });
        }
      } else if (typeof (node as any).setBoundVariable === "function") {
        (node as any).setBoundVariable(b.field, variable);
        applied.push({ field: b.field, variableId: b.variableId });
      }
    } catch (e) {
      /* binding failed, skip */
    }
  }
  return applied;
}

// ── Figma-to-HTML Exporter ──────────────────────────────────────────────────

async function nodeToHTML(node: SceneNode, depth: number, maxDepth: number): Promise<string> {
  if (depth > maxDepth) return "";

  if (node.type === "TEXT") {
    const textNode = node as TextNode;
    const styles: string[] = [];

    // Font
    if (typeof textNode.fontName !== "symbol" && textNode.fontName) {
      styles.push(`font-family: '${textNode.fontName.family}'`);
      if (textNode.fontName.style !== "Regular") {
        const weightMap: Record<string, string> = {
          "Thin": "100", "Extra Light": "200", "Light": "300",
          "Regular": "400", "Medium": "500", "Semi Bold": "600",
          "Bold": "700", "Extra Bold": "800", "Black": "900",
        };
        styles.push(`font-weight: ${weightMap[textNode.fontName.style] || "400"}`);
      }
    }
    if (typeof textNode.fontSize !== "symbol") styles.push(`font-size: ${textNode.fontSize}px`);

    // Color
    const fills = textNode.fills;
    if (Array.isArray(fills) && fills.length > 0 && fills[0].type === "SOLID") {
      const c = fills[0].color;
      const hex = `#${[c.r, c.g, c.b].map((v: number) => Math.round(v * 255).toString(16).padStart(2, "0")).join("")}`;
      styles.push(`color: ${hex}`);
    }

    // Line height
    if (typeof textNode.lineHeight !== "symbol" && textNode.lineHeight.unit !== "AUTO") {
      styles.push(`line-height: ${textNode.lineHeight.value}px`);
    }

    // Text align
    if (textNode.textAlignHorizontal !== "LEFT") {
      const map: Record<string, string> = { CENTER: "center", RIGHT: "right", JUSTIFIED: "justify" };
      styles.push(`text-align: ${map[textNode.textAlignHorizontal] || "left"}`);
    }

    const chars = textNode.characters.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const layerAttr = node.name ? ` layer-name="${node.name}"` : "";
    return `<p style="${styles.join("; ")}"${layerAttr}>${chars}</p>`;
  }

  if (node.type === "RECTANGLE" || node.type === "ELLIPSE") {
    const styles: string[] = [];
    styles.push(`width: ${Math.round(node.width)}px`);
    styles.push(`height: ${Math.round(node.height)}px`);

    const fills = (node as RectangleNode).fills;
    if (Array.isArray(fills) && fills.length > 0 && fills[0].type === "SOLID") {
      const c = fills[0].color;
      const hex = `#${[c.r, c.g, c.b].map((v: number) => Math.round(v * 255).toString(16).padStart(2, "0")).join("")}`;
      styles.push(`background-color: ${hex}`);
    }

    if ("cornerRadius" in node && typeof node.cornerRadius !== "symbol" && node.cornerRadius > 0) {
      styles.push(`border-radius: ${node.cornerRadius}px`);
    }

    const tag = node.type === "ELLIPSE" ? "div" : "div";
    const layerAttr = node.name ? ` layer-name="${node.name}"` : "";
    return `<${tag} style="${styles.join("; ")}"${layerAttr}></${tag}>`;
  }

  if (node.type === "FRAME" || node.type === "COMPONENT" || node.type === "INSTANCE" || node.type === "GROUP") {
    const frameNode = node as FrameNode;
    const styles: string[] = [];

    styles.push(`width: ${Math.round(node.width)}px`);
    styles.push(`height: ${Math.round(node.height)}px`);

    // Auto layout -> flex
    if ("layoutMode" in frameNode && frameNode.layoutMode !== "NONE") {
      styles.push("display: flex");
      styles.push(`flex-direction: ${frameNode.layoutMode === "VERTICAL" ? "column" : "row"}`);
      if (frameNode.itemSpacing) styles.push(`gap: ${frameNode.itemSpacing}px`);

      // Padding
      const pt = frameNode.paddingTop || 0;
      const pr = frameNode.paddingRight || 0;
      const pb = frameNode.paddingBottom || 0;
      const pl = frameNode.paddingLeft || 0;
      if (pt || pr || pb || pl) {
        styles.push(`padding: ${pt}px ${pr}px ${pb}px ${pl}px`);
      }

      // Alignment
      const justifyMap: Record<string, string> = { MIN: "flex-start", CENTER: "center", MAX: "flex-end", SPACE_BETWEEN: "space-between" };
      const alignMap: Record<string, string> = { MIN: "flex-start", CENTER: "center", MAX: "flex-end" };
      if (frameNode.primaryAxisAlignItems && justifyMap[frameNode.primaryAxisAlignItems]) {
        styles.push(`justify-content: ${justifyMap[frameNode.primaryAxisAlignItems]}`);
      }
      if (frameNode.counterAxisAlignItems && alignMap[frameNode.counterAxisAlignItems]) {
        styles.push(`align-items: ${alignMap[frameNode.counterAxisAlignItems]}`);
      }
    }

    // Background
    const fills = frameNode.fills;
    if (Array.isArray(fills) && fills.length > 0 && fills[0].type === "SOLID") {
      const c = fills[0].color;
      const hex = `#${[c.r, c.g, c.b].map((v: number) => Math.round(v * 255).toString(16).padStart(2, "0")).join("")}`;
      styles.push(`background-color: ${hex}`);
    }

    if ("cornerRadius" in frameNode && typeof frameNode.cornerRadius !== "symbol" && frameNode.cornerRadius > 0) {
      styles.push(`border-radius: ${frameNode.cornerRadius}px`);
    }

    if (frameNode.opacity !== undefined && frameNode.opacity < 1) {
      styles.push(`opacity: ${frameNode.opacity}`);
    }

    // Children
    let childrenHTML = "";
    if ("children" in frameNode) {
      for (const child of (frameNode as any).children) {
        childrenHTML += await nodeToHTML(child, depth + 1, maxDepth);
      }
    }

    const layerAttr = node.name ? ` layer-name="${node.name}"` : "";
    return `<div style="${styles.join("; ")}"${layerAttr}>\n${childrenHTML}</div>\n`;
  }

  return "";
}

// ── Request Handlers ────────────────────────────────────────────────────────

export const handleWriteHtmlRequest = async (request: any) => {
  switch (request.type) {
    case "write_html": {
      const p = request.params || {};
      // Idempotency: if this requestId was already completed, return cached result
      if (p.requestId && completedRequests.has(p.requestId)) {
        return {
          type: request.type,
          requestId: request.requestId,
          data: completedRequests.get(p.requestId),
        };
      }

      const html = p.html;
      const targetNodeId = p.targetNodeId;
      const mode = p.mode || "insert-children";
      const styleMapping: StyleMapping = p.styleMapping || {};

      if (!html) throw new Error("html is required");
      if (!targetNodeId) throw new Error("targetNodeId is required");

      const targetNode = await figma.getNodeByIdAsync(targetNodeId);
      if (!targetNode) throw new Error(`Target node not found: ${targetNodeId}`);

      let parent: any;
      if (mode === "replace") {
        parent = targetNode.parent;
        if (!parent) throw new Error("Cannot replace root node");
      } else {
        parent = targetNode;
      }

      if (!("appendChild" in parent)) {
        throw new Error(`Node ${mode === "replace" ? "parent of " + targetNodeId : targetNodeId} cannot have children`);
      }

      // Parse HTML
      const parsedNodes = parseHTML(html);

      // Create Figma nodes
      const created: CreatedNode[] = [];
      for (const parsed of parsedNodes) {
        const node = await createFigmaNode(parsed, parent, styleMapping);
        if (node) created.push(node);
      }

      // If replace mode, remove the original target
      let originalX = 0, originalY = 0, hadOriginalPos = false;
      if (mode === "replace") {
        if (typeof (targetNode as any).x === "number") {
          originalX = (targetNode as any).x;
          originalY = (targetNode as any).y;
          hadOriginalPos = true;
        }
        (targetNode as SceneNode).remove();
      }

      // B-6: optional explicit placement OR auto-offset
      const explicitX = typeof p.x === "number" ? p.x : null;
      const explicitY = typeof p.y === "number" ? p.y : null;
      const autoOffset = !!p.autoOffset;

      // Lookup table for the SceneNodes we just created — find them in
      // parent.children by ID rather than via getNodeByIdAsync (which can
      // race or not yet see the fresh nodes inside test mocks).
      const parentChildren: any[] = ("children" in parent) ? (parent as any).children : [];
      for (const c of created) {
        const sceneNode = parentChildren.find((s: any) => s.id === c.id);
        if (!sceneNode || !("x" in sceneNode)) continue;

        if (explicitX !== null) {
          sceneNode.x = explicitX;
        } else if (mode === "replace" && hadOriginalPos) {
          sceneNode.x = originalX;
        } else if (autoOffset) {
          const siblings = parentChildren.filter((s: any) => s.id !== c.id);
          if (siblings.length > 0) {
            const last = siblings[siblings.length - 1];
            if (typeof last.x === "number" && typeof last.width === "number") {
              sceneNode.x = last.x + last.width + 80;
            }
          }
        }

        if (explicitY !== null) {
          sceneNode.y = explicitY;
        } else if (mode === "replace" && hadOriginalPos) {
          sceneNode.y = originalY;
        }
      }

      figma.commitUndo();

      const result = { created, nodeCount: countNodes(created) };
      if (p.requestId) {
        completedRequests.set(p.requestId, result);
        // Keep cache bounded — remove oldest entries if >100
        if (completedRequests.size > 100) {
          const firstKey = completedRequests.keys().next().value;
          completedRequests.delete(firstKey);
        }
      }

      return {
        type: request.type,
        requestId: request.requestId,
        data: result,
      };
    }

    case "write_html_batch": {
      const p = request.params || {};
      // Idempotency: if this requestId was already completed, return cached result
      if (p.requestId && completedRequests.has(p.requestId)) {
        return {
          type: request.type,
          requestId: request.requestId,
          data: completedRequests.get(p.requestId),
        };
      }

      const slides = p.slides as Array<{ name: string; html: string }>;
      const frameWidth = p.frameWidth || 1080;
      const frameHeight = p.frameHeight || 1350;
      const spacing = p.spacing || 80;
      const startX = p.startX || 0;
      const startY = p.startY || 0;
      const styleMapping: StyleMapping = p.styleMapping || {};

      if (!slides || slides.length === 0) throw new Error("slides array is required");

      const parent = await getParentNode(p.parentId);
      const results: Array<{ name: string; frameId: string; children: CreatedNode[]; bounds: any }> = [];

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const x = startX + i * (frameWidth + spacing);

        // Create the slide frame
        const frame = figma.createFrame();
        frame.resize(frameWidth, frameHeight);
        frame.x = x;
        frame.y = startY;
        frame.name = slide.name || `Slide ${i + 1}`;
        frame.fills = [makeSolidPaint("#FFFFFF")];
        frame.clipsContent = true;

        (parent as any).appendChild(frame);

        // Parse and create children from HTML
        const parsedNodes = parseHTML(slide.html);
        const created: CreatedNode[] = [];
        for (const parsed of parsedNodes) {
          const node = await createFigmaNode(parsed, frame, styleMapping);
          if (node) created.push(node);
        }

        results.push({
          name: frame.name,
          frameId: frame.id,
          children: created,
          bounds: getBounds(frame),
        });
      }

      figma.commitUndo();

      const batchResult = { slides: results, totalSlides: results.length };
      if (p.requestId) {
        completedRequests.set(p.requestId, batchResult);
        // Keep cache bounded — remove oldest entries if >100
        if (completedRequests.size > 100) {
          const firstKey = completedRequests.keys().next().value;
          completedRequests.delete(firstKey);
        }
      }

      return {
        type: request.type,
        requestId: request.requestId,
        data: batchResult,
      };
    }

    case "get_html": {
      const p = request.params || {};
      const nodeId = request.nodeIds && request.nodeIds[0];
      if (!nodeId) throw new Error("nodeId is required");

      const node = await figma.getNodeByIdAsync(nodeId);
      if (!node) throw new Error(`Node not found: ${nodeId}`);

      const maxDepth = p.depth || 10;
      const html = await nodeToHTML(node as SceneNode, 0, maxDepth);

      return {
        type: request.type,
        requestId: request.requestId,
        data: {
          html: html.trim(),
          nodeId,
          nodeName: node.name,
        },
      };
    }

    default:
      return null;
  }
};

function countNodes(nodes: CreatedNode[]): number {
  let count = 0;
  for (const n of nodes) {
    count++;
    if (n.children) count += countNodes(n.children);
  }
  return count;
}

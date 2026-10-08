/**
 * edit.ts — Category A: edit-not-rewrite tools.
 *
 * Implements:
 *   update_node_props      — apply a batch of property updates atomically
 *   patch_html             — selector-based patch over a subtree
 *   inspect_node_as_html   — HTML + ID outline + style summary
 *   move_to_anchor         — relative positioning vs. another node
 */

import { getBounds } from "./serializers";
import { makeSolidPaint } from "./write-helpers";

// ── Shared property applier used by update_node_props and patch_html ─────────

interface PropApplyResult {
  applied: string[];
  errors: string[];
}

async function applyPropsToNode(
  node: any,
  props: Record<string, any>
): Promise<PropApplyResult> {
  const applied: string[] = [];
  const errors: string[] = [];

  const tryApply = async (key: string, fn: () => void | Promise<void>) => {
    try {
      await fn();
      applied.push(key);
    } catch (e) {
      errors.push(`${key}: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  if ("name" in props) await tryApply("name", () => { node.name = String(props.name); });
  if ("visible" in props) await tryApply("visible", () => { node.visible = !!props.visible; });
  if ("x" in props && "x" in node) await tryApply("x", () => { node.x = Number(props.x); });
  if ("y" in props && "y" in node) await tryApply("y", () => { node.y = Number(props.y); });
  if (("width" in props || "height" in props) && typeof node.resize === "function") {
    await tryApply("size", () => {
      const w = props.width != null ? Number(props.width) : node.width;
      const h = props.height != null ? Number(props.height) : node.height;
      node.resize(w, h);
    });
  }
  if ("opacity" in props && "opacity" in node) {
    await tryApply("opacity", () => { node.opacity = Number(props.opacity); });
  }
  if ("rotation" in props && "rotation" in node) {
    await tryApply("rotation", () => { node.rotation = Number(props.rotation); });
  }
  if ("cornerRadius" in props && "cornerRadius" in node) {
    await tryApply("cornerRadius", () => { node.cornerRadius = Number(props.cornerRadius); });
  }
  for (const corner of ["TopLeft", "TopRight", "BottomLeft", "BottomRight"]) {
    const k = `cornerRadius${corner.replace("Top", "T").replace("Bottom", "B").replace("Left", "L").replace("Right", "R")}`;
    if (k in props && `${corner.charAt(0).toLowerCase()}${corner.slice(1)}Radius` in node) {
      const figmaProp = `${corner.charAt(0).toLowerCase()}${corner.slice(1)}Radius`;
      await tryApply(k, () => { (node as any)[figmaProp] = Number(props[k]); });
    }
  }
  for (const k of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "itemSpacing"]) {
    if (k in props && k in node) {
      await tryApply(k, () => { (node as any)[k] = Number(props[k]); });
    }
  }
  if ("layoutSizingHorizontal" in props && "layoutSizingHorizontal" in node) {
    await tryApply("layoutSizingHorizontal", () => {
      (node as any).layoutSizingHorizontal = String(props.layoutSizingHorizontal);
    });
  }
  if ("layoutSizingVertical" in props && "layoutSizingVertical" in node) {
    await tryApply("layoutSizingVertical", () => {
      (node as any).layoutSizingVertical = String(props.layoutSizingVertical);
    });
  }
  if ("textAutoResize" in props && node.type === "TEXT") {
    await tryApply("textAutoResize", () => { node.textAutoResize = String(props.textAutoResize); });
  }

  if ("fillColor" in props && "fills" in node) {
    await tryApply("fillColor", () => {
      const opacity = props.fillOpacity != null ? Number(props.fillOpacity) : undefined;
      (node as any).fills = [makeSolidPaint(String(props.fillColor), opacity)];
    });
  }
  if ("strokeColor" in props && "strokes" in node) {
    await tryApply("strokeColor", () => {
      (node as any).strokes = [makeSolidPaint(String(props.strokeColor))];
    });
  }
  if ("strokeWeight" in props && "strokeWeight" in node) {
    await tryApply("strokeWeight", () => { (node as any).strokeWeight = Number(props.strokeWeight); });
  }

  // Text-specific updates — order matters: load font BEFORE any text-property change.
  // BUG 1 fix (v1.3.1): previously fontSize was set without loading the font first,
  // causing silent "font not loaded" errors that never surfaced — patch_html
  // reported applied:0 even though the selector matched correctly.
  if (node.type === "TEXT") {
    const hasAnyTextProp =
      "text" in props || "fontSize" in props || "fontFamily" in props || "fontWeight" in props;

    if (hasAnyTextProp) {
      const fontName = typeof node.fontName === "symbol"
        ? { family: "Inter", style: "Regular" }
        : node.fontName;

      let nextFamily = fontName.family;
      let nextStyle = fontName.style;
      let needsFontReload = false;
      if ("fontFamily" in props) {
        nextFamily = String(props.fontFamily).replace(/['"]/g, "").split(",")[0].trim();
        needsFontReload = true;
      }
      if ("fontWeight" in props) {
        nextStyle = mapFontWeight(String(props.fontWeight));
        needsFontReload = true;
      }

      // Always load the (possibly new, possibly current) font BEFORE touching characters/fontSize.
      try {
        await figma.loadFontAsync({ family: nextFamily, style: nextStyle });
        if (needsFontReload) {
          node.fontName = { family: nextFamily, style: nextStyle };
          applied.push("fontName");
        }
      } catch (e) {
        errors.push(`fontName/load: ${e instanceof Error ? e.message : String(e)}`);
      }

      if ("text" in props) {
        try {
          node.characters = String(props.text);
          applied.push("text");
        } catch (e) {
          errors.push(`text: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      if ("fontSize" in props) {
        await tryApply("fontSize", () => { node.fontSize = Number(props.fontSize); });
      }
    }
  }

  return { applied, errors };
}

function mapFontWeight(weight: string): string {
  const map: Record<string, string> = {
    "100": "Thin", "200": "Extra Light", "300": "Light",
    "400": "Regular", "500": "Medium", "600": "Semi Bold",
    "700": "Bold", "800": "Extra Bold", "900": "Black",
    normal: "Regular", bold: "Bold",
  };
  return map[weight] || weight; // pass-through if it's a named style like "Italic"
}

// ── Selector matcher for patch_html ──────────────────────────────────────────

interface ParsedSelector {
  type?: string;
  nameExact?: string;
  nameContains?: string;
  id?: string;
  matchAll?: boolean;
}

function parseSelector(raw: string): ParsedSelector[] {
  // Selectors can be combined with " | " for AND-style matching.
  return raw.split("|").map(part => part.trim()).map(part => {
    if (part === "*") return { matchAll: true };
    if (part.startsWith("type:")) return { type: part.slice(5).trim().toUpperCase() };
    if (part.startsWith("name:")) return { nameExact: part.slice(5).trim() };
    if (part.startsWith("name~:")) return { nameContains: part.slice(6).trim().toLowerCase() };
    if (part.startsWith("id:")) return { id: part.slice(3).trim() };
    return { nameContains: part.toLowerCase() };
  });
}

function selectorMatches(node: any, selectors: ParsedSelector[]): boolean {
  // All selectors must match (AND semantics)
  for (const s of selectors) {
    if (s.matchAll) continue;
    if (s.type && node.type !== s.type) return false;
    if (s.nameExact && node.name !== s.nameExact) return false;
    if (s.nameContains && !String(node.name || "").toLowerCase().includes(s.nameContains)) return false;
    if (s.id && node.id !== s.id) return false;
  }
  return true;
}

function* walkSubtree(node: any): Generator<any> {
  yield node;
  if ("children" in node) {
    for (const child of node.children) {
      yield* walkSubtree(child);
    }
  }
}

// ── Style summary for inspect_node_as_html ───────────────────────────────────

function buildOutline(node: any, depth: number, maxDepth: number): any[] {
  const out: any[] = [];
  if (depth > maxDepth) return out;
  const summary: any = {
    nodeId: node.id,
    name: node.name,
    type: node.type,
    depth,
  };
  if ("layoutMode" in node && node.layoutMode !== "NONE") {
    summary.layoutMode = node.layoutMode;
    summary.itemSpacing = node.itemSpacing;
  }
  if ("width" in node) summary.width = Math.round(node.width);
  if ("height" in node) summary.height = Math.round(node.height);
  out.push(summary);
  if ("children" in node && depth < maxDepth) {
    for (const child of node.children) {
      out.push(...buildOutline(child, depth + 1, maxDepth));
    }
  }
  return out;
}

function summarizeStyles(node: any): any {
  const s: any = { nodeId: node.id };
  if ("fillStyleId" in node && node.fillStyleId && typeof node.fillStyleId !== "symbol") {
    s.fillStyleId = node.fillStyleId;
  }
  if ("strokeStyleId" in node && node.strokeStyleId) s.strokeStyleId = node.strokeStyleId;
  if ("textStyleId" in node && node.textStyleId && typeof node.textStyleId !== "symbol") {
    s.textStyleId = node.textStyleId;
  }
  return Object.keys(s).length > 1 ? s : null;
}

// ── Request handler ──────────────────────────────────────────────────────────

export const handleEditRequest = async (request: any) => {
  switch (request.type) {
    case "update_node_props": {
      const updates = (request.params?.updates || []) as Array<{ nodeId: string; props: Record<string, any> }>;
      const results: any[] = [];
      let appliedCount = 0;
      let failedCount = 0;
      for (const u of updates) {
        try {
          const node = await figma.getNodeByIdAsync(u.nodeId);
          if (!node) {
            results.push({ nodeId: u.nodeId, success: false, error: "Node not found" });
            failedCount++;
            continue;
          }
          const res = await applyPropsToNode(node as any, u.props || {});
          results.push({
            nodeId: u.nodeId,
            success: res.errors.length === 0,
            applied: res.applied,
            ...(res.errors.length ? { errors: res.errors } : {}),
          });
          if (res.errors.length === 0) appliedCount++; else failedCount++;
        } catch (e) {
          results.push({ nodeId: u.nodeId, success: false, error: e instanceof Error ? e.message : String(e) });
          failedCount++;
        }
      }
      figma.commitUndo();
      return {
        type: request.type,
        requestId: request.requestId,
        data: { applied: appliedCount, failed: failedCount, results },
      };
    }

    case "patch_html": {
      const targetId = request.nodeIds && request.nodeIds[0];
      if (!targetId) throw new Error("targetNodeId is required");
      const target = await figma.getNodeByIdAsync(targetId);
      if (!target) throw new Error(`Target node not found: ${targetId}`);
      const patches = (request.params?.patches || []) as Array<{ selector: string; props: Record<string, any> }>;
      const results: any[] = [];
      let totalMatched = 0;
      let totalAppliedAny = 0;
      let totalAppliedAll = 0;

      for (const patch of patches) {
        const sel = parseSelector(patch.selector || "");
        const perNode: any[] = [];
        for (const node of walkSubtree(target)) {
          if (selectorMatches(node, sel)) {
            const res = await applyPropsToNode(node, patch.props || {});
            // BUG 1 fix (v1.3.1): surface per-node applied/errors so silent
            // failures (e.g. fontSize on unloaded font) are visible.
            const entry: any = {
              nodeId: (node as any).id,
              name: (node as any).name,
              applied: res.applied,
            };
            if (res.errors.length > 0) entry.errors = res.errors;
            perNode.push(entry);
            if (res.applied.length > 0) totalAppliedAny++;
            if (res.errors.length === 0) totalAppliedAll++;
          }
        }
        totalMatched += perNode.length;
        results.push({
          selector: patch.selector,
          matchedCount: perNode.length,
          nodes: perNode,
          // Keep the legacy nodeIds field for backwards-compat with v1.3.0
          nodeIds: perNode.map(n => n.nodeId),
        });
      }
      figma.commitUndo();
      return {
        type: request.type,
        requestId: request.requestId,
        data: {
          matched: totalMatched,
          // applied = nodes where ALL props applied (legacy semantic)
          applied: totalAppliedAll,
          // appliedPartial = nodes where AT LEAST ONE prop applied (more useful)
          appliedPartial: totalAppliedAny,
          results,
        },
      };
    }

    case "inspect_node_as_html": {
      const nodeId = request.nodeIds && request.nodeIds[0];
      if (!nodeId) throw new Error("nodeId is required");
      const node = await figma.getNodeByIdAsync(nodeId);
      if (!node) throw new Error(`Node not found: ${nodeId}`);
      const maxDepth = (request.params?.depth as number) || 6;

      // Reuse get_html via the existing handler — we forward to the same engine.
      const { handleWriteHtmlRequest } = await import("./write-html");
      const htmlRes = await handleWriteHtmlRequest({
        type: "get_html",
        requestId: request.requestId,
        nodeIds: [nodeId],
        params: { depth: maxDepth },
      });
      const html = htmlRes?.data?.html || "";

      const outline = buildOutline(node, 0, maxDepth);
      const styles: any[] = [];
      for (const n of walkSubtree(node)) {
        const s = summarizeStyles(n);
        if (s) styles.push(s);
      }

      return {
        type: request.type,
        requestId: request.requestId,
        data: {
          nodeId,
          name: (node as any).name,
          type: (node as any).type,
          html,
          outline,
          boundStyles: styles,
        },
      };
    }

    case "move_to_anchor": {
      const nodeId = request.nodeIds && request.nodeIds[0];
      if (!nodeId) throw new Error("nodeId is required");
      const node = await figma.getNodeByIdAsync(nodeId) as any;
      if (!node) throw new Error(`Node not found: ${nodeId}`);
      const anchorId = request.params?.anchorId as string;
      if (!anchorId) throw new Error("anchorId is required");
      const anchor = await figma.getNodeByIdAsync(anchorId) as any;
      if (!anchor) throw new Error(`Anchor not found: ${anchorId}`);
      const mode = String(request.params?.mode || "");
      const gap = Number(request.params?.gap || 0);

      switch (mode) {
        case "align-left": node.x = anchor.x + gap; break;
        case "align-right": node.x = anchor.x + anchor.width - node.width - gap; break;
        case "align-center-x": node.x = anchor.x + (anchor.width - node.width) / 2 + gap; break;
        case "align-top": node.y = anchor.y + gap; break;
        case "align-bottom": node.y = anchor.y + anchor.height - node.height - gap; break;
        case "align-center-y": node.y = anchor.y + (anchor.height - node.height) / 2 + gap; break;
        case "above": node.y = anchor.y - node.height - gap; break;
        case "below": node.y = anchor.y + anchor.height + gap; break;
        case "left-of": node.x = anchor.x - node.width - gap; break;
        case "right-of": node.x = anchor.x + anchor.width + gap; break;
        default: throw new Error(`Unknown mode: ${mode}`);
      }

      figma.commitUndo();
      return {
        type: request.type,
        requestId: request.requestId,
        data: { nodeId: node.id, x: node.x, y: node.y, mode, anchorId },
      };
    }

    default:
      return null;
  }
};

/**
 * diagnostics.ts — Category H: agent-friendly observability.
 *
 *   health_check
 *   get_recent_errors
 *   explain_node
 *
 * Also exports recordError(tool, message) so other handlers can register
 * silent failures (failed style bindings, font load errors, etc.).
 */

const PLUGIN_VERSION = "1.3.0"; // bumped when toolkit overhaul lands

interface ErrorEntry {
  tool: string;
  message: string;
  timestamp: number;
}

const errorBuffer: ErrorEntry[] = [];
const ERROR_BUFFER_MAX = 50;

export function recordError(tool: string, message: string): void {
  errorBuffer.push({ tool, message, timestamp: Date.now() });
  if (errorBuffer.length > ERROR_BUFFER_MAX) {
    errorBuffer.splice(0, errorBuffer.length - ERROR_BUFFER_MAX);
  }
}

// ── Helpers for explain_node ─────────────────────────────────────────────────

function inferRole(node: any): string {
  if (node.type === "TEXT") {
    const fs = typeof node.fontSize === "number" ? node.fontSize : 16;
    if (fs >= 64) return "Display heading";
    if (fs >= 40) return "Section heading";
    if (fs >= 24) return "Subheading";
    if (fs >= 16) return "Body text";
    return "Caption / label";
  }
  if (node.type === "RECTANGLE" || node.type === "ELLIPSE") {
    if (Array.isArray(node.fills) && node.fills[0]?.type === "IMAGE") return "Image";
    if (typeof node.cornerRadius === "number" && node.cornerRadius > 0 && node.width < 200 && node.height < 80) return "Pill / button background";
    return node.type === "ELLIPSE" ? "Decorative ellipse" : "Decorative shape";
  }
  if (node.type === "INSTANCE") return "Component instance";
  if (node.type === "COMPONENT") return "Component master";
  if (node.type === "FRAME") {
    const w = node.width, h = node.height;
    if (w === 1080 && h === 1350) return "Instagram carousel slide";
    if (w === 1080 && h === 1080) return "Instagram square post";
    if ("children" in node && node.children.length === 0) return "Empty container";
    if ("layoutMode" in node && node.layoutMode !== "NONE") return "Auto-layout container";
    return "Container frame";
  }
  return node.type;
}

function paintToHex(p: any): string {
  const c = p.color || { r: 0, g: 0, b: 0 };
  const h = (n: number) => Math.round(n * 255).toString(16).padStart(2, "0");
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`.toUpperCase();
}

function describeProps(node: any): Record<string, any> {
  const p: Record<string, any> = {
    type: node.type,
    name: node.name,
  };
  if ("width" in node) p.width = Math.round(node.width);
  if ("height" in node) p.height = Math.round(node.height);
  if (node.type === "TEXT") {
    p.text = node.characters?.slice(0, 80);
    p.fontSize = typeof node.fontSize === "number" ? node.fontSize : "mixed";
    if (typeof node.fontName !== "symbol" && node.fontName) {
      p.font = `${node.fontName.family} ${node.fontName.style}`;
    }
  }
  if ("fills" in node) {
    const fills = node.fills;
    if (Array.isArray(fills) && fills.length > 0) {
      if (fills[0].type === "SOLID") p.fillColor = paintToHex(fills[0]);
      else if (fills[0].type === "IMAGE") p.fillType = "IMAGE";
      else p.fillType = fills[0].type;
    }
  }
  if (node.fillStyleId && typeof node.fillStyleId !== "symbol") p.fillStyleId = node.fillStyleId;
  if (node.textStyleId && typeof node.textStyleId !== "symbol") p.textStyleId = node.textStyleId;
  if ("layoutMode" in node && node.layoutMode !== "NONE") p.layoutMode = node.layoutMode;
  return p;
}

// ── Request handler ──────────────────────────────────────────────────────────

export const handleDiagnosticsRequest = async (request: any) => {
  switch (request.type) {

    case "health_check": {
      const fonts = await figma.listAvailableFontsAsync();
      const families = new Set<string>();
      for (const f of fonts) families.add(f.fontName.family);
      let styleCount = 0;
      let variableCount = 0;
      try {
        const allStyles = [
          ...(await figma.getLocalPaintStylesAsync()),
          ...(await figma.getLocalTextStylesAsync()),
          ...(await figma.getLocalEffectStylesAsync()),
          ...(await figma.getLocalGridStylesAsync()),
        ];
        styleCount = allStyles.length;
      } catch (_) { /* older Figma API */ }
      try {
        const cols = await figma.variables.getLocalVariableCollectionsAsync();
        for (const c of cols) variableCount += c.variableIds.length;
      } catch (_) { /* skip */ }

      return {
        type: request.type,
        requestId: request.requestId,
        data: {
          ok: true,
          version: PLUGIN_VERSION,
          fileName: figma.root.name,
          pageName: figma.currentPage.name,
          fontFamilyCount: families.size,
          styleCount,
          variableCount,
          recentErrorCount: errorBuffer.length,
        },
      };
    }

    case "get_recent_errors": {
      const limit = (request.params?.limit as number) || 20;
      const slice = errorBuffer.slice(-limit).reverse();
      return {
        type: request.type,
        requestId: request.requestId,
        data: { errors: slice, total: errorBuffer.length },
      };
    }

    case "explain_node": {
      const nodeId = request.nodeIds && request.nodeIds[0];
      if (!nodeId) throw new Error("nodeId is required");
      const node = await figma.getNodeByIdAsync(nodeId) as any;
      if (!node) throw new Error(`Node not found: ${nodeId}`);

      const role = inferRole(node);
      const props = describeProps(node);

      // Compose a sentence
      const parts: string[] = [];
      parts.push(`This is a ${role.toLowerCase()} named "${node.name}" of type ${node.type}.`);
      if (node.type === "TEXT") {
        parts.push(`Text content: "${(node.characters || "").slice(0, 60)}". Font size ${props.fontSize}px.`);
      }
      if ("width" in node) {
        parts.push(`Size ${Math.round(node.width)}×${Math.round(node.height)}.`);
      }
      if (node.fillStyleId && typeof node.fillStyleId !== "symbol") {
        parts.push(`Bound to a fill style.`);
      }
      if (node.parent) {
        parts.push(`Parented to "${(node.parent as any).name}" (${(node.parent as any).type}).`);
      }
      if ("children" in node && node.children.length > 0) {
        parts.push(`Has ${node.children.length} child node(s).`);
      }

      return {
        type: request.type,
        requestId: request.requestId,
        data: {
          nodeId,
          role,
          summary: parts.join(" "),
          properties: props,
        },
      };
    }

    default:
      return null;
  }
};

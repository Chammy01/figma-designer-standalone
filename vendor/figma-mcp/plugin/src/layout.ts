/**
 * layout.ts — Category C: Layout Intelligence.
 *
 *   auto_layout_from_positions  — convert absolute positions to auto-layout
 *   align_nodes                 — align selected nodes
 *   distribute_nodes            — distribute selected nodes evenly
 *   pack_grid                   — pack into N-column grid
 */

interface NodeBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  node: any;
}

async function loadBoxes(ids: string[]): Promise<NodeBox[]> {
  const out: NodeBox[] = [];
  for (const id of ids) {
    const n = await figma.getNodeByIdAsync(id);
    if (!n || !("x" in n)) continue;
    const a = n as any;
    out.push({ id, x: a.x, y: a.y, width: a.width, height: a.height, node: a });
  }
  return out;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export const handleLayoutRequest = async (request: any) => {
  switch (request.type) {

    case "auto_layout_from_positions": {
      const nodeId = request.nodeIds && request.nodeIds[0];
      if (!nodeId) throw new Error("nodeId is required");
      const node = await figma.getNodeByIdAsync(nodeId) as any;
      if (!node) throw new Error(`Node not found: ${nodeId}`);
      if (!("layoutMode" in node) || !("children" in node)) {
        throw new Error("Node must be a frame with children");
      }
      const dryRun = !!request.params?.dryRun;
      const children = (node.children as any[])
        .filter(c => "x" in c && "y" in c)
        .sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
      if (children.length < 2) throw new Error("Need at least 2 children to infer layout");

      const ys = children.map(c => c.y);
      const xs = children.map(c => c.x);
      const yRange = Math.max(...ys) - Math.min(...ys);
      const xRange = Math.max(...xs) - Math.min(...xs);

      // If children's Ys are tightly clustered → row. Else → column.
      const isRow = yRange < xRange / 2;
      const layoutMode = isRow ? "HORIZONTAL" : "VERTICAL";

      // Spacing from median gap
      let gaps: number[] = [];
      if (isRow) {
        for (let i = 1; i < children.length; i++) {
          gaps.push(children[i].x - (children[i - 1].x + children[i - 1].width));
        }
      } else {
        for (let i = 1; i < children.length; i++) {
          gaps.push(children[i].y - (children[i - 1].y + children[i - 1].height));
        }
      }
      const itemSpacing = Math.max(0, Math.round(median(gaps)));

      const paddingTop = Math.max(0, Math.round(Math.min(...ys)));
      const paddingLeft = Math.max(0, Math.round(Math.min(...xs)));

      const inferred = { layoutMode, itemSpacing, paddingTop, paddingLeft };

      if (!dryRun) {
        node.layoutMode = layoutMode;
        node.itemSpacing = itemSpacing;
        node.paddingTop = paddingTop;
        node.paddingLeft = paddingLeft;
        // Conservative defaults for the other axes
        if (typeof node.paddingBottom === "number") node.paddingBottom = paddingTop;
        if (typeof node.paddingRight === "number") node.paddingRight = paddingLeft;
        figma.commitUndo();
      }

      return {
        type: request.type,
        requestId: request.requestId,
        data: {
          nodeId,
          dryRun,
          inferred,
          childOrder: children.map(c => c.id),
        },
      };
    }

    case "align_nodes": {
      const ids = (request.nodeIds || []) as string[];
      const mode = request.params?.mode as string;
      const refId = request.params?.referenceNodeId as string | undefined;
      const boxes = await loadBoxes(ids);
      if (boxes.length < 2) throw new Error("at least 2 nodes required");

      let refBox: NodeBox;
      if (refId) {
        const r = boxes.find(b => b.id === refId);
        if (!r) throw new Error(`referenceNodeId ${refId} not in nodeIds`);
        refBox = r;
      } else {
        // Bounding box reference
        const minX = Math.min(...boxes.map(b => b.x));
        const minY = Math.min(...boxes.map(b => b.y));
        const maxX = Math.max(...boxes.map(b => b.x + b.width));
        const maxY = Math.max(...boxes.map(b => b.y + b.height));
        refBox = { id: "__bbox__", x: minX, y: minY, width: maxX - minX, height: maxY - minY, node: null };
      }

      const results: any[] = [];
      for (const b of boxes) {
        let nx = b.x, ny = b.y;
        switch (mode) {
          case "left": nx = refBox.x; break;
          case "right": nx = refBox.x + refBox.width - b.width; break;
          case "center-x": nx = refBox.x + (refBox.width - b.width) / 2; break;
          case "top": ny = refBox.y; break;
          case "bottom": ny = refBox.y + refBox.height - b.height; break;
          case "center-y": ny = refBox.y + (refBox.height - b.height) / 2; break;
          default: throw new Error(`unknown mode: ${mode}`);
        }
        b.node.x = nx;
        b.node.y = ny;
        results.push({ nodeId: b.id, x: nx, y: ny });
      }
      figma.commitUndo();
      return {
        type: request.type,
        requestId: request.requestId,
        data: { mode, results },
      };
    }

    case "distribute_nodes": {
      const ids = (request.nodeIds || []) as string[];
      const mode = request.params?.mode as string;
      const gap = request.params?.gap as number | undefined;
      const boxes = await loadBoxes(ids);
      if (boxes.length < 3) throw new Error("at least 3 nodes required");

      const isHorizontal = mode === "horizontal-spacing" || mode === "horizontal-centers";
      const sorted = [...boxes].sort((a, b) =>
        isHorizontal ? a.x - b.x : a.y - b.y
      );

      const results: any[] = [];
      if (mode === "horizontal-spacing" || mode === "vertical-spacing") {
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const totalSpan = isHorizontal
          ? last.x + last.width - first.x
          : last.y + last.height - first.y;
        const totalSize = sorted.reduce((s, b) => s + (isHorizontal ? b.width : b.height), 0);
        const spacing = gap != null ? gap : (totalSpan - totalSize) / (sorted.length - 1);
        let cursor = isHorizontal ? first.x : first.y;
        for (let i = 0; i < sorted.length; i++) {
          const b = sorted[i];
          if (isHorizontal) { b.node.x = cursor; cursor += b.width + spacing; }
          else { b.node.y = cursor; cursor += b.height + spacing; }
          results.push({ nodeId: b.id, x: b.node.x, y: b.node.y });
        }
      } else if (mode === "horizontal-centers" || mode === "vertical-centers") {
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const firstCenter = isHorizontal ? first.x + first.width / 2 : first.y + first.height / 2;
        const lastCenter = isHorizontal ? last.x + last.width / 2 : last.y + last.height / 2;
        const stride = (lastCenter - firstCenter) / (sorted.length - 1);
        for (let i = 0; i < sorted.length; i++) {
          const b = sorted[i];
          const center = firstCenter + i * stride;
          if (isHorizontal) b.node.x = center - b.width / 2;
          else b.node.y = center - b.height / 2;
          results.push({ nodeId: b.id, x: b.node.x, y: b.node.y });
        }
      } else {
        throw new Error(`unknown mode: ${mode}`);
      }

      figma.commitUndo();
      return {
        type: request.type,
        requestId: request.requestId,
        data: { mode, gap, results },
      };
    }

    case "pack_grid": {
      const ids = (request.nodeIds || []) as string[];
      const columns = (request.params?.columns as number) || 1;
      const gap = (request.params?.gap as number) ?? 24;
      const startX = (request.params?.startX as number) ?? 0;
      const startY = (request.params?.startY as number) ?? 0;
      const boxes = await loadBoxes(ids);
      if (boxes.length === 0) throw new Error("no nodes to pack");

      const colWidth = Math.max(...boxes.map(b => b.width));
      const rowHeights: number[] = [];
      for (let i = 0; i < boxes.length; i += columns) {
        const row = boxes.slice(i, i + columns);
        rowHeights.push(Math.max(...row.map(b => b.height)));
      }

      const results: any[] = [];
      for (let i = 0; i < boxes.length; i++) {
        const col = i % columns;
        const row = Math.floor(i / columns);
        const x = startX + col * (colWidth + gap);
        const y = startY + rowHeights.slice(0, row).reduce((s, h) => s + h + gap, 0);
        boxes[i].node.x = x;
        boxes[i].node.y = y;
        results.push({ nodeId: boxes[i].id, x, y, row, col });
      }

      figma.commitUndo();
      return {
        type: request.type,
        requestId: request.requestId,
        data: {
          columns,
          rows: rowHeights.length,
          gap,
          colWidth,
          rowHeights,
          results,
        },
      };
    }

    default:
      return null;
  }
};

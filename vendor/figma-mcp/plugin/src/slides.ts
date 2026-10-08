/**
 * slides.ts — Category G: slide / carousel ergonomics.
 *
 *   slide_template
 *   regenerate_slide
 *   make_slide_grid
 *   list_slides
 */

import { getBounds } from "./serializers";
import { getParentNode } from "./write-helpers";

// ── Built-in templates ───────────────────────────────────────────────────────

interface Template {
  name: string;
  description: string;
  slots: string[];
  build: (slots: Record<string, string>, w: number, h: number) => string;
}

const TEMPLATES: Record<string, Template> = {
  cover: {
    name: "cover",
    description: "Big title + tagline + handle. Slots: title, tagline, handle.",
    slots: ["title", "tagline", "handle"],
    build: (s, w, h) => `
<div style="width:${w}px; height:${h}px; background:#FDF4E3;" layer-name="Cover">
  <p style="position:absolute; left:70px; top:160px; font-family:Outfit; font-weight:500; font-size:96px; color:#134686;" layer-name="Title">${escape(s.title || "Title")}</p>
  <p style="position:absolute; left:70px; top:300px; font-family:Inter; font-size:32px; color:#666;" layer-name="Tagline">${escape(s.tagline || "Tagline")}</p>
  <p style="position:absolute; left:70px; top:${h - 90}px; font-family:Inter; font-size:24px; color:#134686;" layer-name="Handle">${escape(s.handle || "@handle")}</p>
</div>`.trim(),
  },
  quote: {
    name: "quote",
    description: "Centered pull-quote + attribution. Slots: quote, attribution.",
    slots: ["quote", "attribution"],
    build: (s, w, h) => `
<div style="width:${w}px; height:${h}px; background:#FFFFFF;" layer-name="Quote">
  <p style="position:absolute; left:80px; top:${Math.round(h/2 - 80)}px; width:${w - 160}px; font-family:Outfit; font-weight:500; font-size:60px; color:#000; text-align:center;" layer-name="Quote text">"${escape(s.quote || "Quote text here.")}"</p>
  <p style="position:absolute; left:80px; top:${Math.round(h/2 + 100)}px; width:${w - 160}px; font-family:Inter; font-size:24px; color:#666; text-align:center;" layer-name="Attribution">— ${escape(s.attribution || "Attribution")}</p>
</div>`.trim(),
  },
  "list-3": {
    name: "list-3",
    description: "Heading + 3 bullets. Slots: title, item1, item2, item3.",
    slots: ["title", "item1", "item2", "item3"],
    build: (s, w, h) => `
<div style="width:${w}px; height:${h}px; background:#FDF4E3;" layer-name="List 3">
  <p style="position:absolute; left:70px; top:120px; font-family:Outfit; font-weight:500; font-size:64px; color:#134686;" layer-name="Title">${escape(s.title || "Title")}</p>
  <p style="position:absolute; left:70px; top:340px; font-family:Inter; font-size:36px; color:#000;" layer-name="Item 1">1. ${escape(s.item1 || "First item")}</p>
  <p style="position:absolute; left:70px; top:480px; font-family:Inter; font-size:36px; color:#000;" layer-name="Item 2">2. ${escape(s.item2 || "Second item")}</p>
  <p style="position:absolute; left:70px; top:620px; font-family:Inter; font-size:36px; color:#000;" layer-name="Item 3">3. ${escape(s.item3 || "Third item")}</p>
</div>`.trim(),
  },
  comparison: {
    name: "comparison",
    description: "Two columns side by side. Slots: leftTitle, leftBody, rightTitle, rightBody.",
    slots: ["leftTitle", "leftBody", "rightTitle", "rightBody"],
    build: (s, w, h) => {
      const colW = Math.round((w - 70 * 3) / 2);
      return `
<div style="width:${w}px; height:${h}px; background:#FFFFFF;" layer-name="Comparison">
  <div style="position:absolute; left:70px; top:120px; width:${colW}px;" layer-name="Left col">
    <p style="font-family:Outfit; font-weight:500; font-size:48px; color:#134686;" layer-name="Left title">${escape(s.leftTitle || "Left")}</p>
    <p style="font-family:Inter; font-size:28px; color:#000; margin-top:24px;" layer-name="Left body">${escape(s.leftBody || "Left body")}</p>
  </div>
  <div style="position:absolute; left:${70 + colW + 70}px; top:120px; width:${colW}px;" layer-name="Right col">
    <p style="font-family:Outfit; font-weight:500; font-size:48px; color:#FF6B6B;" layer-name="Right title">${escape(s.rightTitle || "Right")}</p>
    <p style="font-family:Inter; font-size:28px; color:#000; margin-top:24px;" layer-name="Right body">${escape(s.rightBody || "Right body")}</p>
  </div>
</div>`.trim();
    },
  },
  cta: {
    name: "cta",
    description: "Big call-to-action + supporting text. Slots: title, body, cta, handle.",
    slots: ["title", "body", "cta", "handle"],
    build: (s, w, h) => `
<div style="width:${w}px; height:${h}px; background:#134686;" layer-name="CTA">
  <p style="position:absolute; left:70px; top:200px; font-family:Outfit; font-weight:500; font-size:88px; color:#FDF4E3;" layer-name="Title">${escape(s.title || "Follow for more")}</p>
  <p style="position:absolute; left:70px; top:${Math.round(h/2)}px; width:${w - 140}px; font-family:Inter; font-size:30px; color:#FDF4E3; opacity:0.8;" layer-name="Body">${escape(s.body || "Body copy supporting the CTA.")}</p>
  <p style="position:absolute; left:70px; top:${h - 220}px; font-family:Outfit; font-weight:500; font-size:48px; color:#FDF4E3;" layer-name="CTA">${escape(s.cta || "→ ${call to action}")}</p>
  <p style="position:absolute; left:70px; top:${h - 90}px; font-family:Inter; font-size:24px; color:#FDF4E3;" layer-name="Handle">${escape(s.handle || "@handle")}</p>
</div>`.trim(),
  },
};

function escape(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const handleSlideRequest = async (request: any) => {
  switch (request.type) {

    case "slide_template": {
      const action = request.params?.action as string;

      if (action === "list") {
        return {
          type: request.type,
          requestId: request.requestId,
          data: {
            templates: Object.values(TEMPLATES).map(t => ({
              name: t.name,
              description: t.description,
              slots: t.slots,
            })),
          },
        };
      }

      const tname = request.params?.template as string;
      const tmpl = TEMPLATES[tname];
      if (!tmpl) throw new Error(`Unknown template: ${tname}`);

      const w = (request.params?.frameWidth as number) || 1080;
      const h = (request.params?.frameHeight as number) || 1350;
      const slots = (request.params?.slots as Record<string, string>) || {};
      const html = tmpl.build(slots, w, h);

      if (action === "preview") {
        return {
          type: request.type,
          requestId: request.requestId,
          data: { template: tname, html, slots: tmpl.slots },
        };
      }

      // instantiate: create a slide frame and write the template into it
      const parent = await getParentNode(request.params?.parentId);
      const frame = figma.createFrame();
      frame.resize(w, h);
      frame.name = `${tname[0].toUpperCase() + tname.slice(1)} slide`;
      frame.x = (request.params?.x as number) || 0;
      frame.y = (request.params?.y as number) || 0;
      (parent as any).appendChild(frame);

      const { handleWriteHtmlRequest } = await import("./write-html");
      const writeRes = await handleWriteHtmlRequest({
        type: "write_html",
        requestId: request.requestId,
        nodeIds: [frame.id],
        params: {
          html,
          targetNodeId: frame.id,
          mode: "insert-children",
          styleMapping: request.params?.styleMapping || {},
        },
      });

      figma.commitUndo();
      return {
        type: request.type,
        requestId: request.requestId,
        data: {
          frameId: frame.id,
          template: tname,
          bounds: getBounds(frame),
          children: writeRes?.data?.created || [],
        },
      };
    }

    case "regenerate_slide": {
      const frameId = request.nodeIds && request.nodeIds[0];
      const frame = await figma.getNodeByIdAsync(frameId) as any;
      if (!frame || frame.type !== "FRAME") throw new Error(`Not a FRAME: ${frameId}`);
      const html = request.params?.html as string;
      const preserveBg = request.params?.preserveBackground !== false;
      const oldFills = preserveBg ? JSON.parse(JSON.stringify(frame.fills)) : null;

      // Capture original position so we don't move the frame
      const origX = frame.x;
      const origY = frame.y;
      const origW = frame.width;
      const origH = frame.height;

      // BUG 3 fix (v1.3.1): TRANSACTIONAL regenerate.
      // Previous version removed children FIRST, then called write_html. If write_html
      // crashed (e.g. HUG sizing on a non-auto-layout child), the slide was left empty.
      // New flow: snapshot existing IDs, write new children APPENDED to the frame,
      // then remove the originals on success. On failure, remove the partial new
      // children and bubble the error — original slide is intact.
      const existingIds = new Set(frame.children.map((c: any) => c.id));

      const { handleWriteHtmlRequest } = await import("./write-html");
      let writeRes: any;
      try {
        writeRes = await handleWriteHtmlRequest({
          type: "write_html",
          requestId: request.requestId,
          nodeIds: [frame.id],
          params: {
            html,
            targetNodeId: frame.id,
            mode: "insert-children",
            styleMapping: request.params?.styleMapping || {},
          },
        });
      } catch (e) {
        // Roll back: remove any partial new children that did get created
        const partial = frame.children.filter((c: any) => !existingIds.has(c.id));
        for (const p of partial) {
          try { p.remove(); } catch (_) { /* ignore */ }
        }
        throw new Error(
          `regenerate_slide failed without modifying the original slide: ${e instanceof Error ? e.message : String(e)}`
        );
      }

      // Success — now safe to remove original children
      const removed: string[] = [];
      const original = frame.children.filter((c: any) => existingIds.has(c.id));
      for (const oc of original) {
        removed.push(oc.id);
        try { oc.remove(); } catch (_) { /* ignore */ }
      }

      // Restore fills if preserveBackground
      if (oldFills) frame.fills = oldFills;
      // Restore position/size (write_html may have modified them via inheritance)
      frame.x = origX;
      frame.y = origY;
      if (frame.width !== origW || frame.height !== origH) frame.resize(origW, origH);

      figma.commitUndo();
      return {
        type: request.type,
        requestId: request.requestId,
        data: {
          frameId,
          newChildren: writeRes?.data?.created || [],
          removedChildren: removed,
        },
      };
    }

    case "make_slide_grid": {
      const ids = (request.nodeIds || []) as string[];
      const columns = (request.params?.columns as number) || 4;
      const gap = (request.params?.gap as number) ?? 80;
      const startX = (request.params?.startX as number) ?? 0;
      const startY = (request.params?.startY as number) ?? 0;

      const arranged: any[] = [];
      let maxW = 0, maxH = 0;
      const frames: any[] = [];
      for (const id of ids) {
        const f = await figma.getNodeByIdAsync(id) as any;
        if (!f || !("x" in f)) continue;
        frames.push(f);
        maxW = Math.max(maxW, f.width);
        maxH = Math.max(maxH, f.height);
      }
      for (let i = 0; i < frames.length; i++) {
        const col = i % columns;
        const row = Math.floor(i / columns);
        const x = startX + col * (maxW + gap);
        const y = startY + row * (maxH + gap);
        frames[i].x = x;
        frames[i].y = y;
        arranged.push({ frameId: frames[i].id, x, y, row, col });
      }
      figma.commitUndo();
      return {
        type: request.type,
        requestId: request.requestId,
        data: {
          arranged,
          rows: Math.ceil(frames.length / columns),
          columns,
          cellSize: { width: maxW, height: maxH },
        },
      };
    }

    case "list_slides": {
      const parentId = request.params?.parentId as string | undefined;
      const filterW = request.params?.frameWidth as number | undefined;
      const filterH = request.params?.frameHeight as number | undefined;
      const parent: any = parentId
        ? await figma.getNodeByIdAsync(parentId)
        : figma.currentPage;
      if (!parent) throw new Error(`Parent not found: ${parentId}`);

      const candidates: any[] = ("children" in parent ? parent.children : [])
        .filter((c: any) => c.type === "FRAME");

      // If no explicit filter, infer dominant size
      let targetW = filterW, targetH = filterH;
      if (targetW == null || targetH == null) {
        const sizeCount = new Map<string, number>();
        for (const c of candidates) {
          const k = `${Math.round(c.width)}x${Math.round(c.height)}`;
          sizeCount.set(k, (sizeCount.get(k) || 0) + 1);
        }
        let best = "", bestN = 0;
        for (const [k, n] of sizeCount) {
          if (n > bestN) { best = k; bestN = n; }
        }
        const [w, h] = best.split("x").map(Number);
        if (targetW == null) targetW = w;
        if (targetH == null) targetH = h;
      }

      const slides = candidates
        .filter((c: any) => Math.round(c.width) === targetW && Math.round(c.height) === targetH)
        .sort((a: any, b: any) => a.x === b.x ? a.y - b.y : a.x - b.x)
        .map((c: any, idx: number) => ({
          frameId: c.id,
          name: c.name,
          x: c.x, y: c.y,
          width: c.width, height: c.height,
          index: idx,
        }));

      return {
        type: request.type,
        requestId: request.requestId,
        data: {
          slides,
          total: slides.length,
          dominantSize: { width: targetW, height: targetH },
        },
      };
    }

    default:
      return null;
  }
};

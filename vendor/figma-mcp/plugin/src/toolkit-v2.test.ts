/**
 * toolkit-v2.test.ts — smoke tests for the v1.3.0 toolkit overhaul (Categories A–H).
 *
 * These don't test every code path — they verify each new handler is wired
 * correctly and returns a sensible shape, so accidental import/registration
 * bugs are caught.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { handleEditRequest } from "./edit";
import { handleValidationRequest } from "./validation";
import { handleLayoutRequest } from "./layout";
import { handleStyleEcosystemRequest } from "./style-ecosystem";
import { handleSlideRequest } from "./slides";
import { handleDiagnosticsRequest, recordError } from "./diagnostics";

let mockNodes: Record<string, any>;
let createdFrames: any[];
let createdTexts: any[];
let createdRects: any[];

const makeRequest = (type: string, nodeIds?: string[], params?: any) => ({
  type, requestId: "req-test-1", nodeIds: nodeIds ?? [], params: params ?? {},
});

const makeFrame = (id: string, name: string = "Frame", overrides: any = {}) => {
  const children: any[] = [];
  return {
    id, name, type: "FRAME",
    x: 0, y: 0, width: 100, height: 100,
    fills: [], strokes: [], cornerRadius: 0,
    layoutMode: "NONE" as string, itemSpacing: 0,
    paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
    primaryAxisSizingMode: "FIXED",
    counterAxisSizingMode: "FIXED",
    layoutSizingHorizontal: "FIXED",
    layoutSizingVertical: "FIXED",
    visible: true, opacity: 1, rotation: 0,
    children, parent: null as any,
    resize(w: number, h: number) { this.width = w; this.height = h; },
    appendChild(c: any) { children.push(c); c.parent = this; },
    remove() {},
    ...overrides,
  };
};

beforeEach(() => {
  createdFrames = [];
  createdTexts = [];
  createdRects = [];
  mockNodes = {};

  (globalThis as any).figma = {
    get currentPage() {
      return { id: "0:1", name: "Page 1", children: [], appendChild(c: any) { this.children.push(c); } };
    },
    get root() {
      return {
        name: "Test File",
        children: [
          (() => { const p = (globalThis as any).figma.currentPage; return p; })(),
        ],
      };
    },
    getNodeByIdAsync: async (id: string) => mockNodes[id] ?? null,
    getStyleByIdAsync: async (_id: string) => null,
    listAvailableFontsAsync: async () => [
      { fontName: { family: "Inter", style: "Regular" } },
      { fontName: { family: "Outfit", style: "Medium" } },
    ],
    getLocalPaintStylesAsync: async () => [],
    getLocalTextStylesAsync: async () => [],
    getLocalEffectStylesAsync: async () => [],
    getLocalGridStylesAsync: async () => [],
    createFrame: () => {
      const f = makeFrame(`frame:${createdFrames.length}`);
      createdFrames.push(f);
      return f;
    },
    createText: () => {
      const t: any = {
        id: `text:${createdTexts.length}`,
        name: "Text", type: "TEXT",
        x: 0, y: 0, width: 100, height: 20,
        characters: "", fontName: { family: "Inter", style: "Regular" },
        fontSize: 14, fills: [],
        textAlignHorizontal: "LEFT", textAutoResize: "NONE",
        lineHeight: { unit: "AUTO" },
        letterSpacing: { value: 0, unit: "PIXELS" },
        opacity: 1, parent: null,
        resize(w: number, h: number) { this.width = w; this.height = h; },
        appendChild() {}, remove() {},
      };
      createdTexts.push(t);
      return t;
    },
    createRectangle: () => {
      const r: any = {
        id: `rect:${createdRects.length}`, name: "Rectangle", type: "RECTANGLE",
        x: 0, y: 0, width: 100, height: 100, fills: [], cornerRadius: 0,
        opacity: 1, resize(w: number, h: number) { this.width = w; this.height = h; },
        appendChild() {}, remove() {},
      };
      createdRects.push(r);
      return r;
    },
    createPaintStyle: () => {
      const s: any = { id: `style:p${Math.random()}`, name: "", paints: [], type: "PAINT" };
      return s;
    },
    createTextStyle: () => {
      const s: any = { id: `style:t${Math.random()}`, name: "", type: "TEXT" };
      return s;
    },
    loadFontAsync: async () => {},
    commitUndo: () => {},
    variables: {
      createVariableCollection: (name: string) => ({
        id: `coll:${name}`, name,
        modes: [{ modeId: "mode:default", name: "Default" }],
        variableIds: [],
      }),
      createVariable: (name: string, _coll: any, type: string) => ({
        id: `Var:${name}`, name, resolvedType: type,
        setValueForMode(_modeId: string, _value: any) {},
      }),
      getLocalVariableCollectionsAsync: async () => [],
      getVariableByIdAsync: async (_id: string) => null,
    },
    mixed: Symbol("mixed"),
  };
});

// ── Category A ───────────────────────────────────────────────────────────────
describe("Category A — edit-not-rewrite", () => {
  it("update_node_props applies fillColor and rotation", async () => {
    const f = makeFrame("1:1");
    mockNodes["1:1"] = f;
    const res = await handleEditRequest(makeRequest("update_node_props", [], {
      updates: [{ nodeId: "1:1", props: { fillColor: "#FF0080", rotation: 15 } }],
    }));
    expect(res?.data.applied).toBe(1);
    expect(res?.data.failed).toBe(0);
    expect(f.fills.length).toBeGreaterThan(0);
    expect(f.rotation).toBe(15);
  });

  it("patch_html applies props to children matching a name selector", async () => {
    const root = makeFrame("1:1", "Slide");
    const child = makeFrame("1:2", "Title", { width: 500, height: 60 });
    root.appendChild(child);
    mockNodes["1:1"] = root;
    const res = await handleEditRequest(makeRequest("patch_html", ["1:1"], {
      patches: [{ selector: "name:Title", props: { fillColor: "#000" } }],
    }));
    expect(res?.data.matched).toBeGreaterThan(0);
    expect(child.fills.length).toBeGreaterThan(0);
  });

  it("move_to_anchor below positions node under anchor with gap", async () => {
    const a = makeFrame("1:1", "Anchor", { x: 100, y: 100, width: 200, height: 80 });
    const n = makeFrame("1:2", "Mover", { width: 200, height: 60 });
    mockNodes["1:1"] = a; mockNodes["1:2"] = n;
    const res = await handleEditRequest(makeRequest("move_to_anchor", ["1:2"], {
      anchorId: "1:1", mode: "below", gap: 20,
    }));
    expect(res?.data.y).toBe(200); // anchor.y(100) + anchor.height(80) + gap(20) = 200
  });
});

// ── Category B ───────────────────────────────────────────────────────────────
describe("Category B — validation", () => {
  it("validate_html flags unsupported margin CSS", async () => {
    const res = await handleValidationRequest(makeRequest("validate_html", [], {
      html: '<div style="width:100px; margin:10px;">Hi</div>',
    }));
    expect(res?.data.warnings.some((w: any) => w.message.includes("margin"))).toBe(true);
  });

  it("validate_html collects fonts", async () => {
    const res = await handleValidationRequest(makeRequest("validate_html", [], {
      html: '<p style="font-family:Outfit; font-weight:500;">Hi</p><p style="font-family:Inter;">There</p>',
    }));
    const fonts = res?.data.fontsNeeded as any[];
    expect(fonts.some(f => f.family === "Outfit")).toBe(true);
    expect(fonts.some(f => f.family === "Inter")).toBe(true);
  });

  it("explain_layout returns a non-empty explanation", async () => {
    const f = makeFrame("1:1", "Container", { layoutMode: "VERTICAL", itemSpacing: 24, paddingTop: 50 });
    mockNodes["1:1"] = f;
    const res = await handleValidationRequest(makeRequest("explain_layout", ["1:1"]));
    expect(res?.data.explanation).toContain("auto-layout");
    expect(res?.data.factors.length).toBeGreaterThan(0);
  });
});

// ── Category C ───────────────────────────────────────────────────────────────
describe("Category C — layout intelligence", () => {
  it("align_nodes 'left' aligns multiple nodes", async () => {
    const a = makeFrame("1:1", "A", { x: 50, y: 0, width: 100, height: 60 });
    const b = makeFrame("1:2", "B", { x: 200, y: 0, width: 100, height: 60 });
    const c = makeFrame("1:3", "C", { x: 350, y: 0, width: 100, height: 60 });
    mockNodes["1:1"] = a; mockNodes["1:2"] = b; mockNodes["1:3"] = c;
    const res = await handleLayoutRequest(makeRequest("align_nodes", ["1:1", "1:2", "1:3"], {
      mode: "left",
    }));
    // All three should land at the bbox left = 50
    expect(res?.data.results.every((r: any) => r.x === 50)).toBe(true);
  });

  it("pack_grid arranges nodes into N columns", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 6; i++) {
      const f = makeFrame(`1:${i + 1}`, `F${i}`, { width: 100, height: 100 });
      mockNodes[`1:${i + 1}`] = f;
      ids.push(`1:${i + 1}`);
    }
    const res = await handleLayoutRequest(makeRequest("pack_grid", ids, {
      columns: 3, gap: 10, startX: 0, startY: 0,
    }));
    expect(res?.data.rows).toBe(2);
    expect(res?.data.columns).toBe(3);
    expect(res?.data.results[0].x).toBe(0);
    expect(res?.data.results[0].y).toBe(0);
    // Item 4 (index 3) should be at row 1, col 0
    expect(res?.data.results[3].row).toBe(1);
    expect(res?.data.results[3].col).toBe(0);
  });
});

// ── Category E ───────────────────────────────────────────────────────────────
describe("Category E — style ecosystem", () => {
  it("create_styles_from_palette creates one paint style per entry", async () => {
    const res = await handleStyleEcosystemRequest(makeRequest("create_styles_from_palette", [], {
      palette: { "Brand/Primary": "#5B5FEF", "Brand/Accent": "#FFD700" },
    }));
    expect(res?.data.created.length).toBe(2);
    expect(res?.data.failed.length).toBe(0);
    expect(res?.data.created[0].name).toBe("Brand/Primary");
  });

  it("create_text_scale rejects malformed entries gracefully", async () => {
    const res = await handleStyleEcosystemRequest(makeRequest("create_text_scale", [], {
      scale: { "Heading/Display": { fontFamily: "Inter", fontSize: 64 } },
    }));
    expect(res?.data.created.length + res?.data.failed.length).toBe(1);
  });
});

// ── Category G ───────────────────────────────────────────────────────────────
describe("Category G — slide templates", () => {
  it("slide_template list returns built-in templates", async () => {
    const res = await handleSlideRequest(makeRequest("slide_template", [], { action: "list" }));
    const names = res?.data.templates.map((t: any) => t.name);
    expect(names).toContain("cover");
    expect(names).toContain("quote");
    expect(names).toContain("list-3");
  });

  it("slide_template preview returns HTML", async () => {
    const res = await handleSlideRequest(makeRequest("slide_template", [], {
      action: "preview", template: "cover", slots: { title: "Hello", tagline: "World" },
    }));
    expect(res?.data.html).toContain("Hello");
    expect(res?.data.html).toContain("World");
  });
});

// ── v1.3.1 regression fixes ──────────────────────────────────────────────────
describe("v1.3.1 — bug fixes from real-world test", () => {
  it("hexToRgb handles 3-char hex (#000) without producing NaN — fixes slide_template crash", async () => {
    // Indirectly test via update_node_props which uses makeSolidPaint
    const f = makeFrame("1:1");
    mockNodes["1:1"] = f;
    const res = await handleEditRequest(makeRequest("update_node_props", [], {
      updates: [{ nodeId: "1:1", props: { fillColor: "#000" } }],
    }));
    expect(res?.data.applied).toBe(1);
    const fill = f.fills[0];
    expect(Number.isNaN(fill.color.r)).toBe(false);
    expect(Number.isNaN(fill.color.g)).toBe(false);
    expect(Number.isNaN(fill.color.b)).toBe(false);
    expect(fill.color.b).toBe(0); // #000 = (0,0,0)
  });

  it("hexToRgb handles 8-char hex with alpha (#FDF4E373)", async () => {
    const f = makeFrame("1:1");
    mockNodes["1:1"] = f;
    const res = await handleEditRequest(makeRequest("update_node_props", [], {
      updates: [{ nodeId: "1:1", props: { fillColor: "#FDF4E373" } }],
    }));
    expect(res?.data.applied).toBe(1);
    const fill = f.fills[0];
    expect(Number.isNaN(fill.color.r)).toBe(false);
    expect(fill.opacity).toBeLessThan(1); // alpha was non-1
  });

  it("patch_html returns per-node applied/errors (improved reporting)", async () => {
    const root = makeFrame("1:1", "Slide");
    const child = makeFrame("1:2", "Title", { width: 500, height: 60 });
    root.appendChild(child);
    mockNodes["1:1"] = root;
    const res = await handleEditRequest(makeRequest("patch_html", ["1:1"], {
      patches: [{ selector: "name:Title", props: { fillColor: "#000000" } }],
    }));
    // New v1.3.1 shape: results[].nodes[] with applied + errors
    expect(res?.data.results[0].nodes).toBeDefined();
    expect(res?.data.results[0].nodes[0].applied).toContain("fillColor");
    expect(res?.data.appliedPartial).toBeGreaterThan(0);
  });

  it("validate_html flags right CSS without position:absolute", async () => {
    const res = await handleValidationRequest(makeRequest("validate_html", [], {
      html: '<div style="right:50px; width:100px; height:60px;"></div>',
    }));
    const warns = res?.data.warnings as any[];
    expect(warns.some(w => w.message.includes("right is set but position is not absolute"))).toBe(true);
  });

  it("validate_html accepts right CSS with position:absolute (no warning)", async () => {
    const res = await handleValidationRequest(makeRequest("validate_html", [], {
      html: '<div style="position:absolute; right:50px; width:100px;"></div>',
    }));
    const warns = res?.data.warnings as any[];
    expect(warns.some(w => w.level === "warn" && w.message.includes("right is set"))).toBe(false);
  });

  it("validate_html flags display:flex with absolute children", async () => {
    const res = await handleValidationRequest(makeRequest("validate_html", [], {
      html: '<div style="display:flex;"><p style="position:absolute; left:10px;">Hi</p></div>',
    }));
    const warns = res?.data.warnings as any[];
    expect(warns.some(w => w.message.includes("display:flex"))).toBe(true);
  });

  it("regenerate_slide is transactional — failed write keeps original children", async () => {
    // Set up a slide with children
    const slide = makeFrame("1:1", "Slide", { width: 1080, height: 1350 });
    const oldChild = makeFrame("1:2", "Old child");
    slide.appendChild(oldChild);
    mockNodes["1:1"] = slide;

    // Force write_html to throw by monkey-patching createFrame to throw on the FIRST call
    let firstCall = true;
    const origCreateFrame = (globalThis as any).figma.createFrame;
    (globalThis as any).figma.createFrame = () => {
      if (firstCall) {
        firstCall = false;
        throw new Error("simulated write failure");
      }
      return origCreateFrame();
    };

    let threw = false;
    try {
      await handleSlideRequest(makeRequest("regenerate_slide", ["1:1"], {
        html: '<div style="width:500px; height:500px;"></div>',
      }));
    } catch (e) {
      threw = true;
      expect(String(e)).toContain("without modifying the original slide");
    }
    expect(threw).toBe(true);

    // Old child should still be present
    expect(slide.children.length).toBeGreaterThan(0);
    expect(slide.children.find((c: any) => c.id === "1:2")).toBeDefined();

    // Restore
    (globalThis as any).figma.createFrame = origCreateFrame;
  });
});

// ── Category H ───────────────────────────────────────────────────────────────
describe("Category H — diagnostics", () => {
  it("health_check returns ok=true with basic plugin info", async () => {
    const res = await handleDiagnosticsRequest(makeRequest("health_check"));
    expect(res?.data.ok).toBe(true);
    expect(res?.data.fileName).toBe("Test File");
    expect(typeof res?.data.version).toBe("string");
  });

  it("get_recent_errors returns logged errors", async () => {
    recordError("test_tool", "Test error message");
    const res = await handleDiagnosticsRequest(makeRequest("get_recent_errors", [], { limit: 5 }));
    expect(res?.data.errors.length).toBeGreaterThan(0);
    expect(res?.data.errors[0].tool).toBe("test_tool");
  });

  it("explain_node returns a role and summary for a frame", async () => {
    const slide = makeFrame("1:1", "Cover Slide", { width: 1080, height: 1350 });
    mockNodes["1:1"] = slide;
    const res = await handleDiagnosticsRequest(makeRequest("explain_node", ["1:1"]));
    expect(res?.data.role).toContain("carousel");
    expect(res?.data.summary).toContain("Cover Slide");
  });
});

import { describe, it, expect, beforeEach } from "bun:test";
import { handleWriteHtmlRequest } from "./write-html";

// ── Figma global mock ─────────────────────────────────────────────────────────

let mockNodes: Record<string, any>;
let commitUndoCalled: boolean;
let createdFrames: any[];
let createdTexts: any[];
let createdRects: any[];

const makeRequest = (type: string, nodeIds?: string[], params?: any) => ({
  type,
  requestId: "req-test-1",
  nodeIds: nodeIds ?? [],
  params: params ?? {},
});

const makeFrame = (id: string, name: string = "Frame") => {
  const children: any[] = [];
  return {
    id, name, type: "FRAME",
    x: 0, y: 0, width: 100, height: 100,
    fills: [], strokes: [], cornerRadius: 0,
    layoutMode: "NONE" as string, itemSpacing: 0,
    paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
    primaryAxisAlignItems: "MIN" as string,
    counterAxisAlignItems: "MIN" as string,
    primaryAxisSizingMode: "FIXED" as string,
    counterAxisSizingMode: "FIXED" as string,
    layoutWrap: "NO_WRAP" as string,
    clipsContent: false,
    opacity: 1,
    children,
    parent: null as any,
    resize(w: number, h: number) { this.width = w; this.height = h; },
    appendChild(child: any) { children.push(child); child.parent = this; },
    remove() {},
  };
};

beforeEach(() => {
  commitUndoCalled = false;
  createdFrames = [];
  createdTexts = [];
  createdRects = [];
  mockNodes = {};

  (globalThis as any).figma = {
    get currentPage() {
      return {
        id: "0:1", name: "Page 1",
        children: [],
        appendChild(c: any) { this.children.push(c); },
      };
    },
    getNodeByIdAsync: async (id: string) => mockNodes[id] ?? null,
    getStyleByIdAsync: async (_id: string) => null,
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
        textAlignHorizontal: "LEFT",
        textAutoResize: "NONE",
        lineHeight: { unit: "AUTO" },
        letterSpacing: { value: 0, unit: "PIXELS" },
        textDecoration: "NONE",
        opacity: 1,
        parent: null as any,
        resize(w: number, h: number) { this.width = w; this.height = h; },
        appendChild(_c: any) {},
        remove() {},
      };
      createdTexts.push(t);
      return t;
    },
    createRectangle: () => {
      const r: any = {
        id: `rect:${createdRects.length}`,
        name: "Rectangle", type: "RECTANGLE",
        x: 0, y: 0, width: 100, height: 100,
        fills: [], cornerRadius: 0, opacity: 1,
        parent: null as any,
        resize(w: number, h: number) { this.width = w; this.height = h; },
        appendChild(_c: any) {},
        remove() {},
      };
      createdRects.push(r);
      return r;
    },
    createImage: (bytes: Uint8Array) => ({
      hash: "mock-image-hash",
    }),
    loadFontAsync: async (_font: any) => {},
    commitUndo: () => { commitUndoCalled = true; },
    mixed: Symbol("mixed"),
  };
});

// ── write_html tests ────────────────────────────────────────────────────────

describe("write_html", () => {
  it("creates a frame from a div with styles", async () => {
    const target = makeFrame("1:1", "Parent");
    mockNodes["1:1"] = target;

    const res = await handleWriteHtmlRequest(makeRequest("write_html", ["1:1"], {
      html: '<div style="width: 1080px; height: 1350px; background-color: #FFFFFF;" layer-name="Slide">Hello</div>',
      targetNodeId: "1:1",
      mode: "insert-children",
    }));

    expect(res).not.toBeNull();
    expect(res?.data.created.length).toBe(1);
    expect(res?.data.nodeCount).toBeGreaterThan(0);
    expect(commitUndoCalled).toBe(true);
  });

  it("creates a text node from a p tag", async () => {
    const target = makeFrame("1:1", "Parent");
    mockNodes["1:1"] = target;

    const res = await handleWriteHtmlRequest(makeRequest("write_html", ["1:1"], {
      html: '<p style="font-family: Outfit; font-size: 80px; font-weight: 500; color: #000000;">Hello World</p>',
      targetNodeId: "1:1",
      mode: "insert-children",
    }));

    expect(res).not.toBeNull();
    expect(createdTexts.length).toBe(1);
    expect(createdTexts[0].characters).toBe("Hello World");
    expect(createdTexts[0].fontName.family).toBe("Outfit");
    expect(createdTexts[0].fontSize).toBe(80);
  });

  it("handles nested flex layout", async () => {
    const target = makeFrame("1:1", "Parent");
    mockNodes["1:1"] = target;

    const html = `
      <div style="display: flex; flex-direction: column; gap: 24px; padding: 50px; width: 1080px; background-color: #FFFFFF;" layer-name="Card">
        <p style="font-size: 72px; color: #000000;">Title</p>
        <p style="font-size: 28px; color: #888888;">Body text here</p>
      </div>
    `;

    const res = await handleWriteHtmlRequest(makeRequest("write_html", ["1:1"], {
      html,
      targetNodeId: "1:1",
      mode: "insert-children",
    }));

    expect(res).not.toBeNull();
    // Should create 1 frame + 2 text nodes
    expect(createdFrames.length).toBe(1);
    expect(createdTexts.length).toBe(2);
    // Frame should have auto-layout
    expect(createdFrames[0].layoutMode).toBe("VERTICAL");
    expect(createdFrames[0].itemSpacing).toBe(24);
  });

  it("handles hr divider", async () => {
    const target = makeFrame("1:1", "Parent");
    mockNodes["1:1"] = target;

    const res = await handleWriteHtmlRequest(makeRequest("write_html", ["1:1"], {
      html: '<hr style="width: 940px; height: 2px; background-color: #E0E0E0;" />',
      targetNodeId: "1:1",
      mode: "insert-children",
    }));

    expect(res).not.toBeNull();
    expect(createdRects.length).toBe(1);
    expect(createdRects[0].width).toBe(940);
    expect(createdRects[0].height).toBe(2);
  });

  it("handles replace mode", async () => {
    const parent = makeFrame("0:1", "Page");
    const target = makeFrame("1:1", "Old Frame");
    target.parent = parent;
    let targetRemoved = false;
    target.remove = () => { targetRemoved = true; };

    mockNodes["1:1"] = target;
    mockNodes["0:1"] = parent;
    // Need parent's appendChild to work
    parent.appendChild(target);

    const res = await handleWriteHtmlRequest(makeRequest("write_html", ["1:1"], {
      html: '<div style="width: 500px; height: 500px;" layer-name="New Frame">Replaced</div>',
      targetNodeId: "1:1",
      mode: "replace",
    }));

    expect(res).not.toBeNull();
    expect(targetRemoved).toBe(true);
  });

  it("applies style mapping via CSS classes", async () => {
    const target = makeFrame("1:1", "Parent");
    mockNodes["1:1"] = target;

    const res = await handleWriteHtmlRequest(makeRequest("write_html", ["1:1"], {
      html: '<p class="heading-cover" style="font-size: 96px;">Cover Title</p>',
      targetNodeId: "1:1",
      mode: "insert-children",
      styleMapping: {
        "heading-cover": { textStyleId: "S:mock123", paintStyleId: "S:mock456" },
      },
    }));

    expect(res).not.toBeNull();
    expect(createdTexts.length).toBe(1);
    expect(createdTexts[0].characters).toBe("Cover Title");
  });

  it("returns null for unknown request types", async () => {
    const res = await handleWriteHtmlRequest(makeRequest("unknown_type"));
    expect(res).toBeNull();
  });

  // ── Bug-fix regression tests (B-1..B-8) ─────────────────────────────────
  it("B-1: child without explicit width inside auto-layout parent gets HUG sizing", async () => {
    // Build a parent that already has auto-layout
    const parent = makeFrame("1:1", "Parent");
    parent.layoutMode = "VERTICAL";
    mockNodes["1:1"] = parent;

    await handleWriteHtmlRequest(makeRequest("write_html", ["1:1"], {
      // Outer flex container, then a button-like child with NO explicit width
      html: '<div style="display:flex;"><div style="background:#FF0000; padding:8px;"><p>Hi</p></div></div>',
      targetNodeId: "1:1",
      mode: "insert-children",
    }));

    // Inner non-flex-grow no-width frame should be HUG, not FILL
    const innerFrame = createdFrames.find(f => f.layoutMode === "VERTICAL" && f.paddingTop === 8);
    expect(innerFrame).toBeDefined();
    expect(innerFrame?.layoutSizingHorizontal).toBe("HUG");
  });

  it("B-2: right CSS computes left from parent width", async () => {
    const parent = makeFrame("1:1", "Slide");
    parent.width = 1080;
    parent.height = 1350;
    mockNodes["1:1"] = parent;

    await handleWriteHtmlRequest(makeRequest("write_html", ["1:1"], {
      html: '<div style="position:absolute; right:50px; top:100px; width:200px; height:60px;"></div>',
      targetNodeId: "1:1",
      mode: "insert-children",
    }));

    const frame = createdFrames[0];
    // x should be parent.width - element.width - right = 1080 - 200 - 50 = 830
    expect(frame.x).toBe(830);
    expect(frame.y).toBe(100);
  });

  it("B-2: bottom CSS computes top from parent height", async () => {
    const parent = makeFrame("1:1", "Slide");
    parent.width = 1080;
    parent.height = 1350;
    mockNodes["1:1"] = parent;

    await handleWriteHtmlRequest(makeRequest("write_html", ["1:1"], {
      html: '<div style="position:absolute; left:0; bottom:80px; width:300px; height:50px;"></div>',
      targetNodeId: "1:1",
      mode: "insert-children",
    }));

    const frame = createdFrames[0];
    expect(frame.x).toBe(0);
    // y should be parent.height - element.height - bottom = 1350 - 50 - 80 = 1220
    expect(frame.y).toBe(1220);
  });

  it("B-4: divider div with explicit 1px height does not collapse to 0", async () => {
    const parent = makeFrame("1:1", "Card");
    parent.layoutMode = "VERTICAL";
    mockNodes["1:1"] = parent;

    await handleWriteHtmlRequest(makeRequest("write_html", ["1:1"], {
      html: '<div style="width:940px; height:1px; background:#CCCCCC;"></div>',
      targetNodeId: "1:1",
      mode: "insert-children",
    }));

    const div = createdFrames[0];
    expect(div.height).toBe(1);
    // Should NOT have layoutSizingVertical=HUG (which would collapse to 0)
    expect(div.layoutSizingVertical).not.toBe("HUG");
  });

  it("B-5: root display:flex is ignored when children use position:absolute", async () => {
    const parent = makeFrame("1:1", "Slide");
    mockNodes["1:1"] = parent;

    await handleWriteHtmlRequest(makeRequest("write_html", ["1:1"], {
      html: `
        <div style="width:1080px; height:1350px; display:flex; flex-direction:column;">
          <p style="position:absolute; left:70px; top:160px;">Title</p>
          <p style="position:absolute; left:70px; top:520px;">Body</p>
        </div>
      `,
      targetNodeId: "1:1",
      mode: "insert-children",
    }));

    const slide = createdFrames[0];
    // Should NOT have applied flex layoutMode because children use absolute
    expect(slide.layoutMode).toBe("NONE");
  });

  it("B-6: write_html accepts x and y to position the new root", async () => {
    const parent = makeFrame("1:1", "Page");
    mockNodes["1:1"] = parent;

    await handleWriteHtmlRequest(makeRequest("write_html", ["1:1"], {
      html: '<div style="width:500px; height:500px;"></div>',
      targetNodeId: "1:1",
      mode: "insert-children",
      x: 2274,
      y: 100,
    }));

    const frame = createdFrames[0];
    expect(frame.x).toBe(2274);
    expect(frame.y).toBe(100);
  });

  it("B-6: autoOffset places new root next to existing siblings", async () => {
    const parent = makeFrame("1:1", "Page");
    // Pre-existing sibling at x=0, width=1080
    const existing: any = {
      id: "9:9", name: "Existing", type: "FRAME",
      x: 0, y: 0, width: 1080, height: 1350,
    };
    parent.children.push(existing);
    mockNodes["1:1"] = parent;

    await handleWriteHtmlRequest(makeRequest("write_html", ["1:1"], {
      html: '<div style="width:1080px; height:1350px;"></div>',
      targetNodeId: "1:1",
      mode: "insert-children",
      autoOffset: true,
    }));

    const newFrame = createdFrames[0];
    // Should be at last sibling's x + width + 80 = 0 + 1080 + 80 = 1160
    expect(newFrame.x).toBe(1160);
  });

  it("B-7: child without explicit width in non-flex parent inherits parent width", async () => {
    const parent = makeFrame("1:1", "Page");
    parent.width = 1080;
    parent.height = 1350;
    parent.layoutMode = "NONE";
    mockNodes["1:1"] = parent;

    await handleWriteHtmlRequest(makeRequest("write_html", ["1:1"], {
      html: '<div style="height:1350px;"></div>',
      targetNodeId: "1:1",
      mode: "insert-children",
    }));

    const frame = createdFrames[0];
    // Used to default to 100; now inherits parent width
    expect(frame.width).toBe(1080);
  });

  it("B-8: variable binding via class returns boundStyles.variables", async () => {
    const parent = makeFrame("1:1", "Slide");
    mockNodes["1:1"] = parent;

    // Mock figma.variables for this test
    const fakeVariable = { id: "VariableID:abc", name: "Brand/Primary" };
    (globalThis as any).figma.variables = {
      getVariableByIdAsync: async (id: string) =>
        id === "VariableID:abc" ? fakeVariable : null,
      setBoundVariableForPaint: (paint: any, _field: string, variable: any) => ({
        ...paint,
        boundVariables: { color: { type: "VARIABLE_ALIAS", id: variable.id } },
      }),
    };

    const res = await handleWriteHtmlRequest(makeRequest("write_html", ["1:1"], {
      html: '<div class="primary-bg" style="width:200px; height:60px;"></div>',
      targetNodeId: "1:1",
      mode: "insert-children",
      styleMapping: {
        "primary-bg": {
          variables: [{ field: "fillColor", variableId: "VariableID:abc" }],
        },
      },
    }));

    const created = res?.data.created[0];
    expect(created?.boundStyles?.variables).toBeDefined();
    expect(created?.boundStyles?.variables?.[0].field).toBe("fillColor");
    expect(created?.boundStyles?.variables?.[0].variableId).toBe("VariableID:abc");
  });

  it("B-8: variable binding via data-variable-* attributes", async () => {
    const parent = makeFrame("1:1", "Slide");
    mockNodes["1:1"] = parent;

    (globalThis as any).figma.variables = {
      getVariableByIdAsync: async (_id: string) => ({ id: "VariableID:xyz", name: "Brand/Accent" }),
      setBoundVariableForPaint: (paint: any, _f: string, v: any) => ({ ...paint, bound: v.id }),
    };

    const res = await handleWriteHtmlRequest(makeRequest("write_html", ["1:1"], {
      html: '<div data-variable-field="fillColor" data-variable-id="VariableID:xyz" style="width:200px; height:60px;"></div>',
      targetNodeId: "1:1",
      mode: "insert-children",
    }));

    expect(res?.data.created[0]?.boundStyles?.variables?.[0].field).toBe("fillColor");
  });
});

// ── write_html_batch tests ──────────────────────────────────────────────────

describe("write_html_batch", () => {
  it("creates multiple slide frames", async () => {
    const page = (globalThis as any).figma.currentPage;

    const res = await handleWriteHtmlRequest(makeRequest("write_html_batch", [], {
      slides: [
        { name: "A3-0 Cover", html: '<p style="font-size: 96px;">Cover</p>' },
        { name: "A3-1 Content", html: '<p style="font-size: 72px;">Content</p>' },
        { name: "A3-2 CTA", html: '<p style="font-size: 80px;">Follow</p>' },
      ],
      frameWidth: 1080,
      frameHeight: 1350,
      spacing: 80,
    }));

    expect(res).not.toBeNull();
    expect(res?.data.totalSlides).toBe(3);
    expect(res?.data.slides.length).toBe(3);
    expect(res?.data.slides[0].name).toBe("A3-0 Cover");
    // Frames should be positioned with spacing
    expect(createdFrames[0].x).toBe(0);
    expect(createdFrames[1].x).toBe(1160); // 1080 + 80
    expect(createdFrames[2].x).toBe(2320); // 2 * (1080 + 80)
  });

  it("all frames have correct dimensions", async () => {
    const res = await handleWriteHtmlRequest(makeRequest("write_html_batch", [], {
      slides: [
        { name: "S1", html: '<p>One</p>' },
        { name: "S2", html: '<p>Two</p>' },
      ],
      frameWidth: 1080,
      frameHeight: 1350,
    }));

    for (const f of createdFrames) {
      expect(f.width).toBe(1080);
      expect(f.height).toBe(1350);
    }
  });
});

// ── get_html tests ──────────────────────────────────────────────────────────

describe("get_html", () => {
  it("exports a text node as HTML", async () => {
    const textNode: any = {
      id: "1:1", name: "Title", type: "TEXT",
      x: 0, y: 0, width: 500, height: 80,
      fontName: { family: "Outfit", style: "Medium" },
      fontSize: 72,
      characters: "Hello World",
      fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }],
      textAlignHorizontal: "CENTER",
      lineHeight: { unit: "AUTO" },
    };
    mockNodes["1:1"] = textNode;

    const res = await handleWriteHtmlRequest(makeRequest("get_html", ["1:1"], {}));

    expect(res).not.toBeNull();
    expect(res?.data.html).toContain("font-family: 'Outfit'");
    expect(res?.data.html).toContain("font-size: 72px");
    expect(res?.data.html).toContain("Hello World");
    expect(res?.data.html).toContain("text-align: center");
  });

  it("exports a frame with auto-layout as flex HTML", async () => {
    const child: any = {
      id: "2:1", name: "Text", type: "TEXT",
      x: 0, y: 0, width: 500, height: 30,
      fontName: { family: "Inter", style: "Regular" },
      fontSize: 16, characters: "Child text",
      fills: [{ type: "SOLID", color: { r: 0.5, g: 0.5, b: 0.5 } }],
      textAlignHorizontal: "LEFT",
      lineHeight: { unit: "AUTO" },
    };

    const frame: any = {
      id: "1:1", name: "Container", type: "FRAME",
      x: 0, y: 0, width: 1080, height: 1350,
      fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }],
      cornerRadius: 0, opacity: 1,
      layoutMode: "VERTICAL", itemSpacing: 24,
      paddingTop: 50, paddingRight: 50, paddingBottom: 50, paddingLeft: 50,
      primaryAxisAlignItems: "MIN",
      counterAxisAlignItems: "CENTER",
      children: [child],
    };
    mockNodes["1:1"] = frame;

    const res = await handleWriteHtmlRequest(makeRequest("get_html", ["1:1"], {}));

    expect(res).not.toBeNull();
    expect(res?.data.html).toContain("display: flex");
    expect(res?.data.html).toContain("flex-direction: column");
    expect(res?.data.html).toContain("gap: 24px");
    expect(res?.data.html).toContain("padding: 50px 50px 50px 50px");
    expect(res?.data.html).toContain("Child text");
  });
});

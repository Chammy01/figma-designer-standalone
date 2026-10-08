// Read-only browser source capture; deliberately independent of write serializers.
const projectionVersion = "figma-browser-source-v1";
const runtimeName = "Figma Designer — Interactive App";
const supported = new Set(["FRAME", "GROUP", "COMPONENT", "INSTANCE", "TEXT", "RECTANGLE", "ELLIPSE", "VECTOR", "LINE", "BOOLEAN_OPERATION", "STAR", "POLYGON"]);
const fields = [
  "visible", "opacity", "rotation", "relativeTransform", "fills", "strokes", "effects", "blendMode",
  "strokeWeight", "strokeTopWeight", "strokeRightWeight", "strokeBottomWeight", "strokeLeftWeight",
  "strokeAlign", "strokeCap", "strokeJoin", "strokeMiterLimit", "dashPattern",
  "cornerRadius", "cornerSmoothing", "topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius",
  "layoutMode", "layoutWrap", "layoutSizingHorizontal", "layoutSizingVertical", "layoutAlign", "layoutGrow", "layoutPositioning",
  "primaryAxisSizingMode", "counterAxisSizingMode", "primaryAxisAlignItems", "counterAxisAlignItems", "counterAxisAlignContent",
  "itemSpacing", "counterAxisSpacing", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "itemReverseZIndex", "strokesIncludedInLayout", "minWidth", "maxWidth", "minHeight", "maxHeight", "constraints", "clipsContent",
  "overflowDirection", "isMask", "maskType", "vectorPaths", "vectorNetwork", "fillGeometry", "booleanOperation", "arcData", "pointCount", "innerRadius",
  "characters", "fontName", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textAlignHorizontal", "textAlignVertical",
  "textCase", "textDecoration", "textDecorationStyle", "textDecorationOffset", "textDecorationThickness", "textDecorationColor", "textDecorationSkipInk", "textAutoResize", "textTruncation", "maxLines", "paragraphIndent", "paragraphSpacing", "listSpacing",
  "hangingPunctuation", "hangingList", "leadingTrim", "autoHyphenate", "hyperlink", "openTypeFeatures",
  "overlayPositionType", "overlayBackground", "overlayBackgroundInteraction",
  "boundVariables", "explicitVariableModes", "resolvedVariableModes", "componentProperties", "componentPropertyReferences", "componentPropertyDefinitions", "variantProperties",
];
const textFields = ["fontName", "fontSize", "fontWeight", "fills", "textCase", "textDecoration", "textDecorationStyle", "textDecorationOffset", "textDecorationThickness", "textDecorationColor", "textDecorationSkipInk", "letterSpacing", "lineHeight", "listOptions", "indentation", "paragraphIndent", "paragraphSpacing", "listSpacing", "hyperlink", "openTypeFeatures", "boundVariables"];

function json(value: any): any {
  if (typeof value === "symbol") return { mixed: true };
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(json);
  if (value && typeof value === "object") {
    const out: any = {};
    for (const key of Object.keys(value)) {
      if (value[key] === undefined) throw new Error(`Incomplete source field: ${key}`);
      out[key] = json(value[key]);
    }
    return out;
  }
  throw new Error("Source contains a non-JSON value");
}

export async function collectBrowserSource(api: any, runtime?: any) {
  const started = Date.now();
  const matches = api.currentPage.children.filter((n: any) => n.type === "SECTION" && n.name === runtimeName);
  if (matches.length !== 1 || (runtime && runtime.id !== matches[0].id)) throw new Error("Expected exactly one canonical Interactive App SECTION on the current page");
  runtime = matches[0];
  if (typeof runtime.visible !== "boolean") throw new Error("Incomplete runtime visibility");
  if (!runtime.children.some((n: any) => n.type === "FRAME")) throw new Error("Runtime contains no screen FRAMEs");
  const inspected = new Set<string>();
  const runtimeIds = new Set<string>();
  const pending = new Map<string, any>();
  const dependencies = new Map<string, any>();
  const families = new Map<string, any>();
  const variableIds = new Set<string>();
  const collectionIds = new Set<string>();
  function markRuntime(n: any) { runtimeIds.add(n.id); for (const c of n.children ?? []) markRuntime(c); }
  markRuntime(runtime);
  async function references(value: any): Promise<void> {
    if (!value || typeof value !== "object") return;
    if (value.type === "VARIABLE_ALIAS") variableIds.add(value.id);
    if (typeof value.variableId === "string") variableIds.add(value.variableId);
    if (typeof value.variableCollectionId === "string") collectionIds.add(value.variableCollectionId);
    if (value.type === "NODE" && typeof value.value === "string") await references({ destinationId: value.value });
    if (typeof value.destinationId === "string" && !runtimeIds.has(value.destinationId) && !pending.has(value.destinationId)) {
      const target = await api.getNodeByIdAsync(value.destinationId);
      if (!target) throw new Error(`Missing reaction destination: ${value.destinationId}`);
      pending.set(target.id, target);
    }
    for (const child of Object.values(value)) await references(child);
  }
  function componentDependency(component: any) {
    pending.set(component.id, component);
    const family = component.parent;
    if (family?.type === "COMPONENT_SET") {
      families.set(family.id, {
        id: family.id, type: family.type, name: family.name,
        componentPropertyDefinitions: json(family.componentPropertyDefinitions ?? {}),
        variantIds: family.children.map((c: any) => c.id).sort(),
      });
      inspected.add(family.id);
      for (const variant of family.children) {
        if (variant.type !== "COMPONENT") throw new Error("Unsupported component-set child");
        pending.set(variant.id, variant);
      }
    }
  }
  async function tree(n: any, root: boolean, parentId: string | null): Promise<any> {
    if (!supported.has(n.type)) throw new Error(`Unsupported browser source node: ${n.type} (${n.id})`);
    inspected.add(n.id);
    if (![n.x, n.y, n.width, n.height].every(Number.isFinite) || typeof n.visible !== "boolean" || !Number.isFinite(n.opacity)) throw new Error(`Incomplete geometry/visibility: ${n.id}`);
    const props: any = {};
    for (const field of fields) if (field in n) {
      if (field === "fillGeometry" && !["VECTOR", "BOOLEAN_OPERATION"].includes(n.type)) continue;
      if (field === "componentPropertyDefinitions" && n.type === "COMPONENT" && n.parent?.type === "COMPONENT_SET") continue;
      if (n[field] === undefined) throw new Error(`Incomplete ${field}: ${n.id}`);
      props[field] = json(n[field]);
    }
    if (root && props.relativeTransform) {
      props.relativeTransform[0][2] = 0;
      props.relativeTransform[1][2] = 0;
    }
    if (n.type === "TEXT") {
      if (typeof n.characters !== "string" || typeof n.getStyledTextSegments !== "function") throw new Error(`Incomplete text runs: ${n.id}`);
      props.textRuns = json(n.getStyledTextSegments(textFields));
    }
    let component = null;
    if (n.type === "INSTANCE") {
      const source = await n.getMainComponentAsync();
      if (!source || source.type !== "COMPONENT") throw new Error(`Unresolved instance source: ${n.id}`);
      componentDependency(source);
      component = { mainComponentId: source.id, componentSetId: source.parent?.type === "COMPONENT_SET" ? source.parent.id : null };
    }
    if (n.type === "COMPONENT") componentDependency(n);
    const reactions = json("reactions" in n ? n.reactions : []);
    await references(props); await references(reactions);
    const children = [];
    for (const child of n.children ?? []) children.push(await tree(child, false, n.id));
    return { id: n.id, type: n.type, name: n.name, parentId, geometry: { x: root ? 0 : n.x, y: root ? 0 : n.y, width: n.width, height: n.height }, props, component, reactions, children };
  }
  const children = [];
  for (const child of runtime.children) children.push(await tree(child, true, runtime.id));
  for (const [id, node] of pending) if (!dependencies.has(id) && !runtimeIds.has(id)) dependencies.set(id, await tree(node, true, null));
  const variables = new Map<string, any>();
  for (const id of variableIds) {
    const variable = await api.variables.getVariableByIdAsync(id);
    if (!variable) throw new Error(`Unresolved variable: ${id}`);
    const data = { id: variable.id, variableCollectionId: variable.variableCollectionId, resolvedType: variable.resolvedType, valuesByMode: json(variable.valuesByMode) };
    collectionIds.add(variable.variableCollectionId);
    variables.set(id, data);
    await references(data.valuesByMode);
  }
  const collections = [];
  for (const id of [...collectionIds].sort()) {
    const collection = await api.variables.getVariableCollectionByIdAsync(id);
    if (!collection) throw new Error(`Unresolved variable collection: ${id}`);
    collections.push({ id: collection.id, defaultModeId: collection.defaultModeId, modes: json(collection.modes).sort((a: any, b: any) => a.modeId < b.modeId ? -1 : a.modeId > b.modeId ? 1 : 0) });
  }
  function usedModes(node: any) {
    for (const field of ["explicitVariableModes", "resolvedVariableModes"]) if (node.props[field]) {
      node.props[field] = Object.fromEntries(Object.entries(node.props[field]).filter(([id]) => collectionIds.has(id)));
    }
    for (const child of node.children) usedModes(child);
  }
  children.forEach(usedModes); dependencies.forEach(usedModes);
  const byId = (a: any, b: any) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  const projection = {
    sourceProjectionVersion: projectionVersion,
    coordinateSystem: "parent-relative; screen/dependency root translations zeroed",
    document: { fileKey: api.fileKey ?? null, pageId: api.currentPage.id },
    runtime: { id: runtime.id, type: runtime.type, name: runtime.name, visible: runtime.visible, children },
    families: [...families.values()].sort(byId),
    dependencies: [...dependencies.values()].sort(byId),
    variables: [...variables.values()].sort(byId), collections,
  };
  return { projection, metrics: { nodesInspected: inspected.size + 1, referencedComponents: [...dependencies.values()].filter(n => n.type === "COMPONENT").length, referencedFamilies: families.size, referencedVariables: variables.size, readMs: Date.now() - started } };
}

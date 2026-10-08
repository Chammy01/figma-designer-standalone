/**
 * components-v2.ts — Category D: Component ergonomics.
 *
 *   create_component_from_html
 *   instantiate_by_name
 *   set_instance_overrides_batch
 *   combine_as_variants
 */

import { getBounds } from "./serializers";
import { getParentNode } from "./write-helpers";

const deriveVariantValue = (name: string, index: number): string => {
  const parts = name
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  const candidate = parts.length > 0 ? parts[parts.length - 1] : "";
  return candidate || `Variant ${index + 1}`;
};

const hasChildren = (node: any): boolean =>
  !!node && Array.isArray(node.children);

const isUnsafeVariantParent = (node: any): boolean =>
  !node ||
  node.type === "DOCUMENT" ||
  node.type === "COMPONENT" ||
  node.type === "COMPONENT_SET" ||
  node.type === "INSTANCE";

const ancestorChain = (node: any): any[] => {
  const out: any[] = [];
  let current = node?.parent || null;

  while (current) {
    out.push(current);
    current = current.parent || null;
  }

  return out;
};

const isAncestorOf = (ancestor: any, node: any): boolean => {
  let current = node?.parent || null;

  while (current) {
    if (current.id === ancestor.id) return true;
    current = current.parent || null;
  }

  return false;
};

const nearestSafeCommonAncestor = (nodes: any[]): any | null => {
  if (nodes.length === 0) return null;

  for (const candidate of ancestorChain(nodes[0])) {
    if (!hasChildren(candidate) || isUnsafeVariantParent(candidate)) continue;
    if (nodes.every((node) => isAncestorOf(candidate, node))) {
      return candidate;
    }
  }

  return null;
};

const containingPage = (node: any): any | null => {
  let current = node;

  while (current) {
    if (current.type === "PAGE") return current;
    current = current.parent || null;
  }

  return null;
};

const resizeAndLayOutVariantSet = (componentSet: any) => {
  const padding = 24;
  const gap = 24;
  let x = padding;
  let maxHeight = 0;

  for (const child of componentSet.children || []) {
    child.x = x;
    child.y = padding;
    x += child.width + gap;
    maxHeight = Math.max(maxHeight, child.height);
  }

  const width = Math.max(
    padding * 2,
    x - gap + padding,
  );
  const height = Math.max(
    padding * 2,
    maxHeight + padding * 2,
  );

  if (typeof componentSet.resizeWithoutConstraints === "function") {
    componentSet.resizeWithoutConstraints(width, height);
  } else {
    componentSet.resize(width, height);
  }
};

export const handleComponentV2Request = async (request: any) => {
  switch (request.type) {

    case "create_component_from_html": {
      // Delegate the heavy lifting to write_html, then convert the resulting root frame to a Component.
      const { handleWriteHtmlRequest } = await import("./write-html");
      const writeRes = await handleWriteHtmlRequest({
        type: "write_html",
        requestId: request.requestId,
        nodeIds: request.nodeIds,
        params: {
          html: request.params.html,
          targetNodeId: request.params.targetNodeId,
          mode: "insert-children",
          styleMapping: request.params.styleMapping || {},
        },
      });

      const created = writeRes?.data?.created || [];
      if (created.length === 0) throw new Error("write_html returned no nodes");

      const rootId = created[0].id;
      const root = await figma.getNodeByIdAsync(rootId) as any;
      if (!root) throw new Error("Could not retrieve created root node");
      if (root.type !== "FRAME") {
        throw new Error("Root must be a FRAME to convert to Component");
      }

      const component = figma.createComponentFromNode(root);
      const componentName = (request.params.name as string) || component.name || "Component";
      component.name = componentName;
      figma.commitUndo();

      return {
        type: request.type,
        requestId: request.requestId,
        data: {
          componentId: component.id,
          name: component.name,
          bounds: getBounds(component),
          children: created[0].children || [],
        },
      };
    }

    case "instantiate_by_name": {
      const wantName = (request.params.componentName as string).toLowerCase();
      // Walk all pages to find a component
      let match: any = null;
      const findIn = (parent: any) => {
        if (match) return;
        if ("children" in parent) {
          for (const c of parent.children) {
            if (match) return;
            if (c.type === "COMPONENT" && c.name.toLowerCase() === wantName) {
              match = c; return;
            }
            findIn(c);
          }
        }
      };
      // Try exact match across all pages
      for (const page of figma.root.children) {
        await page.loadAsync();
        findIn(page);
        if (match) break;
      }
      // Fallback: substring match
      if (!match) {
        const findSubIn = (parent: any) => {
          if (match) return;
          if ("children" in parent) {
            for (const c of parent.children) {
              if (match) return;
              if (c.type === "COMPONENT" && c.name.toLowerCase().includes(wantName)) {
                match = c; return;
              }
              findSubIn(c);
            }
          }
        };
        for (const page of figma.root.children) {
          findSubIn(page);
          if (match) break;
        }
      }

      if (!match) throw new Error(`Component not found: ${request.params.componentName}`);

      const parent = await getParentNode(request.params.parentId);
      const inst = match.createInstance();
      if (request.params.x != null) inst.x = Number(request.params.x);
      if (request.params.y != null) inst.y = Number(request.params.y);
      (parent as any).appendChild(inst);

      // Apply simple text overrides if provided
      const overrides = (request.params.overrides as Record<string, any>) || {};
      const applied: string[] = [];
      const errors: string[] = [];
      const findChild = (root: any, name: string): any => {
        if (root.name === name) return root;
        if ("children" in root) {
          for (const c of root.children) {
            const r = findChild(c, name);
            if (r) return r;
          }
        }
        return null;
      };
      for (const key of Object.keys(overrides)) {
        const target = findChild(inst, key);
        if (!target) { errors.push(`${key}: no child with that layer-name`); continue; }
        try {
          if (target.type === "TEXT" && typeof overrides[key] === "string") {
            await figma.loadFontAsync(typeof target.fontName === "symbol"
              ? { family: "Inter", style: "Regular" } : target.fontName);
            target.characters = overrides[key];
            applied.push(key);
          } else if (typeof overrides[key] === "boolean") {
            target.visible = overrides[key];
            applied.push(key);
          }
        } catch (e) {
          errors.push(`${key}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      figma.commitUndo();
      return {
        type: request.type,
        requestId: request.requestId,
        data: {
          instanceId: inst.id,
          componentId: match.id,
          componentName: match.name,
          bounds: getBounds(inst),
          appliedOverrides: applied,
          ...(errors.length ? { errors } : {}),
        },
      };
    }

    case "set_instance_overrides_batch": {
      const updates = (request.params?.updates || []) as Array<{ instanceId: string; overrides: Record<string, any> }>;
      const results: any[] = [];
      let appliedTotal = 0;
      let failedTotal = 0;

      for (const u of updates) {
        const applied: string[] = [];
        const errors: string[] = [];
        try {
          const inst = await figma.getNodeByIdAsync(u.instanceId) as any;
          if (!inst || inst.type !== "INSTANCE") {
            results.push({ instanceId: u.instanceId, applied: [], errors: [`Not an INSTANCE node`] });
            failedTotal++;
            continue;
          }
          const findChild = (root: any, name: string): any => {
            if (root.name === name) return root;
            if ("children" in root) {
              for (const c of root.children) {
                const r = findChild(c, name);
                if (r) return r;
              }
            }
            return null;
          };
          for (const key of Object.keys(u.overrides)) {
            const value = u.overrides[key];
            if (key === "swap" && typeof value === "object") {
              for (const slotName of Object.keys(value)) {
                const slot = findChild(inst, slotName);
                if (!slot || slot.type !== "INSTANCE") {
                  errors.push(`swap:${slotName}: no INSTANCE child with that name`);
                  continue;
                }
                // Find new component by name
                let target: any = null;
                for (const page of figma.root.children) {
                  await page.loadAsync();
                  const walk = (p: any) => {
                    if (target) return;
                    if ("children" in p) {
                      for (const c of p.children) {
                        if (target) return;
                        if (c.type === "COMPONENT" && c.name === value[slotName]) { target = c; return; }
                        walk(c);
                      }
                    }
                  };
                  walk(page);
                  if (target) break;
                }
                if (!target) { errors.push(`swap:${slotName}: target component not found: ${value[slotName]}`); continue; }
                try {
                  await slot.swapComponent(target);
                  applied.push(`swap:${slotName}`);
                } catch (e) {
                  errors.push(`swap:${slotName}: ${e instanceof Error ? e.message : String(e)}`);
                }
              }
              continue;
            }
            const target = findChild(inst, key);
            if (!target) { errors.push(`${key}: no child with that layer-name`); continue; }
            try {
              if (target.type === "TEXT" && typeof value === "string") {
                await figma.loadFontAsync(typeof target.fontName === "symbol"
                  ? { family: "Inter", style: "Regular" } : target.fontName);
                target.characters = value;
                applied.push(key);
              } else if (typeof value === "boolean") {
                target.visible = value;
                applied.push(key);
              }
            } catch (e) {
              errors.push(`${key}: ${e instanceof Error ? e.message : String(e)}`);
            }
          }
          results.push({
            instanceId: u.instanceId,
            applied,
            ...(errors.length ? { errors } : {}),
          });
          if (errors.length === 0) appliedTotal++; else failedTotal++;
        } catch (e) {
          results.push({ instanceId: u.instanceId, error: e instanceof Error ? e.message : String(e) });
          failedTotal++;
        }
      }

      figma.commitUndo();
      return {
        type: request.type,
        requestId: request.requestId,
        data: { applied: appliedTotal, failed: failedTotal, results },
      };
    }

    case "combine_as_variants": {
      const ids = (request.nodeIds || []) as string[];
      if (ids.length < 2) {
        throw new Error("combine_as_variants requires at least 2 component IDs");
      }

      const components: any[] = [];
      for (const id of ids) {
        const node = await figma.getNodeByIdAsync(id) as any;
        if (!node) throw new Error(`Component not found: ${id}`);
        if (node.type !== "COMPONENT") {
          throw new Error(`Node ${id} is ${node.type}, expected COMPONENT`);
        }
        if (node.parent?.type === "COMPONENT_SET") {
          throw new Error(`Component ${id} is already inside COMPONENT_SET ${node.parent.id}`);
        }
        components.push(node);
      }

      const pages = components.map(containingPage);
      if (pages.some((page) => !page)) {
        throw new Error("Could not resolve containing page for every component");
      }
      const pageId = pages[0].id;
      if (pages.some((page) => page.id !== pageId)) {
        throw new Error("All components must be on the same Figma page");
      }

      let parent: any = null;
      if (request.params?.parentId) {
        parent = await figma.getNodeByIdAsync(request.params.parentId) as any;
        if (!parent) throw new Error(`Parent not found: ${request.params.parentId}`);
        if (!hasChildren(parent) || isUnsafeVariantParent(parent)) {
          throw new Error(`parentId ${request.params.parentId} cannot safely contain a COMPONENT_SET`);
        }
        const parentPage = containingPage(parent);
        if (!parentPage || parentPage.id !== pageId) {
          throw new Error("parentId must be on the same page as all components");
        }
      } else {
        parent = nearestSafeCommonAncestor(components);
        if (!parent) {
          throw new Error("Could not find a safe common ancestor for the selected components; provide parentId explicitly");
        }
      }

      const propertyNameRaw = String(request.params?.propertyName || "State").trim();
      const propertyName = propertyNameRaw || "State";

      const explicitValues = Array.isArray(request.params?.variantValues)
        ? request.params.variantValues.map((v: any) => String(v).trim())
        : [];

      if (explicitValues.length > 0 && explicitValues.length !== components.length) {
        throw new Error(
          `variantValues length (${explicitValues.length}) must match component count (${components.length})`,
        );
      }

      const values = explicitValues.length > 0
        ? explicitValues
        : components.map((component, index) => deriveVariantValue(component.name, index));

      if (values.some((value) => !value)) {
        throw new Error("Variant values must not be empty");
      }

      const normalized = values.map((value) => value.toLowerCase());
      if (new Set(normalized).size !== normalized.length) {
        throw new Error(`Variant values must be unique: ${values.join(", ")}`);
      }

      const originalNames = components.map((component) => component.name);
      const formerParents = Array.from(new Set(
        components
          .map((component) => component.parent?.id)
          .filter(Boolean),
      ));

      components.forEach((component, index) => {
        component.name = `${propertyName}=${values[index]}`;
      });

      let componentSet: any;
      try {
        componentSet = figma.combineAsVariants(components as ComponentNode[], parent as any);
      } catch (e) {
        // Restore names if Figma rejects the structural operation.
        components.forEach((component, index) => {
          if (!component.removed) component.name = originalNames[index];
        });
        throw e;
      }

      componentSet.name = String(request.params?.name || "").trim() || "Component Set";
      resizeAndLayOutVariantSet(componentSet);

      const emptyFormerParentIds: string[] = [];
      for (const formerParentId of formerParents) {
        const oldParent = await figma.getNodeByIdAsync(formerParentId) as any;
        if (
          oldParent &&
          oldParent.id !== componentSet.id &&
          Array.isArray(oldParent.children) &&
          oldParent.children.length === 0
        ) {
          emptyFormerParentIds.push(oldParent.id);
        }
      }

      figma.commitUndo();

      return {
        type: request.type,
        requestId: request.requestId,
        data: {
          componentSetId: componentSet.id,
          name: componentSet.name,
          parentId: componentSet.parent?.id || null,
          propertyName,
          bounds: getBounds(componentSet),
          variants: componentSet.children.map((child: any) => ({
            id: child.id,
            name: child.name,
            variantProperties: child.variantProperties || null,
            bounds: getBounds(child),
          })),
          formerParentIds: formerParents,
          emptyFormerParentIds,
        },
      };
    }

    default:
      return null;
  }
};

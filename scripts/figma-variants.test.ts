import { beforeEach, expect, test } from 'bun:test';
import { handleComponentV2Request as sourceHandler } from '../vendor/figma-mcp/plugin/src/components-v2';
import { pluginDispatch } from './figma-plugin-test-dispatch';
const handleComponentV2Request = (r: any) => pluginDispatch(r, sourceHandler);

let nodes: Record<string, any>;
let combines: number;
let combineError: boolean;
let layoutError: boolean;

function node(id: string, type: string, parent: any = null, name = type): any {
  const n: any = { id, type, name, parent, children: [], x: 0, y: 0, width: 100, height: 40 };
  nodes[id] = n;
  if (parent) parent.children.push(n);
  return n;
}
beforeEach(() => {
  nodes = {}; combines = 0; combineError = false; layoutError = false;
  const page = node('0:1', 'PAGE');
  const library = node('1:1', 'FRAME', page);
  node('1:2', 'COMPONENT', library, 'Button / Default');
  node('1:3', 'COMPONENT', library, 'Button / Hover');
  (globalThis as any).figma = {
    getNodeByIdAsync: async (id: string) => nodes[id] || null,
    commitUndo() {},
    combineAsVariants(components: any[], parent: any) {
      combines++;
      if (combineError) throw new Error('native combine rejected');
      const set = node('1:9', 'COMPONENT_SET', parent);
      set.resizeWithoutConstraints = (w: number, h: number) => {
        if (layoutError) throw new Error('layout rejected');
        set.width = w; set.height = h;
      };
      for (const component of components) {
        component.parent.children.splice(component.parent.children.indexOf(component), 1);
        component.parent = set; set.children.push(component);
        component.variantProperties = { State: component.name.split('=')[1] };
      }
      return set;
    }
  };
});
const request = (params: any = {}, nodeIds = ['1:2', '1:3']) => ({ type: 'combine_as_variants', requestId: 'audit', nodeIds, params });

test('combines existing IDs, derives values, selects common parent, and lays out the set', async () => {
  const result = await handleComponentV2Request(request({ name: 'Button' }));
  expect(result?.data.parentId).toBe('1:1');
  expect(result?.data.variants.map((v: any) => v.id)).toEqual(['1:2', '1:3']);
  expect(result?.data.variants.map((v: any) => v.name)).toEqual(['State=Default', 'State=Hover']);
  expect(result?.data.bounds).toEqual({ x: 0, y: 0, width: 272, height: 88 });
  expect(nodes['1:3'].x).toBe(148);
});
test('selects the nearest safe common ancestor across wrappers and reports empty wrappers', async () => {
  const library = nodes['1:1']; library.children = [];
  const wrappers = [node('2:1', 'FRAME', library), node('2:2', 'FRAME', library)];
  ['1:2', '1:3'].forEach((id, index) => { nodes[id].parent = wrappers[index]; wrappers[index].children.push(nodes[id]); });
  const result = await handleComponentV2Request(request());
  expect(result?.data.parentId).toBe('1:1');
  expect(result?.data.emptyFormerParentIds).toEqual(['2:1', '2:2']);
  expect(nodes['2:1']).toBeDefined();
});
test('rejects missing, non-component, already-combined, and too-short inputs before writes', async () => {
  await expect(handleComponentV2Request(request({}, ['missing', '1:3']))).rejects.toThrow('Component not found');
  await expect(handleComponentV2Request(request({}, ['1:1', '1:3']))).rejects.toThrow('expected COMPONENT');
  await expect(handleComponentV2Request(request({}, ['1:2']))).rejects.toThrow('at least 2');
  nodes['1:2'].parent = node('2:1', 'COMPONENT_SET', nodes['0:1']);
  await expect(handleComponentV2Request(request())).rejects.toThrow('already inside');
  expect(combines).toBe(0);
});
test('rejects components or an explicit parent on another page', async () => {
  const page = node('0:2', 'PAGE');
  await expect(handleComponentV2Request(request({ parentId: page.id }))).rejects.toThrow('same page');
  nodes['1:3'].parent = page;
  await expect(handleComponentV2Request(request())).rejects.toThrow('same Figma page');
  expect(combines).toBe(0);
});
test('rejects unsafe explicit parents and duplicate/empty/mismatched variant values', async () => {
  await expect(handleComponentV2Request(request({ parentId: '1:2' }))).rejects.toThrow('cannot safely');
  await expect(handleComponentV2Request(request({ variantValues: ['Default', 'default'] }))).rejects.toThrow('unique');
  await expect(handleComponentV2Request(request({ variantValues: ['Default', ' '] }))).rejects.toThrow('empty');
  await expect(handleComponentV2Request(request({ variantValues: ['Default'] }))).rejects.toThrow('length');
  expect(nodes['1:2'].name).toBe('Button / Default');
  expect(combines).toBe(0);
});
test('restores original names when the native combine itself rejects', async () => {
  combineError = true;
  await expect(handleComponentV2Request(request())).rejects.toThrow('native combine rejected');
  expect(nodes['1:2'].name).toBe('Button / Default');
  expect(nodes['1:3'].name).toBe('Button / Hover');
  expect(nodes['1:2'].parent.id).toBe('1:1');
});
test('a post-combine layout failure is partial success requiring read-back, not a safe retry', async () => {
  layoutError = true;
  await expect(handleComponentV2Request(request())).rejects.toThrow('layout rejected');
  expect(nodes['1:9'].type).toBe('COMPONENT_SET');
  expect(nodes['1:2'].parent.id).toBe('1:9');
  expect(combines).toBe(1);
});

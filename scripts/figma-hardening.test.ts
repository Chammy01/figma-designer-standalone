import { describe, it, expect } from 'bun:test';
import { handleWritePrototypeRequest as sourcePrototype } from '../vendor/figma-mcp/plugin/src/write-prototype';
import { handleValidationRequest as sourceValidation } from '../vendor/figma-mcp/plugin/src/validation';
import { pluginDispatch } from './figma-plugin-test-dispatch';
const handleWritePrototypeRequest = (r: any) => pluginDispatch(r, sourcePrototype);
const handleValidationRequest = (r: any) => pluginDispatch(r, sourceValidation);

const back = { trigger: { type: 'ON_CLICK' }, actions: [{ type: 'BACK' }] };
const close = { trigger: { type: 'ON_HOVER' }, actions: [{ type: 'CLOSE' }] };
const invalid = [
  ['set_reactions', {}], ['set_reactions', { reactions: 'broken' }],
  ['set_reactions', { reactions: '{}' }], ['set_reactions', { reactions: null }],
  ['set_reactions', { reactions: [{}] }], ['set_reactions', { reactions: [null] }],
  ['set_reactions', { reactions: [{ trigger: {}, actions: [{ type: 'BACK' }] }] }],
  ['set_reactions', { reactions: [{ trigger: { type: 'ON_CLICK' }, actions: [{}] }] }],
  ['set_reactions', { reactions: [back], mode: 'oops' }],
  ['set_reactions', { reactions: [back], mode: 3 }],
  ['remove_reactions', { indices: 'broken' }], ['remove_reactions', { indices: '{}' }],
  ['remove_reactions', { indices: null }], ['remove_reactions', { indices: [-1] }],
  ['remove_reactions', { indices: [0.5] }], ['remove_reactions', { indices: ['0'] }],
  ...['SET_VARIABLE', 'SET_VARIABLE_MODE', 'UPDATE_MEDIA_RUNTIME', 'CONDITIONAL'].map(type => ['set_reactions', { reactions: [{ trigger: { type: 'ON_CLICK' }, actions: [{ type }] }] }] as const),
] as const;

describe('B04: invalid requests leave reactions exactly intact', () => {
  for (const [type, params] of invalid) it(`${type} ${JSON.stringify(params)}`, async () => {
    const original = structuredClone([back, close]);
    let writes = 0;
    const node = { id: '1:2', name: 'Button', reactions: structuredClone(original),
      setReactionsAsync: async (value: any) => { writes++; node.reactions = value; } };
    (globalThis as any).figma = { getNodeByIdAsync: async () => node, commitUndo: () => { writes++; } };
    let rejected = false;
    try { await handleWritePrototypeRequest({ type, nodeIds: ['1:2'], params }); } catch { rejected = true; }
    expect(node.reactions).toEqual(original);
    expect(writes).toBe(0);
    expect(rejected).toBe(true);
  });
});

describe('B04: intentional operations remain supported', () => {
  const cases = [
    ['set_reactions', { reactions: [], mode: 'replace' }, []],
    ['set_reactions', { reactions: [close], mode: 'append' }, [back, close]],
    ['set_reactions', { reactions: JSON.stringify([close]) }, [close]],
    ['remove_reactions', { indices: [0] }, []],
    ['remove_reactions', { indices: '[]' }, []], ['remove_reactions', {}, []],
    ['set_reactions', { reactions: [{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', navigation: 'SCROLL_TO', destinationId: '1:3', transition: null }] }] },
      [{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', navigation: 'SCROLL_TO', destinationId: '1:3', transition: null }] }]],
  ] as const;
  for (const [type, params, expected] of cases) it(`${type} ${JSON.stringify(params)}`, async () => {
    let writes = 0;
    const node = { id: '1:2', reactions: [back], setReactionsAsync: async (value: any) => { writes++; node.reactions = value; } };
    (globalThis as any).figma = { getNodeByIdAsync: async () => node, commitUndo: () => {} };
    await handleWritePrototypeRequest({ type, nodeIds: ['1:2'], params });
    expect(node.reactions).toEqual(expected);
    expect(writes).toBe(1);
  });
});

describe('B05: read-only structural comparison', () => {
  for (const [actual, expected] of [[0, 1], [1, 0], [1, 3], [3, 1], [2, 2]]) {
    it(`${actual} actual / ${expected} expected children`, async () => {
      const node = { id: '1:2', type: 'FRAME', children: Array.from({ length: actual }, (_, i) => ({ id: `1:${i + 3}`, type: 'FRAME', children: [] })) };
      const before = structuredClone(node);
      (globalThis as any).figma = { getNodeByIdAsync: async () => node };
      const result = await handleValidationRequest({ type: 'diff_node_vs_html', nodeIds: ['1:2'], params: { targetHtml: `<div>${'<div></div>'.repeat(expected)}</div>` } });
      expect(result?.data.diffs.filter((d: any) => d.field === 'children')).toHaveLength(Math.abs(actual - expected));
      expect(node).toEqual(before);
      expect(result?.data.patch).toEqual([]);
    });
  }
  it('reports an expected child when the actual node has no children property', async () => {
    (globalThis as any).figma = { getNodeByIdAsync: async () => ({ id: '1:2', type: 'RECTANGLE' }) };
    const result = await handleValidationRequest({ type: 'diff_node_vs_html', nodeIds: ['1:2'], params: { targetHtml: '<div><div></div></div>' } });
    expect(result?.data.diffs).toEqual([{ nodeId: '1:2', field: 'children', index: 0, kind: 'missing', current: null, target: 'div' }]);
    expect(result?.data.patch).toEqual([]);
  });
  it('preserves supported property comparisons without writing', async () => {
    const node = Object.freeze({ id: '1:2', type: 'FRAME', width: 100, children: [] });
    (globalThis as any).figma = { getNodeByIdAsync: async () => node };
    const result = await handleValidationRequest({ type: 'diff_node_vs_html', nodeIds: ['1:2'], params: { targetHtml: '<div style="width:120px"></div>' } });
    expect(result?.data.diffs).toEqual([{ nodeId: '1:2', field: 'width', current: 100, target: 120 }]);
    expect(node.width).toBe(100);
  });
});

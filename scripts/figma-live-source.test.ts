import { test, expect } from 'bun:test';
import { collectBrowserSource } from '../vendor/figma-mcp/plugin/src/browser-source';
import { normalizeSource, evidenceForProjection, collectLiveSource, bindExportSource, readSourceRPC } from './figma-live-source.mjs';
import { classifyFreshness, sourceFingerprint, runnerVersion, sourceProjectionVersion } from './figma-browser-freshness.mjs';
import { pluginDispatch } from './figma-plugin-test-dispatch';
import { beginExport, finishExport } from './figma-browser-source.mjs';
import { browserStatus } from './figma-browser-status.mjs';
import { artifactHashes } from './figma-browser-freshness.mjs';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import statefulActions from './fixtures/stateful-actions.json';
import { handleWritePrototypeRequest } from '../vendor/figma-mcp/plugin/src/write-prototype';
import overlayCapability from './fixtures/overlay-capability.json';
import { motionTokens, transitionMatches } from '../rules/figma-motion-semantics.mjs';
import motionAudit from './fixtures/figma-motion-capabilities.json';
import smoothScrollLive from './fixtures/native-scroll-live.json';

function fixture() {
  const nodes = new Map<string, any>();
  function node(id: string, type: string, parent: any, props: any = {}) {
    const n: any = { id, type, name: id, parent, x: 0, y: 0, width: 100, height: 40, rotation: 0,
      visible: true, opacity: 1, fills: [], strokes: [], effects: [], reactions: [], ...props };
    if (!['TEXT', 'RECTANGLE'].includes(type)) n.children ??= [];
    if (parent?.children) parent.children.push(n);
    nodes.set(id, n); return n;
  }
  const page = node('0:1', 'PAGE', null, { selection: [] });
  const runtime = node('4:422', 'SECTION', page, { name: 'Figma Designer — Interactive App' });
  const screen = node('4:423', 'FRAME', runtime);
  const text = node('4:424', 'TEXT', screen, { characters: 'Hello', fontSize: 16,
    getStyledTextSegments: () => [{ start: 0, end: 5, characters: text.characters, fontSize: text.fontSize, fills: text.fills }] });
  const library = node('4:350', 'FRAME', page);
  const set = node('4:10', 'COMPONENT_SET', library);
  const component = node('4:11', 'COMPONENT', set, { variantProperties: { State: 'Default' } });
  const hover = node('4:12', 'COMPONENT', set, { variantProperties: { State: 'Hover' } });
  const unused = node('4:99', 'COMPONENT', library);
  const instance = node('4:425', 'INSTANCE', screen, { getMainComponentAsync: async () => component,
    componentProperties: { State: { type: 'VARIANT', value: 'Default' } } });
  const api: any = { root: { id: '0:0', name: 'Fixture' }, currentPage: page, fileKey: 'fixture-key',
    getNodeByIdAsync: async (id: string) => nodes.get(id),
    variables: { getVariableByIdAsync: async () => null, getVariableCollectionByIdAsync: async () => null } };
  return { api, page, runtime, screen, text, instance, set, component, hover, unused, nodes, node };
}
const projection = async (f: any) => (await collectBrowserSource(f.api, f.runtime)).projection;
const fingerprint = async (f: any) => evidenceForProjection(await projection(f)).sourceFingerprint;

// Phase-0 evidence only: no rich-overlay workflow is enabled by these fixtures.
function overlayFixture() {
  const f = fixture();
  const overlay = f.node('47:11', 'FRAME', f.page, structuredClone(overlayCapability.defaultFrameSettings));
  const text = f.node('47:13', 'TEXT', overlay, { characters: 'Supplied details', getStyledTextSegments: () => [] });
  const close = f.node('47:14', 'FRAME', overlay, { reactions: [structuredClone(overlayCapability.close)] });
  f.screen.reactions = [structuredClone(overlayCapability.open)];
  return { ...f, overlay, overlayText: text, close };
}

test('overlay audit records native placement rejection separately from observed modal playback', () => {
  expect(overlayCapability.status).toBe('PASS');
  expect(overlayCapability.relativePositionRequest.actions[0].overlayRelativePosition).toEqual({ x: 24, y: 170 });
  expect(overlayCapability.relativePositionError).toContain('MANUAL');
  expect(overlayCapability.playback.contextualPopover).toBe('BLOCKED');
  expect(overlayCapability.playback.tooltip).toBe('NOT_VERIFIED');
  expect(overlayCapability.playback.outsideClickDismisses).toBe(false);
  expect(transitionMatches(overlayCapability.open.actions[0].transition, motionTokens.OVERLAY_DEFAULT)).toBe(true);
});

test('existing prototype writer passes exact OVERLAY and CLOSE shapes without changing semantics', async () => {
  for (const reaction of [overlayCapability.open, overlayCapability.close]) {
    let undo = 0;
    const n: any = { id: '47:5', name: 'Audit trigger', reactions: [], setReactionsAsync: async (r: any) => { n.reactions = r; } };
    (globalThis as any).figma = { getNodeByIdAsync: async () => n, commitUndo: () => { undo++; } };
    const before = structuredClone(reaction);
    await handleWritePrototypeRequest({ type: 'set_reactions', nodeIds: [n.id], params: { reactions: [reaction] } });
    expect(n.reactions).toEqual([before]); expect(reaction).toEqual(before); expect(undo).toBe(1);
  }
});

test('native MANUAL-placement rejection propagates without committing or changing an existing edge', async () => {
  let attempted: any;
  const original = [structuredClone(overlayCapability.close)];
  const n = { id: '47:7', name: 'Audit Status', reactions: original, setReactionsAsync: async (r: any) => { attempted = r; throw new Error(overlayCapability.relativePositionError); } };
  (globalThis as any).figma = { getNodeByIdAsync: async () => n, commitUndo: () => { throw new Error('Unexpected commit'); } };
  await expect(handleWritePrototypeRequest({ type: 'set_reactions', nodeIds: [n.id], params: { reactions: [overlayCapability.relativePositionRequest] } })).rejects.toThrow(overlayCapability.relativePositionError);
  expect(attempted).toEqual([overlayCapability.relativePositionRequest]); expect(n.reactions).toEqual(original);
});

test('source closure captures native overlay settings, complete open/close arrays and content without writes', async () => {
  const f = overlayFixture(); const before = structuredClone(f.screen.reactions);
  f.api.commitUndo = () => { throw new Error('WRITE'); };
  const raw = await projection(f);
  const overlay = raw.dependencies.find((n: any) => n.id === f.overlay.id);
  expect(overlay.props.overlayPositionType).toBe('CENTER');
  expect(overlay.props.overlayBackground).toEqual({ type: 'NONE' });
  expect(overlay.props.overlayBackgroundInteraction).toBe('NONE');
  expect(overlay.children.find((n: any) => n.id === f.close.id).reactions).toEqual([overlayCapability.close]);
  expect(overlay.children.find((n: any) => n.id === f.overlayText.id).props.characters).toBe('Supplied details');
  expect(raw.runtime.children[0].reactions).toEqual(before); expect(f.screen.reactions).toEqual(before);
});

for (const [name, change] of [
  ['overlay position mode', (f: any) => { f.overlay.overlayPositionType = 'MANUAL'; }],
  ['overlay dimming', (f: any) => { f.overlay.overlayBackground = { type: 'SOLID_COLOR', color: { r: 0, g: 0, b: 0, a: 0.3 } }; }],
  ['outside-click behavior', (f: any) => { f.overlay.overlayBackgroundInteraction = 'CLOSE_ON_CLICK_OUTSIDE'; }],
  ['overlay content', (f: any) => { f.overlayText.characters = 'Different supplied content'; }],
  ['relative placement', (f: any) => { f.screen.reactions[0].actions[0].overlayRelativePosition = { x: 24, y: 170 }; }],
  ['close semantics', (f: any) => { f.close.reactions[0].actions[0].type = 'BACK'; }],
] as const) test(`${name} changes source fingerprint (capture only, not authoring support)`, async () => {
  const f = overlayFixture(), before = await fingerprint(f); change(f);
  expect(await fingerprint(f)).not.toEqual(before);
});

test('unrelated production content is excluded while runtime-owned overlay FRAMEs are captured', async () => {
  const f = overlayFixture(); const unrelated = f.node('47:99', 'TEXT', f.page, { characters: 'Unrelated' });
  f.page.children = f.page.children.filter((n: any) => n !== f.overlay);
  f.runtime.children.push(f.overlay); f.overlay.parent = f.runtime;
  const before = await fingerprint(f); unrelated.characters = 'Changed';
  expect(await fingerprint(f)).toEqual(before);
  const raw = await projection(f);
  expect(raw.runtime.children.some((n: any) => n.id === f.overlay.id && n.parentId === f.runtime.id)).toBe(true);
  expect(raw.dependencies.some((n: any) => n.id === f.overlay.id)).toBe(false);
});

test('canonical numbers have a fixed normalized hash vector', () => {
  expect(normalizeSource({ b: 0.15000000596, a: 123.9999999 })).toEqual({ a: 124, b: 0.15 });
  expect(sourceFingerprint(normalizeSource({ b: 0.15000000596, a: 123.9999999 })).sha256).toBe('1ad4b277012d3731f2b44ed16c786c6ef9d2ef1b8e1906abc8c264556558577f');
  expect(() => normalizeSource({ value: Infinity })).toThrow();
});
test('object order is irrelevant, child order is meaningful', async () => {
  const f = fixture(), original = await fingerprint(f);
  f.text.fills = [];
  expect(await fingerprint(f)).toEqual(original);
  const raw = await projection(f);
  expect(evidenceForProjection(Object.fromEntries(Object.entries(raw).reverse())).sourceFingerprint).toEqual(original);
  f.screen.children.reverse();
  expect(await fingerprint(f)).not.toEqual(original);
});
for (const [name, change] of [
  ['text', (f: any) => { f.text.characters = 'Changed'; }],
  ['geometry', (f: any) => { f.text.x = 2; }],
  ['fill', (f: any) => { f.screen.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0, b: 0 } }]; }],
  ['typography', (f: any) => { f.text.fontSize = 18; }],
  ['visibility', (f: any) => { f.text.visible = false; }],
  ['runtime visibility', (f: any) => { f.runtime.visible = false; }],
  ['instance override', (f: any) => { f.instance.opacity = 0.5; }],
  ['component set', (f: any) => { f.set.id = '4:100'; }],
  ['referenced variant style', (f: any) => { f.hover.opacity = 0.4; }],
  ['referenced variant behavior', (f: any) => { f.hover.reactions = [{ trigger: { type: 'ON_HOVER' }, actions: [{ type: 'BACK' }] }]; }],
  ['source swap', (f: any) => { f.instance.getMainComponentAsync = async () => f.unused; }],
] as const) test(`${name} invalidates source`, async () => {
  const f = fixture(), before = await fingerprint(f); change(f); expect(await fingerprint(f)).not.toEqual(before);
});
test('reaction destination, trigger, action, duration and scroll behavior are included', async () => {
  const f = fixture();
  const overlay = f.node('4:50', 'FRAME', f.page);
  f.screen.reactions = [{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', navigation: 'OVERLAY', destinationId: overlay.id, transition: null, preserveScrollPosition: false }] }];
  const original = await fingerprint(f);
  const action = f.screen.reactions[0].actions[0];
  action.destinationId = f.component.id; expect(await fingerprint(f)).not.toEqual(original);
  action.destinationId = overlay.id; f.screen.reactions[0].trigger.type = 'ON_HOVER'; expect(await fingerprint(f)).not.toEqual(original);
  f.screen.reactions[0].trigger.type = 'ON_CLICK'; action.navigation = 'NAVIGATE'; expect(await fingerprint(f)).not.toEqual(original);
  action.navigation = 'OVERLAY'; action.preserveScrollPosition = true; expect(await fingerprint(f)).not.toEqual(original);
  action.preserveScrollPosition = false; overlay.opacity = 0.2; expect(await fingerprint(f)).not.toEqual(original);
  action.transition = { type: 'DISSOLVE', duration: 0.15, easing: { type: 'EASE_OUT' } };
  const motion = await fingerprint(f);
  action.transition.duration = 0.15000000596; expect(await fingerprint(f)).toEqual(motion);
  action.transition.duration = 0.16; expect(await fingerprint(f)).not.toEqual(motion);
  action.transition.duration = 0.15; action.transition.easing.type = 'EASE_IN'; expect(await fingerprint(f)).not.toEqual(motion);
});
test('unused library, selection and root canvas placement are excluded', async () => {
  const f = fixture(), before = await fingerprint(f);
  f.unused.opacity = 0.1; f.page.selection = [f.text]; f.api.viewport = { zoom: 2 };
  f.runtime.x = 2000; f.screen.x = 800; f.set.x = 300; f.component.x = 200;
  expect(await fingerprint(f)).toEqual(before);
});
test('float32 read-back noise is ignored but meaningful differences remain', async () => {
  const f = fixture(); f.text.x = 124; f.text.lineHeight = { unit: 'PIXELS', value: 16.8 }; f.text.relativeTransform = [[1, 0, 124], [0, 1, 0]]; const before = await fingerprint(f);
  f.text.lineHeight.value = 16.799999237; expect(await fingerprint(f)).toEqual(before);
  f.text.x = 123.9999999; f.text.relativeTransform[0][2] = 123.9999999; expect(await fingerprint(f)).toEqual(before);
  f.text.x = 124.02; expect(await fingerprint(f)).not.toEqual(before);
});
test('variable values and alias closure affect source, unused variables do not', async () => {
  const f = fixture();
  const variable: any = { id: 'VariableID:1:1', variableCollectionId: 'VariableCollectionId:1:2', resolvedType: 'FLOAT', valuesByMode: { m: 16 } };
  const unused: any = { ...variable, id: 'VariableID:1:3', valuesByMode: { m: 20 } };
  f.text.boundVariables = { fontSize: { type: 'VARIABLE_ALIAS', id: variable.id } };
  f.api.variables.getVariableByIdAsync = async (id: string) => id === variable.id ? variable : unused;
  f.api.variables.getVariableCollectionByIdAsync = async () => ({ id: variable.variableCollectionId, modes: [{ modeId: 'm', name: 'Default' }], defaultModeId: 'm' });
  const before = await fingerprint(f); unused.valuesByMode.m = 99; expect(await fingerprint(f)).toEqual(before);
  variable.valuesByMode.m = 18;
  expect(await fingerprint(f)).not.toEqual(before);
  variable.valuesByMode.m = { type: 'VARIABLE_ALIAS', id: unused.id };
  const aliased = await fingerprint(f); unused.valuesByMode.m = 21;
  expect(await fingerprint(f)).not.toEqual(aliased);
});

// Native authoring is plan-blocked; this fixture tests capture, not Figma playback.
function statefulFixture() {
  const f = fixture(), variable = structuredClone(statefulActions.variable);
  for (const action of statefulActions.conditional.conditionalBlocks.flatMap(b => b.actions)) f.node(action.destinationId, 'FRAME', f.page);
  f.screen.reactions = [{ trigger: { type: 'ON_CLICK' }, actions: [structuredClone(statefulActions.setVariable), structuredClone(statefulActions.conditional)] }];
  f.api.variables.getVariableByIdAsync = async (id: string) => id === variable.id ? variable : null;
  f.api.variables.getVariableCollectionByIdAsync = async () => ({ id: variable.variableCollectionId, defaultModeId: '42:0', modes: [{ modeId: '42:0', name: 'Mode 1' }] });
  return { ...f, variable };
}

test('stateful plugin pass-through propagates native plan rejection without committing', async () => {
  for (const [action, error] of [[statefulActions.setVariable, statefulActions.setVariableError], [statefulActions.conditional, statefulActions.conditionalError]] as const) {
    let attempted: any;
    const nativeNode = { id: '42:836', name: 'Disposable probe', reactions: [], setReactionsAsync: async (reactions: any) => { attempted = reactions; throw new Error(error); } };
    (globalThis as any).figma = { getNodeByIdAsync: async () => nativeNode, commitUndo: () => { throw new Error('WRITE'); } };
    const reactions = [{ trigger: { type: 'ON_CLICK' }, actions: [action] }];
    await expect(handleWritePrototypeRequest({ type: 'set_reactions', nodeIds: [nativeNode.id], params: { mode: 'replace', reactions } })).rejects.toThrow(error);
    expect(attempted).toEqual(reactions);
    expect(nativeNode.reactions).toEqual([]);
  }
});

test('SET_VARIABLE capture preserves action/value and variable closure without writes', async () => {
  const f = statefulFixture(); f.screen.reactions[0].actions.pop();
  const reactions = structuredClone(f.screen.reactions);
  f.api.commitUndo = () => { throw new Error('WRITE'); };
  const raw = await projection(f);
  expect(raw.runtime.children[0].reactions).toEqual(reactions);
  expect(raw.variables).toEqual([f.variable]);
  expect(raw.collections).toEqual([{ id: f.variable.variableCollectionId, defaultModeId: '42:0', modes: [{ modeId: '42:0', name: 'Mode 1' }] }]);
  expect(f.screen.reactions).toEqual(reactions);
});

test('SET_VARIABLE value/default changes invalidate source', async () => {
  for (const change of [
    (f: any) => { f.variable.valuesByMode['42:0'] = true; },
    (f: any) => { f.screen.reactions[0].actions[0].variableValue.value = false; },
  ]) {
    const f = statefulFixture(); f.screen.reactions[0].actions.pop();
    const before = await fingerprint(f); change(f);
    expect(await fingerprint(f)).not.toEqual(before);
  }
});

test('exact conditional operand wrapper captures its concrete alias and stays verified', async () => {
  const f = statefulFixture(); f.screen.reactions[0].actions.shift();
  const seen: any[] = [];
  f.api.variables.getVariableByIdAsync = async (id: string) => { seen.push(id); return id === f.variable.id ? f.variable : null; };
  f.api.commitUndo = () => { throw new Error('WRITE'); };
  const original = structuredClone(f.screen.reactions);
  (globalThis as any).figma = f.api;
  const response = await pluginDispatch({ type: 'get_node', nodeIds: [f.page.id], params: { browserSource: true } }, async () => ({ data: await collectBrowserSource(f.api, f.runtime) }));
  const raw = response.data.projection;
  expect(seen).toEqual([f.variable.id]);
  expect(raw.variables).toEqual([f.variable]);
  expect(raw.runtime.children[0].reactions).toEqual(original);
  expect(raw.dependencies.map((n: any) => n.id)).toContain('42:850');
  expect(raw.dependencies.map((n: any) => n.id)).toContain('42:854');
  const read: any = async (tool: string) => tool === 'get_metadata' ? { currentPageId: f.page.id } : await collectBrowserSource(f.api, f.runtime);
  expect((await collectLiveSource(read)).status).toBe('AVAILABLE');
  expect(f.screen.reactions).toEqual(original);
  const g = statefulFixture(); g.nodes.delete('42:850');
  await expect(projection(g)).rejects.toThrow('Missing reaction destination');
});

test('literal conditional operands do not invent variable references', async () => {
  const f = statefulFixture(); f.screen.reactions[0].actions.shift();
  f.screen.reactions[0].actions[0].conditionalBlocks[0].condition.value.expressionArguments[0] = { type: 'BOOLEAN', resolvedType: 'BOOLEAN', value: false };
  f.api.variables.getVariableByIdAsync = async () => { throw new Error('Unexpected variable lookup'); };
  expect((await projection(f)).variables).toEqual([]);
});

test('nested conditional actions and alias-to-alias mode values retain complete closure', async () => {
  const f = statefulFixture();
  const target = { ...f.variable, id: 'VariableID:42:900', valuesByMode: { '42:0': true } };
  const unused = { ...structuredClone(target), id: 'VariableID:42:901' };
  (f.variable.valuesByMode as any)['42:0'] = { type: 'VARIABLE_ALIAS', id: target.id };
  f.api.variables.getVariableByIdAsync = async (id: string) => id === f.variable.id ? f.variable : id === target.id ? target : id === unused.id ? unused : null;
  const inner = structuredClone(f.screen.reactions[0].actions[1]);
  f.screen.reactions = [{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'CONDITIONAL', conditionalBlocks: [{ actions: [inner] }] }] }];
  const raw = await projection(f), before = await fingerprint(f);
  expect(raw.runtime.children[0].reactions).toEqual(f.screen.reactions);
  expect(raw.variables.map((v: any) => v.id)).toEqual([f.variable.id, target.id]);
  unused.valuesByMode['42:0'] = false;
  expect(await fingerprint(f)).toEqual(before);
  target.valuesByMode['42:0'] = false;
  expect(await fingerprint(f)).not.toEqual(before);
});

test('conditional operands and referenced values affect fingerprints, unrelated variables do not', async () => {
  const f = statefulFixture(); f.screen.reactions[0].actions.shift();
  const before = await fingerprint(f);
  f.variable.valuesByMode['42:0'] = true;
  expect(await fingerprint(f)).not.toEqual(before);
  f.variable.valuesByMode['42:0'] = false;
  f.screen.reactions[0].actions[0].conditionalBlocks[0].condition.value.expressionArguments[1].value = false;
  expect(await fingerprint(f)).not.toEqual(before);
});

test('SET_VARIABLE_MODE discovers collection metadata without a variable alias', async () => {
  const f = statefulFixture();
  f.screen.reactions = [{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'SET_VARIABLE_MODE', variableCollectionId: f.variable.variableCollectionId, variableModeId: '42:0' }] }];
  f.api.variables.getVariableByIdAsync = async () => { throw new Error('Unexpected variable lookup'); };
  const raw = await projection(f);
  expect(raw.variables).toEqual([]);
  expect(raw.collections).toEqual([{ id: f.variable.variableCollectionId, defaultModeId: '42:0', modes: [{ modeId: '42:0', name: 'Mode 1' }] }]);
});

for (const alias of [
  { type: 'VARIABLE_ALIAS' }, { type: 'VARIABLE_ALIAS', id: null },
  { type: 'VARIABLE_ALIAS', id: 42 }, { type: 'VARIABLE_ALIAS', id: '' },
  { type: 'VARIABLE_ALIAS', id: ' ' }, { type: 'VARIABLE_ALIAS', value: null },
  { type: 'VARIABLE_ALIAS', value: { type: 'BOOLEAN', value: true } },
  { type: 'VARIABLE_ALIAS', value: { type: 'VARIABLE_ALIAS' } },
  { type: 'VARIABLE_ALIAS', value: { type: 'VARIABLE_ALIAS', id: null } },
]) test(`malformed alias fails safely: ${JSON.stringify(alias)}`, async () => {
  const f = fixture(); f.text.boundVariables = { visible: alias };
  f.api.variables.getVariableByIdAsync = async () => { throw new Error('Malformed ID must not reach lookup'); };
  await expect(projection(f)).rejects.toThrow('Malformed variable alias');
});

test('unresolved concrete alias fails safely', async () => {
  const f = fixture(); f.text.boundVariables = { visible: { type: 'VARIABLE_ALIAS', id: 'VariableID:42:999' } };
  await expect(projection(f)).rejects.toThrow('Unresolved variable: VariableID:42:999');
});

test('plain bound-property alias collects its concrete variable ID', async () => {
  const f = statefulFixture(); f.screen.reactions = [];
  f.text.boundVariables = { visible: { type: 'VARIABLE_ALIAS', id: f.variable.id } };
  expect((await projection(f)).variables).toEqual([f.variable]);
});
test('incomplete references and unsupported content fail safely', async () => {
  const f = fixture(); f.instance.getMainComponentAsync = async () => null;
  await expect(projection(f)).rejects.toThrow();
  const g = fixture(); g.node('4:89', 'VIDEO', g.screen);
  await expect(projection(g)).rejects.toThrow();
});
test('variant property definitions are read from the family, not an illegal variant getter', async () => {
  const f = fixture();
  Object.defineProperty(f.component, 'componentPropertyDefinitions', { get() { throw new Error('Illegal native variant getter'); } });
  expect((await projection(f)).families[0].id).toBe(f.set.id);
});
test('collector and packaged read dispatcher make zero node or undo writes', async () => {
  const f = fixture();
  f.api.commitUndo = () => { throw new Error('WRITE'); };
  for (const n of f.nodes.values()) { if (n.children) Object.freeze(n.children); Object.freeze(n); }
  (globalThis as any).figma = f.api;
  const result = await pluginDispatch({ type: 'get_node', nodeIds: [f.page.id], params: { browserSource: true } }, async () => ({ data: await collectBrowserSource(f.api, f.runtime) }));
  expect(result.data.projection.runtime.id).toBe('4:422');
});
test('collection errors and changing reads become UNVERIFIED', async () => {
  const f = fixture(), a = await collectBrowserSource(f.api, f.runtime);
  f.text.characters = 'Changed'; const b = await collectBrowserSource(f.api, f.runtime);
  let count = 0;
  const read: any = async (tool: string) => tool === 'get_metadata' ? { currentPageId: f.page.id } : count++ === 0 ? a : b;
  expect((await collectLiveSource(read)).status).toBe('UNVERIFIED');
  expect((await collectLiveSource(async () => { throw new Error('Disconnected'); })).status).toBe('UNVERIFIED');
});
test('classification requires comparable projection evidence independently of acceptance', async () => {
  const f = fixture(), a = evidenceForProjection(await projection(f));
  const manifest: any = { version: 2, runtimeSectionId: f.runtime.id, ...a, sourceExportState: 'STABLE', exportRunId: 'run-a' };
  const hashes = { 'figma-browser.json': 'abc' };
  const report: any = { artifactSha256: hashes, manifestSha256: 'abc', runnerVersion, systemVersion: '1.2.1', sourceFingerprint: a.sourceFingerprint, exportRunId: 'run-a', sourceProjectionVersion, result: 'PASS' };
  expect(classifyFreshness(manifest, report, hashes, a).overall).toBe('CURRENT');
  f.text.characters = 'Changed'; const b = evidenceForProjection(await projection(f));
  const stale = classifyFreshness(manifest, report, hashes, b);
  expect(stale.source).toBe('STALE'); expect(stale.validationResult).toBe('PASS');
  for (const live of [undefined, { ...a, sourceProjectionVersion: 'future' }, { ...a, sourceFingerprint: { ...a.sourceFingerprint, algorithm: 'future' } }]) expect(classifyFreshness(manifest, report, hashes, live).source).toBe('UNVERIFIED');
  for (const changed of [{ ...manifest, sourceProjectionVersion: 'future' }, { ...manifest, fingerprintAlgorithm: 'future' }, { ...manifest, sourceFingerprint: { ...a.sourceFingerprint, algorithm: 'future' } }]) expect(classifyFreshness(changed, report, hashes, a).source).toBe('UNVERIFIED');
  expect(classifyFreshness({ ...manifest, sourceFingerprint: undefined }, report, hashes, a).source).toBe('UNVERIFIED');
  expect(classifyFreshness({ ...manifest, exportRunId: 'other' }, report, hashes, a).local).toBe('STALE');
  expect(classifyFreshness({ ...manifest, sourceRuntimeId: 'other', runtimeSectionId: 'other' }, report, hashes, a).source).toBe('UNVERIFIED');
});
test('export A to B records source change, unchanged export binds run ID', async () => {
  const f = fixture(), a = evidenceForProjection(await projection(f));
  const manifest: any = { version: 2, exportRunId: 'run-a', runtimeSectionId: f.runtime.id, screens: [{ id: f.screen.id }] };
  const before: any = { ...a, exportRunId: 'run-a', projection: await projection(f) };
  f.text.characters = 'Changed'; const b = evidenceForProjection(await projection(f));
  const result = bindExportSource(manifest, before, b);
  expect(result.sourceExportState).toBe('STALE'); expect(result.sourceEvidenceReason).toBe('SOURCE_CHANGED_DURING_EXPORT');
  expect(classifyFreshness(result, {}, {}, b).source).toBe('STALE');
  expect(bindExportSource(manifest, before, a).sourceExportState).toBe('STABLE');
  expect(bindExportSource(manifest, before, a).exportRunId).toBe('run-a');
  expect(bindExportSource({ ...manifest, exportRunId: 'old-run' }, before, a).sourceExportState).toBe('UNVERIFIED');
});
test('export files, report, and automatic status share live evidence and run ID', async () => {
  const f = fixture(); const capture = await collectBrowserSource(f.api, f.runtime);
  const read: any = async (tool: string) => tool === 'get_metadata' ? { currentPageId: f.page.id } : capture;
  const root = await mkdtemp(join(tmpdir(), 'figma-source-test-'));
  try {
    const before = await beginExport(root, read);
    await writeFile(join(root, 'figma-browser.json'), JSON.stringify({ version: 2, exportRunId: before.exportRunId, runtimeSectionId: f.runtime.id, screens: [{ id: f.screen.id }] }));
    const manifest = await finishExport(root, read);
    expect(manifest.sourceExportState).toBe('STABLE');
    const hashes = await artifactHashes(root);
    const report = { artifactSha256: hashes, manifestSha256: hashes['figma-browser.json'], runnerVersion, systemVersion: '1.2.1', sourceProjectionVersion, sourceFingerprint: manifest.sourceFingerprint, exportRunId: manifest.exportRunId, result: 'PASS' };
    await writeFile(join(root, 'figma-browser-test.json'), JSON.stringify(report));
    expect((await browserStatus(root, read)).overallFreshness).toBe('CURRENT');
    f.text.characters = 'Changed'; const changed = await collectBrowserSource(f.api, f.runtime);
    const changedRead: any = async (tool: string) => tool === 'get_metadata' ? { currentPageId: f.page.id } : changed;
    const status = await browserStatus(root, changedRead);
    expect(status.sourceFreshness).toBe('STALE'); expect(status.localFreshness).toBe('CURRENT'); expect(status.browserAcceptance).toBe('PASS');
    const offline = await browserStatus(root, async () => { throw new Error('No connection'); });
    expect(offline.sourceFreshness).toBe('UNVERIFIED'); expect(offline.localFreshness).toBe('CURRENT');
    const saved = await readFile(join(root, 'figma-source.json'), 'utf8');
    expect((await beginExport(root, async () => { throw new Error('No connection'); })).status).toBe('UNVERIFIED');
    expect(await readFile(join(root, 'figma-source.json'), 'utf8')).toBe(saved);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('missing browser artifacts still report live source, without writes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'figma-source-status-'));
  try {
    const status = await browserStatus(root, async () => { throw new Error('Disconnected'); });
    expect(status.manifestPresent).toBe(false); expect(status.reportPresent).toBe(false); expect(status.overallFreshness).toBe('UNVERIFIED');
    await writeFile(join(root, 'figma-browser.json'), 'invalid json');
    const invalid = await browserStatus(root, async () => { throw new Error('Disconnected'); });
    expect(invalid.manifestPresent).toBe(true); expect(invalid.overallFreshness).toBe('UNVERIFIED');
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('collector transport refuses write requests and ordinary node requests', async () => {
  await expect(readSourceRPC('set_reactions', ['4:425'], {})).rejects.toThrow();
  await expect(readSourceRPC('get_node', ['4:425'], {})).rejects.toThrow();
});

// Native readbacks are capture fixtures, not a simulated playback certification.
function motionCaptureFixture(reactions: any[]) {
  const f = fixture(); f.screen.reactions = structuredClone(reactions);
  for (const reaction of reactions) for (const action of reaction.actions ?? []) {
    if (action.destinationId && !f.nodes.has(action.destinationId)) {
      f.node(action.destinationId, action.navigation === 'CHANGE_TO' ? 'COMPONENT' : 'FRAME',
        action.navigation === 'CHANGE_TO' ? f.set : f.runtime);
    }
  }
  f.api.commitUndo = () => { throw new Error('SOURCE WRITE'); };
  for (const node of f.nodes.values()) node.setReactionsAsync = () => { throw new Error('SOURCE WRITE'); };
  return f;
}

test('motion inventory exactly matches installed pinned Plugin API transition/easing types', async () => {
  const types = await readFile(new URL('../vendor/figma-mcp/plugin/node_modules/@figma/plugin-typings/plugin-api.d.ts', import.meta.url), 'utf8');
  const pkg = JSON.parse(await readFile(new URL('../vendor/figma-mcp/plugin/node_modules/@figma/plugin-typings/package.json', import.meta.url), 'utf8'));
  expect(pkg.version).toBe(motionAudit.api.version);
  const block = (name: string) => types.match(new RegExp('interface '+name+' \\{([\\s\\S]*?)\\n\\}'))![1];
  const quoted = (s: string) => [...s.matchAll(/'([^']+)'/g)].map(m => m[1]);
  expect(quoted(block('SimpleTransition'))).toEqual(motionAudit.api.declarations.simple);
  const directional = quoted(block('DirectionalTransition'));
  expect(directional.slice(0,5)).toEqual(motionAudit.api.declarations.directional);
  expect(directional.slice(5)).toEqual(motionAudit.api.declarations.directions);
  expect(quoted(block('Easing'))).toEqual(motionAudit.api.declarations.easing);
  expect(block('EasingFunctionSpring')).toContain('initialVelocity: number');
});

test('source V1 losslessly captures every eligible retained native motion readback, without writes', async () => {
  const arrays = motionAudit.nativeProbes.filter(r => r.readback && !r.invalidDestinationContext)
    .map(r => ({ id: r.id, reactions: r.readback! }))
    .concat(motionAudit.playback.map(r => ({ id: r.id, reactions: r.readback })))
    .concat(motionAudit.canonicalTokenReadbacks.map(r => ({ id: r.id, reactions: r.readback })));
  for (const { id, reactions } of arrays) {
    const f = motionCaptureFixture(reactions), before = structuredClone(f.screen.reactions);
    const raw = await projection(f);
    expect(raw.runtime.children[0].reactions, id).toEqual(before);
    expect(f.screen.reactions, id).toEqual(before);
    expect(raw.sourceProjectionVersion, id).toBe(motionAudit.policy.projectionVersion);
    expect(evidenceForProjection(raw).sourceFingerprint.sha256.length, id).toBe(64);
  }
});

for (const [id, field, replacement] of [
  ['direction/PUSH/LEFT', ['direction'], 'RIGHT'],
  ['matchLayers/PUSH/true', ['matchLayers'], false],
  ['transition/SMART_ANIMATE', ['type'], 'DISSOLVE'],
  ['duration/0.5', ['duration'], 0.2],
  ['easing/EASE_OUT', ['easing','type'], 'LINEAR'],
  ['easing/CUSTOM_CUBIC_BEZIER', ['easing','easingFunctionCubicBezier','x1'], 0.3],
  ['easing/CUSTOM_CUBIC_BEZIER', ['easing','easingFunctionCubicBezier','y1'], 0.2],
  ['easing/CUSTOM_CUBIC_BEZIER', ['easing','easingFunctionCubicBezier','x2'], 0.3],
  ['easing/CUSTOM_CUBIC_BEZIER', ['easing','easingFunctionCubicBezier','y2'], 0.9],
] as const) test(`motion source fingerprint responds to ${id} ${field.join('.')}`, async () => {
  const reactions = motionAudit.nativeProbes.find(r => r.id === id)!.readback!;
  const f = motionCaptureFixture(reactions), before = await fingerprint(f);
  let value = f.screen.reactions[0].actions[0].transition;
  for (const key of field.slice(0,-1)) value = value[key];
  value[field.at(-1)!] = replacement;
  f.screen.reactions[0].action = structuredClone(f.screen.reactions[0].actions[0]);
  expect(await fingerprint(f)).not.toEqual(before);
});

for (const field of ['mass','stiffness','damping']) test(`native custom spring ${field} survives source closure`, async () => {
  const reactions = motionAudit.playback.find(r => r.id === 'curve/CUSTOM_SPRING')!.readback;
  const f = motionCaptureFixture(reactions), before = await fingerprint(f);
  f.screen.reactions[0].actions[0].transition.easing.easingFunctionSpring[field] += 1;
  f.screen.reactions[0].action = structuredClone(f.screen.reactions[0].actions[0]);
  expect(await fingerprint(f)).not.toEqual(before);
});

test('V1.3 actual canonical smooth-scroll readbacks survive source V1 with no writes', async () => {
  for (const reactions of [smoothScrollLive.cases.A.after, smoothScrollLive.initialPlannerAttempt.after]) {
    const f = motionCaptureFixture(reactions), before = structuredClone(reactions), raw = await projection(f);
    expect(raw.runtime.children[0].reactions).toEqual(before);
    expect(f.screen.reactions).toEqual(before);
    expect(raw.sourceProjectionVersion).toBe('figma-browser-source-v1');
    expect(transitionMatches(raw.runtime.children[0].reactions[0].actions[0].transition, motionTokens.SCROLL_SMOOTH)).toBe(true);
  }
});

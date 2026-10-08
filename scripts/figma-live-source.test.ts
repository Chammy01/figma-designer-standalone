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

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { join, resolve } from 'node:path';
import { isWithinRoot, safePath, validateManifest } from './figma-browser-contract.mjs';

const root = resolve('.figma-designer/browser-prototype');
test('serves root, encoded filenames, and query strings inside the output directory', () => {
  assert.equal(safePath(root, '/'), join(root, 'index.html'));
  assert.equal(safePath(root, '/assets/my%20image.png?v=2'), join(root, 'assets/my image.png'));
});
test('rejects traversal into a sibling sharing the root prefix', () => {
  for (const request of ['/../browser-prototype-private/secret.txt', '/%2e%2e/browser-prototype-private/secret.txt', '/..%5cbrowser-prototype-private%5csecret.txt', '/../../secret.txt']) {
    assert.equal(safePath(root, request), null, request);
  }
});
test('rejects malformed encoding', () => assert.equal(safePath(root, '/%zz'), null));
test('containment check rejects resolved symlink targets outside the root', () => {
  assert.equal(isWithinRoot(root, join(root, 'index.html')), true);
  assert.equal(isWithinRoot(root, `${root}-private/secret.txt`), false);
  assert.equal(isWithinRoot(root, resolve(root, '..', 'secret.txt')), false);
});

function manifest() {
  return {
    version: 2,
    runtimeSectionName: 'Figma Designer — Interactive App', runtimeSectionId: '1:1',
    startScreenId: '1:2',
    screens: [{ id: '1:2', route: '#/screen/1:2' }, { id: '1:3', route: '#/screen/1:3' }],
    interactions: [{ sourceId: '1:4', sourceScreenId: '1:2', destinationId: '1:3', navigation: 'NAVIGATE', trigger: 'ON_CLICK' }],
    controls: [{ nodeId: '1:4', screenId: '1:2', classification: 'WORKING_ACTION' }]
  };
}
test('accepts the documented V1.1 manifest', () => assert.equal(validateManifest(manifest()), false));
test('V1 navigation compatibility is explicit and identified as legacy', () => {
  const old = manifest(); old.version = '1.0.0'; delete old.controls;
  delete old.runtimeSectionName; delete old.runtimeSectionId;
  assert.throws(() => validateManifest(old), /--legacy/);
  assert.equal(validateManifest(old, true), true);
});
test('rejects unsupported versions even in legacy mode', () => {
  const m = manifest(); m.version = 99;
  assert.throws(() => validateManifest(m, true), /schema version 2/);
});
test('requires a canonical V1.1 runtime and control inventory', () => {
  const m = manifest(); delete m.controls;
  assert.throws(() => validateManifest(m), /controls array/);
  m.controls = []; m.runtimeSectionName = 'Figma Designer — Prototype Flows';
  assert.throws(() => validateManifest(m), /canonical/);
});
test('rejects invalid start screen, duplicate screen IDs, and duplicate routes', () => {
  const m = manifest(); m.startScreenId = 'missing';
  assert.throws(() => validateManifest(m), /startScreenId/);
  m.startScreenId = '1:2'; m.screens.push({ ...m.screens[0] });
  assert.throws(() => validateManifest(m), /Screen IDs/);
  m.screens.pop(); m.screens[1].route = m.screens[0].route;
  assert.throws(() => validateManifest(m), /routes must be unique/);
});
test('does not silently drop malformed NAVIGATE interactions', () => {
  const m = manifest(); delete m.interactions[0].destinationId;
  assert.throws(() => validateManifest(m), /known destinationId/);
  m.interactions[0].destinationId = '1:3'; delete m.interactions[0].sourceScreenId;
  assert.throws(() => validateManifest(m), /sourceScreenId/);
});
test('rejects duplicate navigation edges', () => {
  const m = manifest(); m.interactions.push({ ...m.interactions[0] });
  assert.throws(() => validateManifest(m), /Duplicate NAVIGATE/);
});
test('rejects malformed, duplicated, misclassified, and unassociated working controls', () => {
  const m = manifest(); delete m.controls[0].nodeId;
  assert.throws(() => validateManifest(m), /Control node IDs/);
  m.controls[0].nodeId = '1:4'; m.controls.push({ ...m.controls[0] });
  assert.throws(() => validateManifest(m), /Control node IDs/);
  m.controls.pop(); m.controls[0].screenId = 'missing';
  assert.throws(() => validateManifest(m), /unknown screenId/);
  m.controls[0].screenId = '1:2'; m.controls[0].classification = 'TYPO';
  assert.throws(() => validateManifest(m), /invalid classification/);
  m.controls[0].classification = 'WORKING_STATE';
  assert.throws(() => validateManifest(m), /WORKING_ACTION/);
});

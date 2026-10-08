import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sourceFingerprint, classifyFreshness, runnerVersion, sourceProjectionVersion, fingerprintAlgorithm } from './figma-browser-freshness.mjs';

test('canonical source fingerprint sorts keys, preserves child order, rejects non-JSON', () => {
  assert.deepEqual(sourceFingerprint({ b: 2, a: 1 }), sourceFingerprint({ a: 1, b: 2 }));
  assert.equal(sourceFingerprint({ b: 2, a: 1 }).sha256, '43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777');
  assert.notDeepEqual(sourceFingerprint([1, 2]), sourceFingerprint([2, 1]));
  assert.throws(() => sourceFingerprint({ a: undefined }));
  assert.throws(() => sourceFingerprint(NaN));
});
const source = sourceFingerprint({ runtime: '1:1', children: ['1:2'] });
const live = { status: 'AVAILABLE', sourceProjectionVersion, fingerprintAlgorithm, sourceFingerprint: source, sourceRuntimeId: '1:1', sourceRuntimeName: 'Figma Designer — Interactive App' };
const manifest = { version: 2, sourceProjectionVersion, fingerprintAlgorithm, sourceFingerprint: source, sourceExportState: 'STABLE', sourceRuntimeName: 'Figma Designer — Interactive App', sourceRuntimeId: '1:1', runtimeSectionId: '1:1' };
const hashes = { 'figma-browser.json': 'abc', 'assets/icon.svg': 'def' };
const report = { artifactSha256: hashes, manifestSha256: 'abc', runnerVersion, systemVersion: '1.2.1', sourceProjectionVersion, sourceFingerprint: source, result: 'PASS' };
test('no live evidence never claims CURRENT', () => assert.deepEqual(classifyFreshness(manifest, report, hashes), { local: 'CURRENT', source: 'UNVERIFIED', overall: 'UNVERIFIED', validationResult: 'PASS' }));
test('matching live evidence is CURRENT', () => assert.equal(classifyFreshness(manifest, report, hashes, live).overall, 'CURRENT'));
test('changed live source is STALE', () => assert.equal(classifyFreshness(manifest, report, hashes, { ...live, sourceFingerprint: sourceFingerprint({ runtime: 'changed' }) }).source, 'STALE'));
for (const changed of [{ ...hashes, 'assets/icon.svg': 'changed' }, { ...hashes, 'new.png': 'new' }, { 'figma-browser.json': 'abc' }]) {
  test(`local artifact modification/addition/removal is STALE ${JSON.stringify(changed)}`, () => assert.equal(classifyFreshness(manifest, report, changed).overall, 'STALE'));
}
test('older reports and missing source are UNVERIFIED', () => {
  assert.equal(classifyFreshness({}, {}, hashes).overall, 'UNVERIFIED');
  assert.equal(classifyFreshness({}, { version: 1, passed: true }, hashes).validationResult, 'LEGACY_PASS');
  assert.equal(classifyFreshness({}, { ...report, sourceFingerprint: null }, hashes).source, 'UNVERIFIED');
});
test('runner/system version changes invalidate local report', () => {
  assert.equal(classifyFreshness(manifest, { ...report, runnerVersion: 'old' }, hashes).local, 'STALE');
  assert.equal(classifyFreshness(manifest, report, hashes, undefined, 'future').local, 'STALE');
});

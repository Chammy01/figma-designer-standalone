import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { artifactHashes, classifyFreshness } from './figma-browser-freshness.mjs';
const execute = promisify(execFile);
const runner = new URL('./figma-browser-test.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

async function fixture(kind) {
  const dir = await mkdtemp(join(tmpdir(), 'figma-hardening-'));
  const root = join(dir, '.figma-designer/browser-prototype');
  await mkdir(root, { recursive: true });
  const manifest = { version: 2, runtimeSectionName: 'Figma Designer — Interactive App', runtimeSectionId: '1:1', startScreenId: '1:2',
    screens: ['1:2', '1:3'].map(id => ({ id, route: `#/screen/${id}` })),
    interactions: [{ sourceId: '1:4', sourceScreenId: '1:2', destinationId: '1:3', navigation: 'NAVIGATE', trigger: 'ON_CLICK' }],
    controls: [{ nodeId: '1:4', screenId: '1:2', classification: 'WORKING_ACTION' }, { nodeId: '1:5', screenId: '1:2', classification: 'WORKING_STATE' }] };
  if (kind === 'algorithm') Object.assign(manifest, { sourceProjectionVersion: 'future', sourceFingerprint: { algorithm: 'future', sha256: 'a'.repeat(64) } });
  const hook = '<button data-figma-node="1:5">State</button>';
  const html = `<html><head><link rel="stylesheet" href="styles.css"></head><body><main data-figma-app>
    <section data-figma-screen="1:2"><a data-figma-node="1:4" data-figma-destination="1:3" href="#/screen/1:3">Next</a>${kind === 'ownership' ? '' : hook}</section>
    <section data-figma-screen="1:3">Second</section></main>${kind === 'ownership' ? hook : ''}<script src="app.js"></script></body></html>`;
  const css = `section[hidden]{display:none} a{transition:opacity .15s} /* prefers-reduced-motion: reduce */
    ${kind === 'motion' ? '' : '@media(prefers-reduced-motion:reduce){*{transition-duration:0s!important;animation-duration:0s!important}}'}`;
  const app = `function render(){let id=location.hash.slice(9);if(!['1:2','1:3'].includes(id))id='1:2';document.querySelectorAll('[data-figma-screen]').forEach(s=>s.hidden=s.dataset.figmaScreen!==id)}addEventListener('hashchange',render);render();
    ${kind === 'popup' ? "window.open('https://outside.invalid/escape');" : ''}
    ${kind === 'worker' ? "new Worker('worker.js');" : ''}`;
  for (const [name, content] of Object.entries({ 'figma-browser.json': JSON.stringify(manifest), 'index.html': html, 'styles.css': css, 'app.js': app, 'worker.js': "fetch('https://outside.invalid/worker').catch(()=>{});" })) await writeFile(join(root, name), content);
  try {
    await execute(process.execPath, [runner], { cwd: dir, timeout: 45000, env: process.env }).catch(error => {
      if (error.code !== 1) throw error;
    });
    const report = JSON.parse(await readFile(join(root, 'figma-browser-test.json'), 'utf8'));
    if (kind === 'valid') {
      assert.ok(report.artifactSha256['worker.js'], 'All exported assets are bound, including unused local assets.');
      assert.equal(report.manifestSha256, report.artifactSha256['figma-browser.json']);
      assert.equal(report.systemVersion, '1.2.1');
      assert.equal(report.version, 2);
      assert.equal(report.browserAcceptance, report.result);
      assert.equal(report.freshness.validationResult, report.result);
      assert.ok(report.unsupported.some(x => x.sourceId === '1:5'), 'State behavior must be explicitly untested.');
      assert.deepEqual(classifyFreshness(manifest, report, await artifactHashes(root)), { local: 'CURRENT', source: 'UNVERIFIED', overall: 'UNVERIFIED', validationResult: 'PASS' });
      await writeFile(join(root, 'worker.js'), '// changed after validation');
      assert.equal(classifyFreshness(manifest, report, await artifactHashes(root)).local, 'STALE');
    }
    return report;
  } finally { await rm(dir, { recursive: true, force: true }); }
}

test('valid local interface passes', async () => assert.equal((await fixture('valid')).result, 'PASS'));
test('incompatible source algorithm preserves browser acceptance and reports UNVERIFIED', async () => {
  const report = await fixture('algorithm');
  assert.equal(report.result, 'PASS'); assert.equal(report.sourceFreshness, 'UNVERIFIED');
});
for (const kind of ['ownership', 'motion', 'popup', 'worker']) {
  test(`${kind} violation cannot pass`, async () => {
    const report = await fixture(kind);
    assert.equal(report.fatal, null, JSON.stringify(report.tests));
    assert.equal(report.result, 'FAIL', JSON.stringify(report.tests));
  });
}

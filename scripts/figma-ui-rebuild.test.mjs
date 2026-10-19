import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApplication, projectRoot } from '../app/server/index.mjs';
import { OpenCodeClient } from '../app/server/opencode-client.mjs';
import { mockOpenCode } from './fixtures/app-opencode.mjs';
import { validationFixture } from './fixtures/app-validation.mjs';

async function workspace(t, { delay = 400 } = {}) {
  const mock = mockOpenCode({ delay });
  await new Promise(r => mock.server.listen(0, '127.0.0.1', r));
  const engine = new OpenCodeClient({
    root: projectRoot,
    url: `http://127.0.0.1:${mock.server.address().port}`,
    password: 'fixture-private-password'
  });
  const root = await mkdtemp(join(tmpdir(), 'figma-rebuild-ui-'));
  let health = { figma: 'CONNECTED', runtime: 'VERIFIED' };
  const app = await createApplication({
    root,
    engine,
    status: async () => health,
    browser: async () => ({ state: 'NOT_BUILT', fidelity: { SOURCE_FIDELITY: 'NOT_RUN' } })
  });
  app.runs.browserTest = async () => ({
    report: {
      result: 'PASS',
      generatedAt: new Date().toISOString(),
      artifactIntegrity: {
        status: 'UNCHANGED',
        protectedFileCount: 5,
        changedFileCount: 0,
        changedFiles: [],
        blockedWriteAttempts: 0,
        blockedWriteEvidence: []
      }
    },
    output: 'FIGMA_BROWSER_TEST: PASS'
  });
  await app.ready;
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1320, height: 860 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const external = [];
  await context.route('**/*', r => new URL(r.request().url()).origin === app.url ? r.continue() : (external.push(r.request().url()), r.abort()));
  t.after(async () => {
    assert.deepEqual(external, []);
    await browser.close();
    await app.close();
    await new Promise(r => mock.server.close(r));
    assert.ok(root.startsWith(join(tmpdir(), 'figma-rebuild-ui-')));
    await rm(root, { recursive: true, force: true });
  });
  await page.goto(app.url);
  async function settled() {
    await page.waitForFunction(() => document.getElementById('cancel').hidden);
    await page.getByRole('button', { name: 'Send', exact: true }).waitFor({ state: 'visible' });
  }
  return { page, app, mock, settled, setHealth: v => { health = v; } };
}

test('unknown route fallback normalizes to Studio without submitting workflows', async t => {
  const w = await workspace(t), { page, mock } = w;
  await page.waitForFunction(() => !document.getElementById('send').disabled);
  await page.evaluate(() => { window.location.hash = '#unknown-surface'; });
  await page.waitForFunction(() => {
    const ws = document.getElementById('workspace');
    return ws && !ws.hidden;
  });
  const activeStudio = await page.evaluate(() => {
    const navLink = document.querySelector('nav a[href="#workspace"]');
    return navLink?.getAttribute('aria-current') === 'page' || navLink?.classList.contains('active');
  });
  assert.equal(activeStudio, true, 'Studio nav link must be active on fallback');
  assert.equal(mock.calls.some(c => c.path.endsWith('/run') || c.path.endsWith('/prompt')), false, 'Fallback must not submit any run');
});

test('keyboard focus order traverses navigation, top composer, ledger and category controls', async t => {
  const w = await workspace(t), { page } = w;
  await page.waitForFunction(() => !document.getElementById('send').disabled);
  assert.equal(await page.locator('#main-content').getAttribute('tabindex'), '-1', 'main-content must have tabindex -1');
  const domOrder = await page.evaluate(() => {
    const prompt = document.getElementById('prompt');
    const conv = document.getElementById('conversation');
    return prompt && conv ? (prompt.compareDocumentPosition(conv) & Node.DOCUMENT_POSITION_FOLLOWING) > 0 : false;
  });
  assert.equal(domOrder, true, 'Composer #prompt must precede #conversation in reading order');
  await page.locator('#prompt').focus();
  await page.keyboard.press('Tab');
  const activeId = await page.evaluate(() => document.activeElement?.id);
  assert.ok(['send', 'cancel'].includes(activeId), 'Tabbing from prompt reaches send or cancel');
  await page.getByRole('link', { name: 'Prototype', exact: true }).click();
  await page.locator('#prototype-compose').click();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'prompt');
  await page.fill('#prompt', 'provider-failure');
  await page.click('#send');
  await page.getByRole('button', { name: 'Change Model', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Change Model', exact: true }).click();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'model');
});

test('5 responsive viewports across all surfaces maintain fluid layout without horizontal overflow', async t => {
  const w = await workspace(t), { page } = w;
  await page.waitForFunction(() => !document.getElementById('send').disabled);
  const viewports = [
    { width: 1440, height: 900 },
    { width: 1320, height: 860 },
    { width: 1200, height: 800 },
    { width: 1024, height: 720 },
    { width: 900, height: 650 }
  ];
  const routes = ['workspace', 'prototype', 'qa', 'browser', 'runs', 'settings'];
  for (const vp of viewports) {
    await page.setViewportSize(vp);
    for (const route of routes) {
      await page.evaluate(r => { window.location.hash = '#' + r; }, route);
      await page.waitForFunction(r => {
        const el = document.getElementById(r);
        return el && !el.hidden;
      }, route);
      const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      assert.ok(noOverflow, `Overflow at ${vp.width}x${vp.height} on #${route}`);
    }
  }
  await page.evaluate(() => { window.location.hash = '#workspace'; });
  const bounds = await page.locator('#prompt').boundingBox();
  assert.ok(bounds && bounds.y >= 0 && bounds.y + bounds.height <= 650, 'Prompt must fit in 900x650 viewport');
});

test('long requests, unbroken tokens and system errors wrap cleanly without overflowing shell', async t => {
  const w = await workspace(t), { page } = w;
  await page.waitForFunction(() => !document.getElementById('send').disabled);
  const longPrompt = 'Supercalifragilisticexpialidocious_unbroken_token_'.repeat(15);
  await page.fill('#prompt', longPrompt);
  const composerOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  assert.ok(composerOverflow, 'Long unbroken prompt in composer must not cause horizontal scroll');

  await page.evaluate(() => {
    window.dispatchEvent(new ErrorEvent('error', {
      error: new Error('Long_unbroken_error_message_'.repeat(20)),
      cancelable: true
    }));
  });
  await page.locator('#error').waitFor({ state: 'visible' });
  const errorOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  assert.ok(errorOverflow, 'Long system error must not cause horizontal scroll');
  assert.equal(await page.locator('#error details').getAttribute('open'), null);
  assert.doesNotMatch(await page.locator('#error').textContent(), /Long_unbroken_error_message/);
});

test('chapter and category navigation dynamically activates panels with aria-pressed state', async t => {
  const w = await workspace(t), { page } = w;
  await page.waitForFunction(() => !document.getElementById('send').disabled);

  await page.evaluate(() => { window.location.hash = '#browser'; });
  const chapters = ['preview', 'behavior', 'motion', 'fidelity', 'limitations'];
  for (const chapter of chapters) {
    const btn = page.locator(`button[data-chapter="${chapter}"]`);
    await btn.click();
    assert.equal(await btn.getAttribute('aria-pressed'), 'true', `Chapter button ${chapter} must have aria-pressed=true`);
    const panel = page.locator(`#browser-${chapter}-panel`);
    assert.equal(await panel.isVisible(), true, `Panel #browser-${chapter}-panel must be visible`);
  }

  await page.evaluate(() => { window.location.hash = '#settings'; });
  const prefs = ['ai', 'figma', 'browser', 'application'];
  for (const pref of prefs) {
    const btn = page.locator(`button[data-preference="${pref}"]`);
    await btn.click();
    const panel = page.locator(`#preferences-${pref}`);
    assert.equal(await panel.isVisible(), true, `Panel #preferences-${pref} must be visible`);
  }
});

test('status disclosures and browser chapters never elevate uncertain or failing evidence', async t => {
  const w = await workspace(t), { page } = w;
  await page.waitForFunction(() => !document.getElementById('send').disabled);

  await page.fill('#prompt', 'uncertain-failure');
  await page.click('#send');
  await page.waitForFunction(() => document.getElementById('send').disabled);

  const systemStatus = page.locator('details#system-status');
  if (await systemStatus.count() > 0) {
    assert.doesNotMatch(await systemStatus.textContent(), /SUCCESS|COMPLETED/);
  }

  await page.evaluate(() => { window.location.hash = '#browser'; });
  assert.match(await page.locator('#browser-tests').textContent(), /NOT RUN|NOT_RUN|UNVERIFIED|STALE|FAIL/);
});

test('persistent browser overview and artifact integrity remain visible across chapters and truthful on failure', async t => {
  const w = await workspace(t), { page, app } = w;
  await page.waitForFunction(() => !document.getElementById('send').disabled);
  await page.evaluate(() => { window.location.hash = '#browser'; });

  const chapters = ['preview', 'behavior', 'motion', 'fidelity', 'limitations'];
  for (const chapter of chapters) {
    await page.locator(`button[data-chapter="${chapter}"]`).click();
    assert.equal(await page.locator('#browser-overview').isVisible(), true, `#browser-overview must be visible on chapter ${chapter}`);
    assert.equal(await page.locator('#browser-artifact-integrity').isVisible(), true, `#browser-artifact-integrity must be visible on chapter ${chapter}`);
  }

  await page.locator('button[data-chapter="preview"]').click();
  const fixture = validationFixture();
  fixture.report.artifactIntegrity = {
    status: 'CHANGED', protectedFileCount: 5, changedFileCount: 1,
    changedFiles: ['index.html'], blockedWriteAttempts: 2, blockedWriteEvidence: []
  };
  app.validation.get = async () => fixture.view();
  await page.locator('#refresh-browser').click();
  await page.waitForFunction(() => document.getElementById('browser-artifact-integrity').textContent.includes('CHANGED'));
  for (const chapter of chapters) {
    await page.locator(`button[data-chapter="${chapter}"]`).click();
    assert.match(await page.locator('#browser-overview').textContent(), /FAIL/);
    assert.match(await page.locator('#browser-artifact-integrity').textContent(), /CHANGED/);
    assert.match(await page.locator('#browser-artifact-integrity').textContent(), /Blocked write attempts\s*2/i);
  }

  await page.route('**/api/validation', r => r.fulfill({ json: {} }));
  await page.locator('#refresh-browser').click();
  await page.waitForTimeout(500);
  assert.match(await page.locator('#browser-overview').textContent(), /Evidence unavailable/);
  assert.match(await page.locator('#browser-artifact-integrity').textContent(), /Evidence unavailable/);
});

test('latest recovery heading and actions reachable without disclosure at 900x650 with existing history, prompt and send in viewport', async t => {
  const w = await workspace(t), { page } = w;
  await page.waitForFunction(() => !document.getElementById('send').disabled);
  await page.fill('#prompt', 'Create an initial dashboard card.');
  await page.click('#send');
  await page.waitForFunction(() => document.getElementById('conversation').textContent.includes('FIGMA_DESIGN_V2: PASS'));
  await w.settled();

  await page.fill('#prompt', 'uncertain-failure');
  await page.click('#send');
  await page.locator('#conversation').getByRole('heading', { name: 'Previous change could not be confirmed', exact: true }).waitFor();

  await page.setViewportSize({ width: 900, height: 650 });

  for (const id of ['prompt', 'send']) {
    const box = await page.locator('#' + id).boundingBox();
    assert.ok(box && box.y >= 0 && box.y + box.height <= 650, id + ' must fit within 900x650 viewport');
  }

  const latestMessage = page.locator('#conversation .message').first();
  const heading = latestMessage.locator('.recovery h3');
  assert.equal(await heading.isVisible(), true, 'Recovery heading must be visible without disclosure');
  assert.match(await heading.textContent(), /Previous change could not be confirmed/);

  const actionBtn = latestMessage.locator('.recovery button', { hasText: 'Keep Current Figma & Continue' });
  assert.equal(await actionBtn.isVisible(), true, 'Recovery action must be visible without opening disclosure');
  const record = await page.locator('.record-scroll').boundingBox();
  const decision = await actionBtn.boundingBox();
  assert.ok(decision.y >= record.y && decision.y + decision.height <= record.y + record.height, 'Latest recovery decision stays in the reading viewport');

  const details = latestMessage.locator('.recovery details');
  if (await details.count() > 0) {
    assert.equal(await details.first().getAttribute('open'), null, 'Technical recovery details must stay closed by default');
  }
});

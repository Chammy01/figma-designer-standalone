import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { isWithinRoot, safePath, validateManifest } from './figma-browser-contract.mjs';
import { artifactHashes, classifyFreshness, runnerVersion, sourceFingerprint } from './figma-browser-freshness.mjs';
import { collectLiveSource } from './figma-live-source.mjs';
import { verifyBrowserMotion } from './figma-browser-motion-check.mjs';
import { verifyBrowserFidelity } from './figma-browser-fidelity.mjs';

const systemVersion = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version;

const root = resolve('.figma-designer/browser-prototype');
const manifestPath = join(root, 'figma-browser.json');
const reportPath = join(root, 'figma-browser-test.json');

const results = [];
function record(name, passed, detail = '', skipped = false) {
  results.push({ name, passed, skipped, detail });
  const tag = skipped ? 'SKIP' : passed ? 'OK' : 'FAIL';
  console.log(`[${tag}] ${name}`);
  if (detail) console.log(`  ${detail}`);
}

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};

async function startServer() {
  const realRoot = await realpath(root);
  const server = createServer(async (req, res) => {
    try {
      let file = safePath(root, req.url);
      if (!file) throw new Error('unsafe path');
      try {
        const s = await stat(file);
        if (s.isDirectory()) file = join(file, 'index.html');
      } catch {
        file = join(root, 'index.html');
      }
      file = await realpath(file);
      if (!isWithinRoot(realRoot, file)) throw new Error('unsafe symlink path');
      const s = await stat(file);
      if (!s.isFile()) throw new Error('not a file');
      res.writeHead(200, { 'Content-Type': mime[extname(file).toLowerCase()] || 'application/octet-stream' });
      createReadStream(file).pipe(res);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    }
  });

  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });

  const address = server.address();
  return { server, baseUrl: `http://127.0.0.1:${address.port}/` };
}

const escapeAttr = value => String(value).replace(/"/g, '\\"');
const screenSelector = id => `[data-figma-screen="${escapeAttr(id)}"]`;
const nodeSelector = id => `[data-figma-node="${escapeAttr(id)}"]`;

function routeForScreen(screen) {
  return screen?.route || `#/screen/${screen?.id}`;
}

async function findSourceScreenId(page, baseUrl, screens, interaction) {
  if (interaction.sourceScreenId && screens.some(s => String(s.id) === String(interaction.sourceScreenId))) {
    return String(interaction.sourceScreenId);
  }

  for (const screen of screens) {
    await page.goto(baseUrl + routeForScreen(screen), { waitUntil: 'networkidle' });
    if (await page.locator(screenSelector(screen.id)).locator(nodeSelector(interaction.sourceId)).count()) return String(screen.id);
  }
  return null;
}

let browser;
let server;
let fatal = null;
let legacy = false;
let artifactSha256 = {};
let manifest;
let currentHashes;
let manifestValid = false;
let liveSourceBefore;
const unsupported = [];
const motionFailures = new Set();
let motionResults = [];
let fidelity = {SOURCE_FIDELITY:'UNVERIFIED',BROWSER_VISUAL_REGRESSION:'UNVERIFIED',PIXEL_REGRESSION:'UNVERIFIED',NATIVE_RENDER_PARITY:'UNVERIFIED',FIGMA_PIXEL_PARITY:'UNVERIFIED'};

async function checkReducedMotion(page) {
  const failures = await page.evaluate(() => {
    const seconds = value => value.split(',').map(v => v.trim().endsWith('ms') ? parseFloat(v) / 1000 : parseFloat(v));
    const failures = [];
    for (const el of document.querySelectorAll('[data-figma-app], [data-figma-app] *')) {
      for (const pseudo of [null, '::before', '::after']) {
        const style = getComputedStyle(el, pseudo);
        if ((style.animationName !== 'none' && seconds(style.animationDuration).some(v => v > .001)) || (style.transitionProperty !== 'none' && seconds(style.transitionDuration).some(v => v > .001))) failures.push(`${el.getAttribute('data-figma-node') || el.tagName}${pseudo || ''}`);
      }
    }
    return failures;
  });
  failures.forEach(f => motionFailures.add(f));
}

try {
  artifactSha256 = await artifactHashes(root);
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  legacy = validateManifest(manifest, process.argv.includes('--legacy'));
  manifestValid = true;
  liveSourceBefore = await collectLiveSource();
  record('Manifest schema and references are valid', true, legacy ? 'Explicit V1 legacy mode; navigation-only coverage.' : 'V1.1 schema 2.');
  const screens = Array.isArray(manifest.screens) ? manifest.screens : [];
  const interactions = Array.isArray(manifest.interactions) ? manifest.interactions : [];
  const controls = Array.isArray(manifest.controls) ? manifest.controls : [];

  if (!screens.length) throw new Error('Manifest contains no screens.');

  const startId = String(manifest.startScreenId ?? screens[0].id);
  const start = screens.find(s => String(s.id) === startId) ?? screens[0];
  const navInteractions = interactions.filter(x => {
    const click = (typeof x.trigger === 'object' ? x.trigger?.type : x.trigger) === 'ON_CLICK' || (legacy && x.trigger === undefined);
    if (x.navigation !== 'NAVIGATE' || !click) { if (!x.motion?.token && x.action !== 'CLOSE') unsupported.push({ sourceId: x.sourceId, navigation: x.navigation, trigger: x.trigger, reason: 'Only ON_CLICK NAVIGATE is exercised by pointer and Enter; supported motion has separate tests.' }); return false; }
    return true;
  });
  for (const control of controls.filter(c => (c.classification === 'WORKING_STATE' || c.classification === 'FIGMA_LIMITED') && !interactions.some(i => i.sourceId === c.nodeId && i.motion?.token))) unsupported.push({ sourceId: control.nodeId, reason: `${control.classification}: ownership hook only; state behavior not exercised.` });

  const started = await startServer();
  server = started.server;
  const baseUrl = started.baseUrl;
  record('Static server reachable', true, baseUrl);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ reducedMotion: 'reduce', serviceWorkers: 'block' });
  const externalRequests = [];
  const localOrigin = new URL(baseUrl).origin;
  const external = url => {
    const u = new URL(url);
    return !['data:', 'blob:', 'about:'].includes(u.protocol) && u.origin !== localOrigin;
  };
  context.on('request', req => {
    const u = new URL(req.url());
    if (external(u.href)) externalRequests.push(u.href);
  });
  await context.route('**/*', route => external(route.request().url()) ? route.abort('blockedbyclient') : route.continue());
  await context.routeWebSocket('**/*', socket => {
    externalRequests.push(socket.url()); socket.close();
  });
  const page = await context.newPage();

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  record('App root hook present', await page.locator('[data-figma-app]').count() === 1);
  record('Bare URL renders start screen', await page.locator(screenSelector(start.id)).isVisible().catch(() => false), String(start.id));

  const startRoute = routeForScreen(start);
  await page.goto(baseUrl + startRoute, { waitUntil: 'networkidle' });
  record('Canonical start route resolves', await page.locator(screenSelector(start.id)).isVisible().catch(() => false), startRoute);

  let deepLinksOk = true;
  const deepLinkFailures = [];
  for (const screen of screens) {
    const route = routeForScreen(screen);
    await page.goto(baseUrl + route, { waitUntil: 'networkidle' });
    const visible = await page.locator(screenSelector(screen.id)).isVisible().catch(() => false);
    await checkReducedMotion(page);
    if (!visible) deepLinkFailures.push(`${screen.id}:${route}`);
    deepLinksOk &&= visible;
  }
  record('All manifest screen deep links resolve', deepLinksOk, deepLinkFailures.join(', '));

  let navHooksOk = true;
  let navClickOk = true;
  let navKeyboardOk = true;
  let navHistoryOk = true;
  const navDetails = [];

  if (!navInteractions.length) {
    record('Manifest contains navigable interactions', false, 'No NAVIGATE interactions found.');
  } else {
    record('Manifest contains navigable interactions', true, String(navInteractions.length));

    for (const interaction of navInteractions) {
      const destination = screens.find(s => String(s.id) === String(interaction.destinationId));
      if (!destination) {
        navHooksOk = false;
        navClickOk = false;
        navKeyboardOk = false;
        navHistoryOk = false;
        navDetails.push(`${interaction.sourceId}: destination ${interaction.destinationId} missing from manifest screens`);
        continue;
      }

      const sourceScreenId = await findSourceScreenId(page, baseUrl, screens, interaction);
      const sourceScreen = screens.find(s => String(s.id) === String(sourceScreenId));
      if (!sourceScreen) {
        navHooksOk = false;
        navClickOk = false;
        navKeyboardOk = false;
        navHistoryOk = false;
        navDetails.push(`${interaction.sourceId}: source control not found on any manifest screen`);
        continue;
      }

      const sourceRoute = routeForScreen(sourceScreen);
      await page.goto(baseUrl + sourceRoute, { waitUntil: 'networkidle' });
      const control = page.locator(screenSelector(sourceScreen.id)).locator(nodeSelector(interaction.sourceId)).first();
      const controlCount = await page.locator(nodeSelector(interaction.sourceId)).count();
      const ownedCount = await control.count();
      const destinationAttr = ownedCount ? await control.getAttribute('data-figma-destination') : null;
      const hooksOk = controlCount === 1 && ownedCount === 1 && String(destinationAttr) === String(interaction.destinationId);
      navHooksOk &&= hooksOk;

      let semanticEnabled = false;
      let tag = 'missing';
      if (ownedCount) {
        tag = await control.evaluate(el => el.tagName.toLowerCase()).catch(() => 'unknown');
        const enabled = await control.isEnabled().catch(() => false);
        semanticEnabled = ['a', 'button', 'input', 'select'].includes(tag) && enabled;
      }
      navHooksOk &&= semanticEnabled;

      let clickOk = false;
      if (ownedCount && semanticEnabled && hooksOk) {
        await control.hover();
        await checkReducedMotion(page);
        await control.click();
        await page.waitForTimeout(220);
        clickOk = await page.locator(screenSelector(interaction.destinationId)).isVisible().catch(() => false);
      }
      navClickOk &&= clickOk;

      let backOk = false;
      let forwardOk = false;
      if (clickOk) {
        await page.goBack({ waitUntil: 'networkidle' });
        backOk = await page.locator(screenSelector(sourceScreen.id)).isVisible().catch(() => false);
        await page.goForward({ waitUntil: 'networkidle' });
        forwardOk = await page.locator(screenSelector(interaction.destinationId)).isVisible().catch(() => false);
      }
      navHistoryOk &&= backOk && forwardOk;

      await page.goto(baseUrl + sourceRoute, { waitUntil: 'networkidle' });
      const keyboardControl = page.locator(screenSelector(sourceScreen.id)).locator(nodeSelector(interaction.sourceId)).first();
      let keyOk = false;
      if (await keyboardControl.count()) {
        await keyboardControl.focus();
        await checkReducedMotion(page);
        const focused = await keyboardControl.evaluate(el => document.activeElement === el).catch(() => false);
        if (focused && semanticEnabled && hooksOk) {
          await page.keyboard.press('Enter');
          await page.waitForTimeout(220);
          keyOk = await page.locator(screenSelector(interaction.destinationId)).isVisible().catch(() => false);
        }
      }
      navKeyboardOk &&= keyOk;

      navDetails.push(`${interaction.sourceId}@${sourceScreen.id}->${interaction.destinationId} tag=${tag} hooks=${hooksOk} click=${clickOk} enter=${keyOk} back=${backOk} forward=${forwardOk}`);
    }

    record('All NAVIGATE hooks are unique, semantic, enabled, and match destinations', navHooksOk, navDetails.join(' | '));
    record('All NAVIGATE controls activate by pointer', navClickOk);
    record('All NAVIGATE controls activate by keyboard Enter', navKeyboardOk);
    record('Back and Forward preserve NAVIGATE history', navHistoryOk);
  }

  if (controls.length) {
    let controlHooksOk = true;
    const missing = [];
    for (const control of controls) {
      if (!control?.nodeId || !control?.screenId) continue;
      const screen = screens.find(s => String(s.id) === String(control.screenId));
      if (!screen) {
        controlHooksOk = false;
        missing.push(`${control.nodeId}:screen ${control.screenId} missing`);
        continue;
      }
      await page.goto(baseUrl + routeForScreen(screen), { waitUntil: 'networkidle' });
      const count = await page.locator(nodeSelector(control.nodeId)).count();
      const ownedCount = await page.locator(screenSelector(screen.id)).locator(nodeSelector(control.nodeId)).count();
      if (count !== 1 || ownedCount !== 1) {
        controlHooksOk = false;
        missing.push(`${control.nodeId}:global=${count},owned=${ownedCount}`);
      }
    }
    record('Declared control hooks are unique and inside their screen', controlHooksOk, missing.join(', '));
  } else {
    record('Working-control hooks match manifest', true, legacy ? 'V1 has no working-control inventory; coverage not validated.' : 'Manifest declares no meaningful controls.', true);
  }

  record('Computed reduced motion disables or collapses CSS durations to at most 1ms', motionFailures.size === 0, [...motionFailures].join(', '));

  await page.goto(baseUrl + '#/screen/__missing__', { waitUntil: 'networkidle' });
  record('Unknown screen route safely falls back to start', await page.locator(screenSelector(start.id)).isVisible().catch(() => false));

  if (manifest.motion?.contractVersion) {
    motionResults = await verifyBrowserMotion(page, manifest, baseUrl);
    for (const row of motionResults) record(`${row.token} ${row.mode} ${row.sourceId}`, row.passed, JSON.stringify(row.evidence));
    for (const i of interactions.filter(i => i.motion?.parity === 'NOT_IMPLEMENTED')) unsupported.push({sourceId:i.sourceId,reason:i.motion.reason,motionRequired:true});
  }

  let snapshot;
  try { snapshot=JSON.parse(await readFile(join(root,'figma-source.json'),'utf8')); }
  catch(error) { if(error.code!=='ENOENT')throw error; }
  if(snapshot?.projection && sourceFingerprint(snapshot.projection).sha256 === manifest.sourceFingerprint?.sha256) {
    fidelity=await verifyBrowserFidelity(page,manifest,snapshot.projection,baseUrl);
    record('Source-to-DOM fidelity',fidelity.SOURCE_FIDELITY!=='FAIL',JSON.stringify(fidelity.coverage));
  } else {fidelity.reason='Missing or unbound source projection';record('Source-to-DOM fidelity evidence',true,fidelity.reason,true);}

  record('Runtime resources stay local', externalRequests.length === 0, externalRequests.join(', '));
  currentHashes = await artifactHashes(root);
  record('Generated artifacts remained unchanged during testing', JSON.stringify(artifactSha256) === JSON.stringify(currentHashes));
} catch (error) {
  fatal = error instanceof Error ? error.message : String(error);
  record('Test harness completed without fatal error', false, fatal);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) await new Promise(resolveClose => server.close(resolveClose));
}

const failures = results.filter(r => !r.passed && !r.skipped);
const acceptance = failures.length ? 'FAIL' : legacy || unsupported.some(i => i.motionRequired) ? 'WARN' : 'PASS';
const liveSource = await collectLiveSource();
const sourceSummary = live => live ? { status: live.status, reason: live.reason ?? null, sourceFingerprint: live.sourceFingerprint ?? null, sourceProjectionVersion: live.sourceProjectionVersion, sourceRuntimeId: live.sourceRuntimeId ?? null, metrics: live.metrics } : null;
const freshness = manifestValid ? classifyFreshness(manifest, { artifactSha256, manifestSha256: artifactSha256['figma-browser.json'], runnerVersion, systemVersion, sourceFingerprint: manifest.sourceFingerprint ?? null, sourceProjectionVersion: manifest.sourceProjectionVersion ?? null, exportRunId: manifest.exportRunId ?? null, result: acceptance }, currentHashes ?? artifactSha256, liveSource, systemVersion) : { local: 'UNVERIFIED', source: 'UNVERIFIED', overall: 'UNVERIFIED' };
const report = {
  version: 2,
  systemVersion,
  result: acceptance,
  browserAcceptance: acceptance,
  coverage: legacy ? 'legacy-navigation-only' : manifest?.motion?.contractVersion ? 'navigation-control-hooks-and-motion' : 'navigation-and-control-hooks',
  motion: { contractVersion:manifest?.motion?.contractVersion ?? null, results:motionResults, totals:motionResults.reduce((totals,r) => { const key=`${r.token}: ${r.parity}`; totals[key]=(totals[key] ?? 0)+1; return totals; },{}) },
  fidelity,
  sourceFreshness: freshness.source,
  localFreshness: freshness.local,
  overallFreshness: freshness.overall,
  freshness,
  liveSourceBefore: sourceSummary(liveSourceBefore),
  liveSource: sourceSummary(liveSource),
  exportRunId: manifest?.exportRunId ?? null,
  sourceProjectionVersion: manifest?.sourceProjectionVersion ?? null,
  sourceFingerprint: manifest?.sourceFingerprint ?? null,
  manifestSha256: artifactSha256['figma-browser.json'] ?? null,
  artifactSha256,
  generatedAt: new Date().toISOString(),
  runner: 'playwright',
  runnerVersion,
  tested: ['ON_CLICK NAVIGATE: pointer, native Enter, Back/Forward', 'screen deep links and invalid-route fallback', 'declared control ownership and uniqueness', 'computed CSS reduced motion on screens and navigation hover/focus', 'context HTTP requests and WebSockets; service workers blocked', ...(motionResults.length ? ['Supported semantic motion: computed/intermediate/final DOM behavior in normal and reduced motion'] : [])],
  unsupported,
  limitations: [manifest?.motion?.contractVersion ? 'Behavioral/timing-bounded motion only; no native pixel, renderer or exact frame timing equivalence.' : 'Working state behavior beyond hook ownership and JavaScript animation timing are untested.', 'Experimental/shared-element/custom easing/timed sequences remain unimplemented.', 'Network checks cover exercised Chromium contexts, not all future behavior.'],
  nativeOrcaRequired: false,
  passed: failures.length === 0,
  fatal,
  tests: results
};

await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(`\nTest report: ${reportPath}\n`);
console.log(`SOURCE_FRESHNESS: ${report.sourceFreshness}\nLOCAL_FRESHNESS: ${report.localFreshness}\nOVERALL_FRESHNESS: ${report.overallFreshness}`);
for(const key of ['SOURCE_FIDELITY','BROWSER_VISUAL_REGRESSION','PIXEL_REGRESSION','NATIVE_RENDER_PARITY','FIGMA_PIXEL_PARITY']) console.log(`${key}: ${fidelity[key]}`);
for (const [token,count] of Object.entries(report.motion.totals)) console.log(`${token}: ${count}`);

if (report.passed) {
  console.log(`FIGMA_BROWSER_TEST: ${report.result}`);
  process.exit(0);
}

console.log('FIGMA_BROWSER_TEST: FAIL');
process.exit(1);

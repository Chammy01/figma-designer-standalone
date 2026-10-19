import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApplication,projectRoot} from '../app/server/index.mjs';
import {OpenCodeClient} from '../app/server/opencode-client.mjs';
import {mockOpenCode} from './fixtures/app-opencode.mjs';
import {validationFixture} from './fixtures/app-validation.mjs';
import {qaView,browserView} from '../app/shared/result-contract.mjs';

async function workspace(t,kind='PASS'){
  const mock=mockOpenCode();await new Promise(r=>mock.server.listen(0,'127.0.0.1',r));
  const root=await mkdtemp(join(tmpdir(),'figma-validation-ui-')),engine=new OpenCodeClient({root:projectRoot,url:`http://127.0.0.1:${mock.server.address().port}`,password:'fixture-private-password'});
  let fixture=validationFixture(kind),view=fixture.view(),health={figma:'CONNECTED',runtime:'VERIFIED',connection:{plugin:'CONNECTED',bridge:'HEALTHY',document:'READABLE'}};
  const app=await createApplication({root,engine,status:async()=>health,browser:async()=>({state:'CURRENT'}),validation:{get:async()=>view,capture:async()=>{}}});
  app.runs.browserTest=async()=>({report:{result:fixture.report?.result??'PASS',generatedAt:new Date().toISOString(),artifactIntegrity:{status:'UNCHANGED',protectedFileCount:5,changedFileCount:0,changedFiles:[],blockedWriteAttempts:0,blockedWriteEvidence:[]}},output:`FIGMA_BROWSER_TEST: ${fixture.report?.result??'PASS'}`});
  await app.ready;
  const base=join(root,'.figma-designer/browser-prototype');await mkdir(base,{recursive:true});await writeFile(join(base,'index.html'),'<!doctype html><h1>Isolated local preview</h1>');
  const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:960,height:900},reducedMotion:'reduce'}),page=await context.newPage(),external=[];
  await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():(external.push(r.request().url()),r.abort()));
  t.after(async()=>{assert.deepEqual(external,[]);await browser.close();await app.close();await new Promise(r=>mock.server.close(r));await rm(root,{recursive:true,force:true});});
  await page.goto(app.url);await page.waitForFunction(()=>!document.getElementById('send').disabled);
  const refresh=async()=>{const expected=view;if(new URL(page.url()).hash==='#browser')await page.click('#refresh-browser');else await page.locator('#qa .refresh-validation').click();await page.waitForFunction(expected=>{try{return JSON.stringify(JSON.parse(document.querySelector('#qa-raw pre').textContent))===JSON.stringify(expected.qa)&&JSON.stringify(JSON.parse(document.querySelector('#browser-raw pre').textContent).fidelity)===JSON.stringify(expected.fidelity);}catch{return false;}},expected);};
  const run=async(mode)=>{const response=page.waitForResponse(r=>r.url().endsWith('/api/run')&&r.request().method()==='POST');await page.locator(`#${mode==='QA'?'qa':'browser'} [data-mode="${mode}"]`).click();const receipt=await(await response).json();await page.waitForFunction(id=>{const el=document.querySelector(`[data-run-id="${id}"]`);return el&&el.dataset.state!=='RUNNING'&&document.getElementById('cancel').hidden;},receipt.id);};
  return {app,mock,page,context,run,get fixture(){return fixture;},set:kind=>{fixture=validationFixture(kind);view=fixture.view();return fixture;},setView:v=>view=v,refresh,setHealth:v=>health=v};
}

test('QA missing/PASS, real metrics, collapsed raw evidence and explicit Run QA',async t=>{
  const w=await workspace(t),{page}=w;const empty=w.fixture.view();empty.qa=qaView();w.setView(empty);await page.click('a[href="#qa"]');await page.waitForFunction(()=>document.getElementById('qa-result').textContent.includes('NOT RUN'));assert.equal(await page.locator('#qa-raw').getAttribute('open'),null);
  w.set('PASS');await w.refresh();assert.match(await page.textContent('#qa-result'),/No broken controls or prototype edges/);assert.match(await page.textContent('#qa-result'),/Working actions1/);assert.match(await page.textContent('#qa-integrity'),/VERIFIED UNCHANGED/);
  assert.equal(w.mock.calls.some(c=>/\/(command|prompt)$/.test(c.path)),false);await w.run('QA');assert.ok(w.mock.calls.some(c=>c.body?.name==='figma/qa'));
});
test('QA WARN separates unknown/limitations; filters and native finding details preserve names and IDs',async t=>{
  const w=await workspace(t,'WARN'),{page}=w;await page.click('a[href="#qa"]');await page.waitForFunction(()=>document.querySelector('#qa-findings .finding'));assert.match(await page.textContent('#qa-result'),/WARN/);assert.match(await page.textContent('#qa-findings'),/No evidence establishes a journey start/);await page.selectOption('#qa-filter','BROKEN');assert.equal(await page.locator('#qa-findings .finding').count(),0);await page.selectOption('#qa-filter','UNKNOWN');assert.equal(await page.locator('#qa-findings .finding').count(),1);await page.locator('#qa-findings summary').click();assert.match(await page.textContent('#qa-findings'),/3:1/);await w.refresh();assert.equal(await page.locator('#qa-findings details').getAttribute('open'),'');
  w.set('LIMITATION');await w.refresh();await page.selectOption('#qa-filter','LIMITATIONS');assert.match(await page.textContent('#qa-findings'),/Stateful playback remains uncertified/);await page.locator('#qa-filter').focus();await page.keyboard.press('Home');await page.keyboard.press('Enter');assert.equal(await page.inputValue('#qa-filter'),'ALL');
});
test('QA FAIL and failed integrity cannot display a trusted green result',async t=>{
  const w=await workspace(t,'FAIL'),{page}=w;await page.click('a[href="#qa"]');await page.waitForFunction(()=>document.getElementById('qa-result').textContent.includes('FAIL'));assert.match(await page.textContent('#qa-findings'),/missing|absent/i);w.set('INTEGRITY');await w.refresh();assert.match(await page.textContent('#qa-integrity'),/FAILED/);assert.match(await page.textContent('#qa-integrity'),/not trusted/);assert.equal(await page.locator('#qa-raw').getAttribute('open'),null);
});
test('Browser current/FAIL, fidelity defects/fonts/native limits and separate-origin preview',async t=>{
  const w=await workspace(t,'FIDELITY_FAIL'),{page}=w;await page.click('a[href="#browser"]');await page.waitForFunction(()=>document.getElementById('browser-tests').textContent.includes('FAIL'));assert.match(await page.textContent('#browser-status'),/CURRENT/);assert.match(await page.textContent('#fidelity'),/FAIL/);assert.match(await page.textContent('#fidelity-findings'),/Major geometry drift/);assert.match(await page.textContent('#browser-motion'),/not verified/);assert.match(await page.textContent('#native-parity'),/UNVERIFIED/);assert.match(await page.textContent('#browser-regression'),/Live design goldenUNVERIFIED/);assert.equal(await page.locator('#browser-raw').getAttribute('open'),null);
  w.set('FONT');await w.refresh();assert.match(await page.textContent('#fidelity'),/WARN/);assert.match(await page.textContent('#font-limitations'),/Arial.*Courier New.*FALLBACK USED/);await page.selectOption('#fidelity-filter','FONTS');assert.match(await page.textContent('#fidelity-findings'),/Font fidelity limitation/);
  const popup=page.waitForEvent('popup');await page.click('#open-preview');const preview=await popup;await preview.waitForLoadState();assert.notEqual(new URL(preview.url()).origin,w.app.url);assert.match(await preview.textContent('body'),/Isolated local preview/);await preview.close();
  await page.click('#browser-continue');assert.match(await page.inputValue('#prompt'),/issues I choose/);assert.equal(w.mock.calls.some(c=>/\/(command|prompt)$/.test(c.path)),false);
});
test('STALE is historical; missing/corrupt evidence never fabricates PASS or triggers rebuild',async t=>{
  const w=await workspace(t),{page}=w;await page.click('a[href="#browser"]');await page.waitForFunction(()=>document.getElementById('browser-status').textContent.includes('CURRENT'));const f=w.fixture;f.source.sha256='f'.repeat(64);f.state.sourceFreshness=f.state.overallFreshness='STALE';w.setView(f.view());await w.refresh();assert.match(await page.textContent('#browser-tests'),/STALE/);assert.match(await page.textContent('#browser-tests'),/Historical reported result: PASS/);await page.click('a[href="#qa"]');await page.waitForFunction(()=>document.getElementById('qa-result').textContent.includes('STALE'));assert.match(await page.textContent('#qa-result'),/Historical reported result: PASS/);
  const absent=f.view();Object.assign(absent,browserView());absent.qa=qaView();w.setView(absent);await page.click('a[href="#browser"]');await page.waitForFunction(()=>document.getElementById('browser-status').textContent.includes('NOT BUILT'));assert.equal(await page.isDisabled('#open-preview'),true);assert.match(await page.textContent('#fidelity'),/UNVERIFIED/);assert.equal(w.mock.calls.some(c=>/\/(command|prompt)$/.test(c.path)),false);
});
test('960px/dark/reduced-motion layout, connection recovery, provider/model controls and explicit browser actions',async t=>{
  const w=await workspace(t,'FAIL'),{page}=w;await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});await page.click('a[href="#qa"]');await page.waitForFunction(()=>document.querySelector('#qa-findings .finding'));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion:reduce)').matches),true);
  w.setHealth({figma:'PLUGIN_NOT_CONNECTED',runtime:'VERIFIED',connection:{plugin:'NOT_CONNECTED',bridge:'HEALTHY',document:'UNAVAILABLE'}});await page.click('a[href="#settings"]');await page.click('#settings-check');await page.waitForFunction(()=>document.getElementById('figma-settings').textContent.includes('NOT_CONNECTED'));assert.match(await page.textContent('#figma-settings'),/run the imported Figma Designer/);assert.doesNotMatch(await page.textContent('#figma-settings'),/400|503/);
  w.setHealth({figma:'CONNECTED',runtime:'VERIFIED',connection:{plugin:'CONNECTED',bridge:'HEALTHY',document:'READABLE'}});await page.click('#settings-check');await page.waitForFunction(()=>!document.getElementById('model').disabled);await page.selectOption('#model',JSON.stringify({id:'second',providerID:'fixture'}));await page.click('#apply-model');await page.waitForFunction(()=>document.getElementById('ai-notice').textContent.includes('Model changed'));
  for(const mode of['BROWSER','BROWSER_TEST']){await page.click('a[href="#browser"]');await w.run(mode);}
  assert.deepEqual(w.mock.calls.filter(c=>c.path.endsWith('/command')).map(c=>c.body.name),['figma/browser']);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
});

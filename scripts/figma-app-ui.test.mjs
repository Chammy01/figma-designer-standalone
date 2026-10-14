import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApplication,projectRoot} from '../app/server/index.mjs';
import {OpenCodeClient} from '../app/server/opencode-client.mjs';
import {mockOpenCode} from './fixtures/app-opencode.mjs';
async function workspace(t){
  const mock=mockOpenCode({delay:400});await new Promise(r=>mock.server.listen(0,'127.0.0.1',r));const engine=new OpenCodeClient({root:projectRoot,url:`http://127.0.0.1:${mock.server.address().port}`,password:'fixture-private-password'});
  const root=await mkdtemp(join(tmpdir(),'figma-app-ui-'));let health={figma:'CONNECTED',runtime:'VERIFIED'};
  const app=await createApplication({root,engine,status:async()=>health,browser:async()=>({state:'NOT_BUILT',fidelity:{SOURCE_FIDELITY:'NOT_RUN'}})});await app.ready;
  const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1100,height:800},reducedMotion:'reduce'}),page=await context.newPage();
  const external=[];await context.route('**/*',r=>new URL(r.request().url()).origin===app.url?r.continue():(external.push(r.request().url()),r.abort()));
  t.after(async()=>{assert.deepEqual(external,[]);await browser.close();await app.close();await new Promise(r=>mock.server.close(r));assert.ok(root.startsWith(join(tmpdir(),'figma-app-ui-')));await rm(root,{recursive:true,force:true});});await page.goto(app.url);
  async function settled(){await page.waitForFunction(()=>document.getElementById('cancel').hidden);await page.getByRole('button',{name:'Send',exact:true}).waitFor({state:'visible'});}
  async function send(input){await page.getByLabel('Your instruction').fill(input);const response=page.waitForResponse(r=>r.url().endsWith('/api/run')&&r.request().method()==='POST');await page.getByRole('button',{name:'Send',exact:true}).click();const r=await response;assert.equal(r.status(),202);const run=await r.json();await page.waitForFunction(id=>{const el=document.querySelector(`[data-run-id="${id}"]`);return el&&el.dataset.state!=='RUNNING';},run.id);await settled();}
  return {page,app,mock,send,settled,setHealth:value=>health=value};
}
test('application protocol UI: conversation, briefing, revision, specialist actions and reconnect',async t=>{
  const w=await workspace(t),{page}=w;
  await page.getByRole('button',{name:'Send',exact:true}).waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.getElementById('send').disabled);
  assert.match(await page.locator('#statuses').textContent(),/Figma · Connected.*Engine · Ready.*Runtime · Verified/);
  await page.evaluate(()=>{window.statusMutations=0;const observer=new MutationObserver(records=>window.statusMutations+=records.length);for(const id of ['statuses','connection-title','connection-copy','run-state'])observer.observe(document.getElementById(id),{childList:true,subtree:true,characterData:true});});await page.waitForTimeout(1700);assert.equal(await page.evaluate(()=>window.statusMutations),0);
  await w.send('Create a neumorphic task management dashboard.');assert.match(await page.locator('#conversation').textContent(),/FIGMA_DESIGN_V2: PASS/);
  await w.send('Make the cards softer.');
  await w.send('vague design');assert.match(await page.locator('#conversation').textContent(),/What should users do first/);await w.send('Create a new task.');
  for(const name of ['Run QA','Build Browser','Test Browser']){await page.locator('#workspace').getByRole('button',{name,exact:true}).click();await page.waitForTimeout(1600);await w.settled();}
  assert.equal(w.mock.calls.filter(c=>c.path==='/api/session').length,1);assert.deepEqual(w.mock.calls.filter(c=>c.path.endsWith('/command')).map(c=>c.body.name),['figma/qa','figma/browser','figma/browser-test']);
  await page.reload();await page.waitForFunction(()=>document.getElementById('conversation').textContent.includes('Make the cards softer.'));
  await page.getByRole('link',{name:'Settings',exact:true}).click();await page.getByText('Developer diagnostics',{exact:true}).click();assert.doesNotMatch(await page.locator('#diagnostic-output').textContent(),/fixture-private-password|Authorization|HIDDEN_REASONING/);
  await page.getByText('Developer diagnostics',{exact:true}).click();assert.equal(await page.locator('#diagnostics').getAttribute('open'),null);
  await page.getByRole('link',{name:'Browser',exact:true}).click();await page.waitForFunction(()=>document.getElementById('browser-status').textContent.includes('NOT_BUILT'));
  assert.match(await page.locator('#browser-status').textContent(),/Test NOT_RUN/);
  await page.getByRole('button',{name:'New Design',exact:false}).click();await page.waitForFunction(()=>!document.getElementById('conversation').children.length);assert.equal(w.mock.calls.filter(c=>c.path==='/api/session').length,2);
});
test('disconnected recovery, failure, keyboard focus, minimum desktop and reduced motion',async t=>{
  const w=await workspace(t),{page}=w;w.setHealth({figma:'PLUGIN_NOT_CONNECTED',runtime:'VERIFIED'});await page.getByRole('button',{name:'Check Again'}).click();await page.getByRole('heading',{name:'Figma plugin not connected',exact:true}).waitFor();assert.equal(await page.locator('#send').isDisabled(),true);assert.doesNotMatch(await page.locator('main').textContent(),/ECONNREFUSED|WebSocket|stack trace/);
  w.setHealth({figma:'CONNECTED',runtime:'VERIFIED'});await page.getByRole('button',{name:'Check Again'}).click();await page.waitForFunction(()=>!document.getElementById('send').disabled);
  await w.send('provider-failure');assert.match(await page.locator('#conversation').textContent(),/Provider unavailable/);
  await page.getByLabel('Your instruction').focus();await page.keyboard.press('Tab');assert.ok(['send','cancel'].includes(await page.evaluate(()=>document.activeElement.id)));
  assert.equal(await page.locator('#send').evaluate(el=>getComputedStyle(el).outlineStyle),'solid');
  await page.setViewportSize({width:760,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
  assert.doesNotMatch(await page.content(),/fixture-private-password|HIDDEN_REASONING_SENTINEL/);
  await page.route('**/api/app/status',r=>r.abort());await page.locator('#error').waitFor({state:'visible'});await page.unroute('**/api/app/status');await page.locator('#error').waitFor({state:'hidden'});
});

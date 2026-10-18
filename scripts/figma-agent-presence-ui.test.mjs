import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdtemp,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApplication,projectRoot} from '../app/server/index.mjs';
import {OpenCodeClient} from '../app/server/opencode-client.mjs';
import {validationFixture} from './fixtures/app-validation.mjs';
import {mockOpenCode} from './fixtures/app-opencode.mjs';
import {observeActivityContext,observeActivityRun} from '../app/server/agent-activity.mjs';

async function workspace(t){
 const mock=mockOpenCode();await new Promise(r=>mock.server.listen(0,'127.0.0.1',r));
 const root=await mkdtemp(join(tmpdir(),'figma-presence-ui-')),engine=new OpenCodeClient({root:projectRoot,url:`http://127.0.0.1:${mock.server.address().port}`,password:'fixture-private-password'});
 let health={figma:'CONNECTED',runtime:'VERIFIED',connection:{plugin:'CONNECTED',bridge:'HEALTHY',document:'READABLE'}};
 const app=await createApplication({root,engine,status:async()=>health,browser:async()=>({state:'NOT_BUILT'}),validation:{get:async()=>validationFixture().view(),capture:async()=>{}}});await app.ready;
 const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1320,height:860}}),page=await context.newPage(),external=[];
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():(external.push(r.request().url()),r.abort()));
 t.after(async()=>{assert.deepEqual(external,[]);await browser.close();await app.close();await new Promise(r=>mock.server.close(r));await rm(root,{recursive:true,force:true});});
 await page.goto(app.url);await page.waitForFunction(()=>!document.getElementById('send').disabled);
 const run={id:'presence-test-run',state:'RUNNING',mode:'AUTO'};
 const render=async()=>page.evaluate(async run=>{const m=await import('/agent-presence.js');m.renderAgentPresence([run],{});},run);
 const tool=async(name,status='running')=>{observeActivityContext(run,[{type:'assistant',content:[{type:'tool',id:crypto.randomUUID(),name,state:{status,input:{secret:'PRIVATE_INPUT_SENTINEL'}}}]}]);await render();};
 return {page,context,app,mock,run,render,tool,setHealth:v=>health=v};
}

test('studio follows semantic tools; coalesces history; details are opt-in and safe',async t=>{
 const w=await workspace(t),{page,run}=w;
 assert.equal(await page.textContent('#agent-message'),'Ready when you are.');assert.equal(await page.locator('#agent-details').getAttribute('open'),null);
 await w.tool('figma.get_node');assert.equal(await page.locator('#agent-scene').getAttribute('data-animation'),'READ');
 for(let i=0;i<20;i++)await w.tool('figma.get_node');assert.equal(await page.locator('#agent-history li').count(),1);
 await w.tool('figma.write_html');assert.match(await page.textContent('#agent-message'),/updating the interface/);assert.equal(await page.locator('#agent-scene').getAttribute('data-animation'),'TYPE');assert.match(await page.locator('#studio-character').getAttribute('src'),/designing.png/);assert.match(await page.locator('#studio-monitor').getAttribute('src'),/designing.png/);
 await w.tool('figma.set_reactions');assert.equal(await page.locator('#agent-scene').getAttribute('data-animation'),'CONNECT');
 await w.tool('figma.get_node','completed');assert.equal(await page.locator('#agent-studio').getAttribute('data-phase'),'CHECKING');
 assert.doesNotMatch(await page.textContent('#agent-studio'),/write_html|get_node|set_reactions|PRIVATE_INPUT|HIDDEN_REASONING|Authorization|E:\\/);
 await page.locator('#agent-details summary').focus();await page.keyboard.press('Enter');assert.match(await page.textContent('#agent-technical'),/category: READ_DESIGN/);
 run.state='COMPLETED';run.result='FIGMA_DESIGN_V2: PASS';observeActivityRun(run);await w.render();assert.equal(await page.locator('#agent-scene').getAttribute('data-active'),'false');assert.match(await page.textContent('#agent-message'),/finished/);
 assert.equal(await page.locator('#agent-details').getAttribute('open'),'');assert.equal(await page.locator('#agent-message').getAttribute('role'),'status');
});

test('waiting, provider failure, recovery and findings use factual fixed copy',async t=>{
 const w=await workspace(t),{page,run}=w;
 for(const [state,extra,animation,copy]of [
  ['WAITING_FOR_USER',{},'TALK',/need your input/],
  ['FAILED',{error:{code:'PROVIDER_AUTH_REQUIRED'}},'ALERT',/reconnect your AI provider/],
  ['RUNNING',{checking:true},'RECOVER',/checking the last change/],
  ['COMPLETED',{recovery:'RECOVERED_COMPLETED'},'DONE',/already completed/],
  ['COMPLETED',{result:'FIGMA_BROWSER_TEST: FAIL'},'ALERT',/findings to review/]
 ]){Object.assign(run,{state,error:null,checking:false,recovery:null,result:''},extra);observeActivityRun(run);await w.render();assert.equal(await page.locator('#agent-scene').getAttribute('data-animation'),animation);assert.match(await page.textContent('#agent-message'),copy);}
 assert.equal(w.mock.calls.some(c=>/\/(prompt|command)$/.test(c.path)),false);
});

test('960px, dark/light, narrow/zoom layout and reduced-motion keep status accessible',async t=>{
 const w=await workspace(t),{page}=w;await w.tool('figma.write_html');
 for(const colorScheme of ['light','dark']){await page.emulateMedia({colorScheme,reducedMotion:'reduce'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('.studio-character').first().evaluate(el=>getComputedStyle(el).animationName),'none');}
 for(const width of [900,480,360]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('#agent-message').isVisible(),true);}
 // A 480 CSS-pixel viewport models the reflow available at 200% zoom on a 960px window.
 await page.setViewportSize({width:480,height:450});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.evaluate(()=>document.documentElement.style.zoom='1');await mkdir('.figma-designer/presence',{recursive:true});await page.setViewportSize({width:1320,height:860});await page.screenshot({path:'.figma-designer/presence/studio-dark.png',fullPage:true});await page.emulateMedia({colorScheme:'light'});await page.screenshot({path:'.figma-designer/presence/studio-light.png',fullPage:true});await page.setViewportSize({width:900,height:650});await page.screenshot({path:'.figma-designer/presence/studio-minimum.png',fullPage:true});
});

test('real run API adds activity without changing submit count, result or question continuation',async t=>{
 const w=await workspace(t),{page,app}=w;
 for(const [input,phase]of [['vague design','WAITING'],['Use your judgment','COMPLETED']]){
  await page.fill('#prompt',input);await page.click('#send');await page.waitForFunction(phase=>document.getElementById('agent-studio').dataset.phase===phase,phase);
 }
 const runs=await(await fetch(app.url+'/api/runs')).json();assert.equal(runs.length,2);assert.equal(runs[0].sessionId,runs[1].sessionId);assert.equal(runs[0].state,'WAITING_FOR_USER');assert.match(runs[1].result,/FIGMA_DESIGN_V2: PASS/);assert.ok(runs.every(r=>r.agentActivity&&r.activityHistory.length<=10));
 assert.equal(w.mock.calls.filter(c=>c.path.endsWith('/prompt')).length,2);assert.doesNotMatch(JSON.stringify(runs.map(r=>[r.agentActivity,r.activityHistory])),/HIDDEN_REASONING|Authorization|Basic secret/);
});

test('production art is explicit PNG-only; unknown, traversal and source files are denied',async t=>{
 const {app,page}=await workspace(t);
 const assets=['room/bedroom-base',...['idle','listening','planning','designing','prototyping','checking','waiting','recovering','done','alert'].map(n=>'character/'+n),...['ready','inspecting','planning','designing','prototyping','checking','previewing','recovering','done','attention'].map(n=>'monitor/'+n)];
 for(const asset of assets){const r=await fetch(app.url+'/assets/agent-studio/'+asset+'.png');assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/png');assert.equal(r.headers.get('x-content-type-options'),'nosniff');const bytes=new Uint8Array(await r.arrayBuffer());assert.deepEqual([...bytes.slice(0,8)],[137,80,78,71,13,10,26,10]);}
 for(const path of ['/assets/agent-studio/unknown.png','/assets/agent-studio/room/bedroom-base.jpg','/assets/agent-studio/%2e%2e%2f%2e%2e%2fserver/index.mjs','/assets/agent-studio/character/idle.png/extra','/design-references/1.5-agent-studio/bedroom-base.jpg','/assets/agent-studio/room/bedroom-base.png%00.js'])assert.equal((await fetch(app.url+path)).status,404,path);
 assert.equal(await page.locator('.studio-room').evaluate(el=>el.complete&&el.naturalWidth===620),true);
 assert.equal(await page.locator('.studio-room').evaluate(el=>getComputedStyle(el).imageRendering),'pixelated');
});

test('all studio states and supporting pages remain usable in the new shell',async t=>{
 const w=await workspace(t),{page,run}=w;
 for(const [name,state]of [['listening','RUNNING'],['waiting','WAITING_FOR_USER'],['done','COMPLETED'],['alert','FAILED']]){
  Object.assign(run,{state,result:'FIGMA_DESIGN_V2: PASS',error:state==='FAILED'?{code:'PROVIDER_AUTH_REQUIRED'}:null});observeActivityRun(run);await w.render();assert.equal(await page.locator('#studio-character').evaluate(el=>el.complete&&el.naturalWidth>0),true);
 }
 for(const route of ['prototype','qa','browser','runs','settings']){await page.click(`a[href="#${route}"]`);await page.locator('#'+route).waitFor({state:'visible'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
 await page.click('a[href="#workspace"]');await page.locator('#workspace').waitFor({state:'visible'});await page.setViewportSize({width:900,height:650});
 for(const id of ['prompt','send']){const b=await page.locator('#'+id).boundingBox();assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=900&&b.y+b.height<=650,id+' must fit minimum desktop');}
});

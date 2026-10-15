import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {request} from 'node:http';
import {createApplication,projectRoot} from '../app/server/index.mjs';
import {OpenCodeClient} from '../app/server/opencode-client.mjs';
import {Runs,redact,safeError} from '../app/server/runs.mjs';
import {mockOpenCode} from './fixtures/app-opencode.mjs';
import {systemStatus} from '../app/server/status.mjs';
import {validationFixture} from './fixtures/app-validation.mjs';
async function fixture(t){
  const mock=mockOpenCode();await new Promise(r=>mock.server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${mock.server.address().port}`;
  const root=await mkdtemp(join(tmpdir(),'figma-app-'));
  const engine=new OpenCodeClient({root:projectRoot,url,password:'fixture-private-password'});
  let health={runtime:'VERIFIED',figma:'CONNECTED'};
  const app=await createApplication({root,engine,status:async()=>health,browser:async()=>({state:'NOT_BUILT',fidelity:{SOURCE_FIDELITY:'NOT_RUN'}})});await app.ready;
  async function api(path,body,headers={}){const r=await fetch(app.url+path,{method:body===undefined?'GET':'POST',headers:{Origin:app.url,'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,value:await r.json()};}
  t.after(async()=>{await app.close();await new Promise(r=>mock.server.close(r));assert.ok(root.startsWith(join(tmpdir(),'figma-app-')));await rm(root,{recursive:true,force:true});});
  async function wait(id){for(let i=0;i<30;i++){const r=(await api('/api/run/'+id)).value;if(r.state!=='RUNNING')return r;await new Promise(r=>setTimeout(r,100));}throw Error('run did not finish');}
  return {app,mock,api,wait,root,setHealth:value=>health=value};
}
test('loopback, same-origin boundary, strict paths, credentials and read-only startup',async t=>{
  const f=await fixture(t);assert.equal(f.app.server.address().address,'127.0.0.1');
  const r=await fetch(f.app.url+'/');assert.equal(r.headers.get('access-control-allow-origin'),null);assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  assert.equal((await f.api('/api/session',{}, {Origin:'https://foreign.example'})).status,403);
  assert.equal((await fetch(f.app.url+'/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
  assert.equal(await new Promise(resolve=>{const req=request(f.app.url+'/api/project',{headers:{Host:'attacker.test'}},res=>{res.resume();resolve(res.statusCode);});req.end();}),403);
  for(const path of ['/api/shell','/api/file','/api/mcp','/api/run/../../opencode.json','/%2e%2e%2fopencode.json'])assert.equal((await f.api(path)).status,404);
  const status=await f.api('/api/app/status');assert.doesNotMatch(JSON.stringify(status),/fixture-private-password|Authorization/);assert.ok(!f.mock.calls.some(c=>/prompt|command/.test(c.path)));
});
test('protocol E2E preserves prompt, explicit agent, commands and one conversation',async t=>{
  const f=await fixture(t),input='Create a neumorphic task management dashboard.';
  const a=await f.api('/api/run',{input,mode:'AUTO',requestId:randomUUID()});assert.equal(a.status,202);assert.equal((await f.wait(a.value.id)).state,'COMPLETED');
  for(const [input,mode]of [['Make the cards softer.','AUTO'],['','QA'],['','BROWSER'],['','BROWSER_TEST'],['','STATUS']]){const r=await f.api('/api/run',{input,mode,requestId:randomUUID()});assert.equal((await f.wait(r.value.id)).state,'COMPLETED');}
  const creates=f.mock.calls.filter(c=>c.path==='/api/session');assert.equal(creates.length,1);assert.equal(creates[0].body.agent,'figma-designer');
  assert.equal(f.mock.calls.find(c=>c.path.endsWith('/prompt')).body.text,input);
  assert.deepEqual(f.mock.calls.filter(c=>c.path.endsWith('/command')).map(c=>c.body.name),['figma/qa','figma/browser','figma/browser-test','figma/doctor']);
  assert.doesNotMatch(JSON.stringify((await f.api('/api/runs')).value),/HIDDEN_REASONING_SENTINEL|Authorization|private_tool/);
});

test('Unicode briefs remain intact across HTTP chunk boundaries',async t=>{
  const f=await fixture(t),input='Create a café dashboard ☕ with cake 🍰',payload=Buffer.from(JSON.stringify({input,requestId:randomUUID()})),split=payload.indexOf(Buffer.from('☕'))+1;
  const run=await new Promise((resolve,reject)=>{const req=request(f.app.url+'/api/run',{method:'POST',headers:{Origin:f.app.url,'Content-Type':'application/json'}},res=>{let text='';res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve(JSON.parse(text)));});req.on('error',reject);req.write(payload.subarray(0,split));setTimeout(()=>req.end(payload.subarray(split)),20);});
  await f.wait(run.id);assert.equal(f.mock.calls.find(c=>c.path.endsWith('/prompt')).body.text,input);
});
test('briefing continues without new session; concurrent and duplicate submissions are bounded',async t=>{
  const f=await fixture(t),requestId=randomUUID(),r=await f.api('/api/run',{input:'vague design',requestId});
  assert.equal((await f.api('/api/run',{input:'vague design',requestId})).value.id,r.value.id);
  assert.equal((await f.api('/api/run',{input:'another',requestId:randomUUID()})).status,409);
  assert.equal((await f.wait(r.value.id)).state,'WAITING_FOR_USER');
  const next=await f.api('/api/run',{input:'Task creation. Use your judgment.',requestId:randomUUID()});await f.wait(next.value.id);assert.equal(f.mock.calls.filter(c=>c.path==='/api/session').length,1);
});

test('runtime and plugin guards stop workflow submission; request limits reject arbitrary commands',async t=>{
  const f=await fixture(t);
  for(const [health,code]of [[{runtime:'HASH_MISMATCH',figma:'CONNECTED'},'RUNTIME_HASH_MISMATCH'],[{runtime:'VERIFIED',figma:'PLUGIN_NOT_CONNECTED'},'PLUGIN_NOT_CONNECTED']]){
    f.setHealth(health);await f.api('/api/app/status?refresh=1');const r=await f.api('/api/run',{input:'create',requestId:randomUUID()});assert.equal(r.status,409);assert.equal(r.value.error.code,code);
  }
  f.setHealth({runtime:'VERIFIED',figma:'CONNECTED'});await f.api('/api/app/status?refresh=1');
  assert.equal((await f.api('/api/run',{input:'create',mode:'shell',requestId:randomUUID()})).status,400);
  assert.equal((await f.api('/api/run',{input:'x'.repeat(41000),requestId:randomUUID()})).status,413);
  assert.equal(f.mock.calls.some(c=>/prompt|command/.test(c.path)),false);
});
test('provider errors are safe and external servers survive app shutdown',async t=>{
  const f=await fixture(t),r=await f.api('/api/run',{input:'provider-failure',requestId:randomUUID()});const result=await f.wait(r.value.id);assert.equal(result.state,'FAILED');assert.equal(result.error.code,'PROVIDER_AUTH_REQUIRED');assert.equal(result.recovery,'RETRY_SAFE');
  await f.app.close();assert.equal(f.mock.server.listening,true);
});

test('invalid external configuration fails safely without breaking status',async()=>{
  const engine=new OpenCodeClient({root:projectRoot,url:'invalid',password:'private-sentinel'});await assert.rejects(engine.start());assert.deepEqual(engine.status(),{state:'FAILED',version:null,owned:false,port:null});
});
test('cancel uses native interrupt; no process kill or false rollback',async t=>{
  const f=await fixture(t),r=await f.api('/api/run',{input:'create',requestId:randomUUID()});
  for(let i=0;i<20&&!f.app.runs.active.sessionId;i++)await new Promise(r=>setTimeout(r,10));
  assert.equal((await f.api('/api/run/'+r.value.id+'/cancel',{})).value.interrupted,true);assert.equal((await f.wait(r.value.id)).state,'CANCELLED');
});
test('bounded logs contain no auth/context, and state is ignored',async t=>{
  const f=await fixture(t);for(let i=0;i<130;i++)f.app.runs.log({event:'test',id:String(i)});await f.app.close();
  const log=await readFile(join(f.root,'.figma-designer/app/events.json'),'utf8');assert.equal(JSON.parse(log).length,100);assert.doesNotMatch(log,/fixture-private-password|Authorization/);
  assert.match(await readFile(join(projectRoot,'.gitignore'),'utf8'),/\.figma-designer\//);
});
test('redaction and error normalization never forward raw provider/authorization secrets',()=>{process.env.APP_TEST_SECRET='private-sentinel-123';try{assert.doesNotMatch(redact('private-sentinel-123 Authorization: Basic abcdef123456 sk-abcdefghijklmnop'),/private-sentinel|abcdef123456|sk-abc/);assert.equal(safeError(Error('ModelNotFound')).code,'MODEL_UNAVAILABLE');}finally{delete process.env.APP_TEST_SECRET;}});
test('owned process is bound locally, authenticated, and removed on shutdown',async t=>{
  let child;
  const engine=new OpenCodeClient({root:projectRoot,executable:process.execPath,versionOf:()=> 'opencode v2.0.24',launch:(_exe,args,options)=>{assert.deepEqual(args.slice(0,3),['serve','--hostname','127.0.0.1']);assert.ok(options.env.OPENCODE_PASSWORD.length>=32);child=spawn(process.execPath,[fileURLToPath(new URL('./fixtures/app-opencode.mjs',import.meta.url)),args.at(-1)],options);return child;}});
  t.after(()=>engine.stop());await engine.start();assert.equal(engine.status().owned,true);await engine.stop();assert.throws(()=>process.kill(child.pid,0));
});
test('runtime integrity and Figma disconnection use fixed read-only evidence',async t=>{
  const root=await mkdtemp(join(tmpdir(),'figma-app-runtime-'));t.after(async()=>{assert.ok(root.startsWith(join(tmpdir(),'figma-app-runtime-')));await rm(root,{recursive:true,force:true});});
  const paths=['bin/figma-designer-mcp.exe','vendor/figma-mcp/plugin/dist/code.js','vendor/figma-mcp/plugin/dist/index.html'];const sha256={};
  for(const file of paths){await mkdir(join(root,file,'..'),{recursive:true});await writeFile(join(root,file),'synthetic-runtime');sha256[file]=createHash('sha256').update('synthetic-runtime').digest('hex');}await mkdir(join(root,'docs'));await writeFile(join(root,'docs/APPROVED_RUNTIME.json'),JSON.stringify({sha256}));
  let calls=0;const read=async tool=>{calls++;assert.equal(tool,'get_metadata');return {currentPageId:'fixture'};};assert.deepEqual(await systemStatus(root,read),{runtime:'VERIFIED',figma:'CONNECTED',connection:{bridge:'HEALTHY',plugin:'CONNECTED',document:'READABLE'}});
  await writeFile(join(root,paths[0]),'changed');assert.equal((await systemStatus(root,read)).runtime,'HASH_MISMATCH');
  assert.equal((await systemStatus(root,async()=>{throw Error('plugin not connected');})).figma,'PLUGIN_NOT_CONNECTED');assert.equal(calls,2);
});
test('preview is a separate origin with no app API or arbitrary filesystem access',async t=>{
  const f=await fixture(t);const output=join(f.root,'.figma-designer/browser-prototype');await mkdir(output,{recursive:true});await writeFile(join(output,'index.html'),'<h1>Fixture preview</h1>');
  // Replace only the fixture status: preview files remain isolated from application routes.
  const app=await createApplication({root:f.root,engine:f.app.runs.engine,status:async()=>({runtime:'VERIFIED',figma:'CONNECTED'}),browser:async()=>({state:'UNVERIFIED'})});await app.ready;t.after(()=>app.close());
  const response=await fetch(app.url+'/api/browser/preview'),value=await response.json();assert.notEqual(new URL(value.url).origin,app.url);assert.match(await(await fetch(value.url)).text(),/Fixture preview/);
  assert.equal((await fetch(value.url+'/api/run')).status,404);assert.equal((await fetch(value.url+'/../../opencode.json')).status,404);
});

test('lost submission response reconciles observed work without repeating a prompt',async()=>{
  let submitted=0;const context=[];
  const engine={createSession:async()=>({id:'session'}),context:async()=>context,submit:async()=>{submitted++;context.push({type:'assistant',content:[{type:'text',text:'FIGMA_DESIGN_V2: PASS'}]},{type:'idle',outcome:'succeeded'});throw TypeError('connection lost');}};
  const runs=new Runs(engine),run=await runs.submit({input:'create',requestId:randomUUID()});
  for(let i=0;i<20&&runs.active;i++)await new Promise(r=>setTimeout(r,10));
  assert.equal(run.state,'COMPLETED');assert.equal(submitted,1);assert.equal(runs.uncertain,false);
});

test('unresolved submission blocks new work until a new native idle is observed',async()=>{
  const context=[{type:'idle',outcome:'succeeded'}];let submitted=0;
  const engine={createSession:async()=>({id:'session'}),context:async()=>context,submit:async()=>{submitted++;throw TypeError('connection lost');}};
  const runs=new Runs(engine);await runs.submit({input:'create',requestId:randomUUID()});
  for(let i=0;i<20&&runs.active;i++)await new Promise(r=>setTimeout(r,10));
  assert.equal(runs.uncertain,true);await assert.rejects(runs.submit({input:'retry',requestId:randomUUID()}),{status:409});
  await runs.reconcile();assert.equal(runs.uncertain,true);context.push({type:'idle',outcome:'succeeded'});await runs.reconcile();assert.equal(runs.uncertain,false);assert.equal(submitted,1);
});

test('an interrupt request alone cannot relabel native successful completion as cancelled',async()=>{
  const context=[];const engine={createSession:async()=>({id:'session'}),context:async()=>context,submit:async()=>{},interrupt:async()=>({interrupted:true})};
  const runs=new Runs(engine),run=await runs.submit({input:'create',requestId:randomUUID()});
  while(!run.sessionId)await new Promise(r=>setTimeout(r,10));await runs.cancel(run.id);
  context.push({type:'assistant',content:[{type:'text',text:'FIGMA_DESIGN_V2: PASS'}]},{type:'idle',outcome:'succeeded'});
  for(let i=0;i<100&&runs.active;i++)await new Promise(r=>setTimeout(r,10));assert.equal(run.state,'COMPLETED');
});

test('native interrupted outcome remains cancellation even when a tool reports an error',async()=>{
  const context=[],engine={createSession:async()=>({id:'session'}),context:async()=>context,submit:async()=>{context.push({type:'error',error:{type:'Interrupted'}},{type:'idle',outcome:'interrupted'});}};
  const runs=new Runs(engine),run=await runs.submit({input:'create',requestId:randomUUID()});for(let i=0;i<20&&runs.active;i++)await new Promise(r=>setTimeout(r,10));assert.equal(run.state,'CANCELLED');
});

test('AI catalog whitelists metadata and reports native current model',async t=>{const f=await fixture(t);f.mock.models[0].headers={Authorization:'private-catalog-sentinel'};f.mock.integrations[0].connections[0].secret='private-key-sentinel';const a=(await f.api('/api/ai/status')).value;assert.equal(a.state,'READY');assert.equal(a.selected.id,'first');assert.equal(a.models.length,2);assert.doesNotMatch(JSON.stringify(a),/private-|Authorization|secret/);});
test('AI missing provider, missing model and missing authentication remain distinct',async t=>{const f=await fixture(t);f.mock.integrations[0].connections=[{status:{status:'needs_auth',message:'private-sentinel'}}];await f.app.ai.refresh(true);assert.equal(f.app.ai.status().state,'PROVIDER_AUTH_REQUIRED');f.mock.integrations[0].connections=[];f.app.ai.selected=null;f.mock.models.length=0;await f.app.ai.refresh(true);assert.equal(f.app.ai.status().state,'MODEL_REQUIRED');f.mock.providers.length=0;await f.app.ai.refresh(true);assert.equal(f.app.ai.status().state,'PROVIDER_REQUIRED');assert.equal((await f.api('/api/run',{input:'create',requestId:randomUUID()})).status,409);assert.ok(!f.mock.calls.some(c=>c.path.endsWith('/prompt')));});
test('model change preserves session and verifies readback before preference save',async t=>{const f=await fixture(t);await f.api('/api/session',{});const session=f.app.runs.session.id;const r=await f.api('/api/ai/model',{model:{id:'second',providerID:'fixture',headers:{secret:'not-saved'}}});assert.equal(r.status,200);assert.equal(r.value.selected.id,'second');assert.equal(f.app.runs.session.id,session);const p=JSON.parse(await readFile(join(f.root,'.figma-designer/app/preferences.json'),'utf8'));assert.deepEqual(p,{model:{id:'second',providerID:'fixture'}});assert.ok(f.mock.calls.some(c=>c.path===`/api/session/${session}/model`));assert.equal(f.mock.calls.filter(c=>c.path==='/api/session').length,1);});
test('invalid or unavailable model never reaches native switching',async t=>{const f=await fixture(t);f.mock.models[1].enabled=false;for(const model of [{id:'unknown',providerID:'fixture'},{id:'second',providerID:'fixture'},null])assert.equal((await f.api('/api/ai/model',{model})).status,409);assert.ok(!f.mock.calls.some(c=>c.path.endsWith('/model')&&c.method==='POST'));});
test('active and unresolved runs lock model changes, connect and checking',async t=>{const f=await fixture(t);const r=await f.api('/api/run',{input:'create',requestId:randomUUID()});for(const path of ['/api/ai/model','/api/ai/connect','/api/ai/check'])assert.equal((await f.api(path,{model:{id:'second',providerID:'fixture'}})).status,409);await f.wait(r.value.id);f.app.runs.uncertain=true;assert.equal((await f.api('/api/ai/model',{model:{id:'second',providerID:'fixture'}})).status,409);});
test('model preference validates at startup and never silently replaces missing selection',async t=>{const f=await fixture(t);await f.api('/api/ai/model',{model:{id:'second',providerID:'fixture'}});const {AI}=await import('../app/server/ai.mjs');const restarted=new AI(f.app.runs.engine,{active:null},f.root);await restarted.initialize();assert.equal(restarted.status().selected.id,'second');f.mock.models.splice(1);await restarted.refresh(true);assert.equal(restarted.status().state,'MODEL_UNAVAILABLE');assert.equal(restarted.selected.id,'second');f.mock.models.length=0;await restarted.refresh(true);assert.equal(restarted.status().state,'MODEL_UNAVAILABLE');});
test('native key connect stores no key in responses, events or app preferences',async t=>{const f=await fixture(t),key='fixture-transient-key-7943';const result=await f.api('/api/ai/connect',{integrationID:'fixture',type:'key',key});assert.equal(result.status,200);assert.doesNotMatch(JSON.stringify(result.value),new RegExp(key));assert.equal(f.mock.calls.find(c=>c.path.endsWith('/connect/key')).body.key,key);await f.app.close();assert.doesNotMatch(await readFile(join(f.root,'.figma-designer/app/events.json'),'utf8'),new RegExp(key));await assert.rejects(readFile(join(f.root,'.figma-designer/app/preferences.json')));});
test('native OAuth exposes only the validated sign-in URL and polls the same attempt',async t=>{const f=await fixture(t);const result=await f.api('/api/ai/connect',{integrationID:'fixture',type:'oauth',methodID:'browser'});assert.equal(result.value.url,'https://provider.example/signin');assert.equal((await f.api('/api/ai/connect',{integrationID:'fixture',type:'complete'})).status,200);assert.equal((await f.api('/api/ai/connect',{integrationID:'unknown',type:'key',key:'x'})).status,400);});
test('model check uses tool-free native generation and emits no prompt or Figma operation',async t=>{const f=await fixture(t);assert.equal((await f.api('/api/ai/check',{})).value.verified,true);assert.equal(f.mock.calls.some(c=>/\/session.*\/(prompt|command)$/.test(c.path)),false);});
test('unknown or incomplete catalog fails closed without claiming provider is missing',async()=>{const {AI}=await import('../app/server/ai.mjs');const ai=new AI({catalog:async()=>({})},{},tmpdir());await assert.rejects(ai.initialize());assert.equal(ai.status().state,'CHECKING');});
async function brokenRun({context=[],submit,fingerprint=async()=>null}={}){const engine={createSession:async()=>({id:'session'}),context:async()=>context,submit:submit??(async()=>{throw TypeError('lost');})};const runs=new Runs(engine,()=>{},fingerprint),run=await runs.submit({input:'create',requestId:randomUUID()});for(let i=0;i<100&&runs.active;i++)await new Promise(r=>setTimeout(r,10));return {runs,run,context};}
test('provider rejection before submission is safe without inventing a network cause',async()=>{const {runs,run}=await brokenRun({fingerprint:async()=>null,submit:undefined});assert.equal(run.recovery,'RECONCILIATION_REQUIRED');assert.equal(runs.uncertain,true);const engine={createSession:async()=>{throw Object.assign(Error('ProviderError'),{code:'ProviderError'});}};const a=new Runs(engine),r=await a.submit({input:'create',requestId:randomUUID()});while(a.active)await new Promise(r=>setTimeout(r,10));assert.equal(r.recovery,'RETRY_SAFE');assert.equal(r.error.code,'PROVIDER_UNAVAILABLE_SAFE');assert.match(r.error.impact,/not changed/);});
test('complete failed context without any tools permits explicit retry only',async()=>{const context=[];const {runs,run}=await brokenRun({context,submit:async()=>{context.push({type:'error',error:{type:'ProviderError'}},{type:'idle',outcome:'failed'});}});assert.equal(run.recovery,'RETRY_SAFE');assert.equal(runs.uncertain,false);});
test('tool progress with a provider error remains uncertain even when current page is unchanged',async()=>{const context=[];const {runs,run}=await brokenRun({context,fingerprint:async()=>'same',submit:async()=>{context.push({type:'assistant',content:[{type:'tool',name:'unknown'}]},{type:'error',error:{type:'ProviderError'}},{type:'idle',outcome:'failed'});}});assert.equal(run.recovery,'RECONCILIATION_REQUIRED');assert.equal(runs.uncertain,true);assert.match(run.error.impact,/may already exist/);});
test('positive page change and native idle offer continuation, never replay',async()=>{const context=[];let reads=0,writes=0;const {runs,run}=await brokenRun({context,fingerprint:async()=>++reads===1?'before':'after',submit:async()=>{writes++;context.push({type:'assistant',content:[{type:'tool',name:'write'}]},{type:'error',error:{type:'ProviderError'}},{type:'idle',outcome:'failed'});}});assert.equal(run.recovery,'CONTINUE_FROM_CURRENT_STATE');assert.equal(runs.uncertain,false);await runs.reconcile();assert.equal(writes,1);});
test('later completion recovers native result without resend',async()=>{let calls=0;const {runs,run,context}=await brokenRun({submit:async()=>{calls++;throw TypeError('lost');}});context.push({type:'assistant',content:[{type:'text',text:'FIGMA_DESIGN_V2: PASS'}]},{type:'idle',outcome:'succeeded'});await runs.reconcile();assert.equal(run.recovery,'RECOVERED_COMPLETED');assert.equal(run.state,'COMPLETED');assert.match(run.result,/PASS/);assert.equal(calls,1);});
test('unknown context event cannot be treated as proof of no writes',async()=>{const context=[];const {runs,run}=await brokenRun({context,submit:async()=>{context.push({type:'unknown-side-effect'},{type:'idle',outcome:'failed'});}});assert.equal(run.recovery,'RECONCILIATION_REQUIRED');assert.equal(runs.uncertain,true);});

test('complete failed context containing only approved inspection tools permits explicit retry',async()=>{const context=[];const {runs,run}=await brokenRun({context,submit:async()=>{context.push({type:'assistant',content:[{type:'tool',name:'figma_critique_get_node'},{type:'tool',name:'figma_qa_report'}]},{type:'error',error:{type:'ProviderError'}},{type:'idle',outcome:'failed'});}});assert.equal(run.recovery,'RETRY_SAFE');assert.equal(runs.uncertain,false);});
test('rate limiting requires structured provider status and raw provider bodies remain private',()=>{assert.equal(safeError({code:'ProviderError',providerStatus:429}).code,'PROVIDER_RATE_LIMITED');assert.notEqual(safeError({code:'ProviderError',status:429}).code,'PROVIDER_RATE_LIMITED');assert.doesNotMatch(JSON.stringify(safeError({code:'ProviderError',response:{body:'private-secret'}})),/private-secret/);});
test('unsupported native version fails closed',async()=>{const engine=new OpenCodeClient({root:projectRoot,executable:'fixture',versionOf:()=> '2.0.99',launch:()=>{throw Error('must not launch');}});await assert.rejects(engine.start(),/ENGINE_VERSION_UNVERIFIED/);assert.equal(engine.status().state,'FAILED');});

test('model operation excludes a racing run and session creation excludes model change',async t=>{const f=await fixture(t);await f.api('/api/session',{});let release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r),engine=f.app.runs.engine,original=engine.switchModel.bind(engine);engine.switchModel=async(...args)=>{entered();await gate;return original(...args);};const changing=f.api('/api/ai/model',{model:{id:'second',providerID:'fixture'}});await started;assert.equal((await f.api('/api/run',{input:'create',requestId:randomUUID()})).status,409);release();assert.equal((await changing).status,200);f.app.runs.sessionPending=Promise.resolve({id:'pending'});assert.equal((await f.api('/api/ai/model',{model:{id:'first',providerID:'fixture'}})).status,409);f.app.runs.sessionPending=null;});
test('intermediate assistant planning is excluded; final text is the user result',async()=>{const context=[];const engine={createSession:async()=>({id:'session'}),context:async()=>context,submit:async()=>{context.push({type:'assistant',content:[{type:'text',text:'INTERMEDIATE_PLAN_SENTINEL'}]},{type:'assistant',content:[{type:'reasoning',text:'HIDDEN_SENTINEL'},{type:'text',text:'Created native design. FIGMA_DESIGN_V2: PASS'}]},{type:'idle',outcome:'succeeded'});}};const runs=new Runs(engine),run=await runs.submit({input:'create',requestId:randomUUID()});while(runs.active)await new Promise(r=>setTimeout(r,10));assert.equal(run.state,'COMPLETED');assert.doesNotMatch(run.result,/SENTINEL/);});

test('provider reconnection during quarantine never unlocks or resends the uncertain task',async t=>{const f=await fixture(t);f.app.runs.uncertain=true;assert.equal((await f.api('/api/ai/connect',{integrationID:'fixture',type:'key',key:'transient-reconnect-key'})).status,200);assert.equal(f.app.runs.uncertain,true);assert.equal(f.mock.calls.filter(c=>c.path.endsWith('/prompt')).length,0);assert.equal((await f.api('/api/run',{input:'retry',requestId:randomUUID()})).status,409);});

test('new workspace isolates pre-session failures and preserves old conversation on creation failure',async t=>{const f=await fixture(t),e=f.app.runs.engine,create=e.createSession.bind(e);e.createSession=async()=>{throw Error('ProviderError');};const first=await f.api('/api/run',{input:'create',requestId:randomUUID()});const failed=await f.wait(first.value.id);assert.equal(failed.sessionId,undefined);const oldWorkspace=failed.workspaceId;e.createSession=create;await f.api('/api/session',{});assert.notEqual(f.app.runs.workspaceId,oldWorkspace);const session=f.app.runs.session,workspace=f.app.runs.workspaceId;e.createSession=async()=>{throw Error('ProviderError');};assert.equal((await f.api('/api/session',{})).status,500);assert.equal(f.app.runs.session,session);assert.equal(f.app.runs.workspaceId,workspace);});

test('models belonging to an explicitly disabled native provider are unavailable',async t=>{const f=await fixture(t);f.mock.providers[0].activation='disabled';await f.app.ai.refresh(true);assert.ok(f.app.ai.status().models.every(m=>!m.available));assert.equal((await f.api('/api/ai/model',{model:{id:'second',providerID:'fixture'}})).status,409);assert.ok(!f.mock.calls.some(c=>c.path.endsWith('/model')&&c.method==='POST'));});

test('native connection checks require the declared text response and generic 503 does not imply provider outage',async t=>{const f=await fixture(t);f.app.runs.engine.testModel=async()=>({});assert.equal((await f.api('/api/ai/check',{})).status,503);assert.equal(f.app.ai.status().verified,false);assert.equal(safeError({code:'ServiceUnavailableError',status:503}).code,'SESSION_FAILED');});

test('changed QA document is rejected even if native prose claims read-only PASS; reconciliation cannot certify it',async()=>{const context=[];let reads=0;const engine={createSession:async()=>({id:'session'}),context:async()=>context,submit:async()=>{context.push({type:'assistant',content:[{type:'tool',name:'update_node_props'},{type:'text',text:'Zero writes. FIGMA_INTERFACE_QA: PASS'}]},{type:'idle',outcome:'succeeded'});}};const runs=new Runs(engine,()=>{},async()=>++reads===1?'before':'changed'),run=await runs.submit({mode:'QA',input:'',requestId:randomUUID()});while(runs.active)await new Promise(r=>setTimeout(r,10));assert.equal(run.state,'FAILED');assert.equal(run.error.code,'READ_ONLY_VERIFICATION_FAILED');assert.equal(run.integrity.state,'CHANGED');await runs.reconcileRun(run);assert.equal(run.state,'FAILED');assert.notEqual(run.recovery,'RECOVERED_COMPLETED');});

test('recovered native QA completion still checks document integrity after context loss',async()=>{let readable=false,reads=0;const context=[],engine={createSession:async()=>({id:'session'}),context:async()=>{if(!readable&&context.length)throw TypeError('lost context');return context;},submit:async()=>{context.push({type:'assistant',content:[{type:'tool',name:'write'},{type:'text',text:'FIGMA_INTERFACE_QA: PASS'}]},{type:'idle',outcome:'succeeded'});throw TypeError('lost response');}};const runs=new Runs(engine,()=>{},async()=>++reads===1?'before':'changed'),run=await runs.submit({input:'',mode:'QA',requestId:randomUUID()});while(runs.active)await new Promise(r=>setTimeout(r,10));readable=true;await runs.reconcile();assert.equal(run.state,'FAILED');assert.equal(run.error.code,'READ_ONLY_VERIFICATION_FAILED');assert.equal(run.integrity.state,'CHANGED');});

test('lost native model-switch response is accepted only after matching readback without duplicate switch',async t=>{const f=await fixture(t);await f.api('/api/session',{});const e=f.app.runs.engine,switchModel=e.switchModel.bind(e);e.switchModel=async(...args)=>{await switchModel(...args);throw TypeError('lost switch response');};const response=await f.api('/api/ai/model',{model:{id:'second',providerID:'fixture'}});assert.equal(response.status,200);assert.equal(response.value.selected.id,'second');assert.equal(f.mock.calls.filter(c=>c.path.endsWith('/model')&&c.method==='POST').length,1);});
test('unverified native model switch blocks authoring and does not claim an active model',async t=>{const f=await fixture(t);await f.api('/api/session',{});f.app.runs.engine.session=async()=>{throw TypeError('readback unavailable');};const response=await f.api('/api/ai/model',{model:{id:'second',providerID:'fixture'}});assert.equal(response.value.error.code,'MODEL_SWITCH_UNVERIFIED');assert.equal(f.app.ai.status().state,'MODEL_REQUIRED');assert.equal(f.app.ai.status().selected,null);assert.equal((await f.api('/api/run',{input:'create',requestId:randomUUID()})).status,409);assert.ok(!f.mock.calls.some(c=>c.path.endsWith('/prompt')));});

test('fixed validation API exposes normalized evidence, never documents, arbitrary files or native context',async t=>{const f=await fixture(t),v=validationFixture('FAIL');await f.app.validation.capture({mode:'QA',integrity:{state:'UNCHANGED'}},[{content:[{type:'tool',name:'figma_qa_report',state:{status:'completed',metadata:{qaResult:v.qa,privateContext:'PRIVATE_SENTINEL'}}}]}]);const result=await f.api('/api/validation');assert.equal(result.status,200);assert.equal(result.value.contractVersion,'1.4.2');assert.equal(result.value.qa.counts.brokenControls,v.result.coverage.BROKEN);assert.equal(result.value.qa.freshness,'UNVERIFIED');assert.doesNotMatch(JSON.stringify(result.value),/PRIVATE_SENTINEL|Authorization|node_modules|private-password/);assert.equal((await f.api('/api/validation/file')).status,404);});
test('assistant prose cannot create structured QA evidence or metrics',async t=>{const f=await fixture(t);await f.app.validation.capture({mode:'QA'},[{type:'assistant',content:[{type:'text',text:'QA PASS, 99 working controls, 0 defects'}]}]);const r=await f.api('/api/validation');assert.equal(r.value.qa.status,'NOT_RUN');assert.deepEqual(r.value.qa.counts,{});});

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
  const f=await fixture(t),r=await f.api('/api/run',{input:'provider-failure',requestId:randomUUID()});const result=await f.wait(r.value.id);assert.equal(result.state,'FAILED');assert.equal(result.error.code,'PROVIDER_UNAVAILABLE');
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
  const paths=['bin/figma-mcp-go.exe','vendor/figma-mcp/plugin/dist/code.js','vendor/figma-mcp/plugin/dist/index.html'];const sha256={};
  for(const file of paths){await mkdir(join(root,file,'..'),{recursive:true});await writeFile(join(root,file),'synthetic-runtime');sha256[file]=createHash('sha256').update('synthetic-runtime').digest('hex');}await mkdir(join(root,'docs'));await writeFile(join(root,'docs/APPROVED_RUNTIME.json'),JSON.stringify({sha256}));
  let calls=0;const read=async tool=>{calls++;assert.equal(tool,'get_metadata');return {currentPageId:'fixture'};};assert.deepEqual(await systemStatus(root,read),{runtime:'VERIFIED',figma:'CONNECTED'});
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

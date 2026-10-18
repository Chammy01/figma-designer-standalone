import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Runs} from '../app/server/runs.mjs';
import {recoveryStore} from '../app/server/recovery-store.mjs';
import {observeActivityRun} from '../app/server/agent-activity.mjs';
const confirmation='KEEP_CURRENT_FIGMA';
function unresolved(checkpoint=async()=>{}){
 const context=[];let submissions=0,reads=0,sessions=0;
 const engine={createSession:async()=>({id:'fresh_'+(++sessions)}),context:async()=>context,submit:async()=>{submissions++;context.push({type:'assistant',content:[{type:'text',text:'FIGMA_REVISE: PASS'}]},{type:'idle',outcome:'succeeded'});}};
 const runs=new Runs(engine,()=>{},async()=>{reads++;return 'same';},async()=>{},async()=>{throw Error('No MCP access allowed');},checkpoint);
 const run={id:randomUUID(),workspaceId:randomUUID(),requestId:randomUUID(),mode:'AUTO',state:'FAILED',recovery:'RECONCILIATION_REQUIRED',startedAt:new Date().toISOString(),sessionId:'old_session',offset:58,submissionStarted:true,error:{code:'SESSION_FAILED'}};
 runs.runs.push(run);runs.session={id:run.sessionId};runs.workspaceId=run.workspaceId;runs.uncertain=true;observeActivityRun(run);
 return {runs,run,engine,counts:()=>({submissions,reads,sessions})};
}
for(const kind of ['completed','active','non-latest','checking','session-pending','provider-busy','resolution-pending','closed'])test('accept current state rejects '+kind,async()=>{
 const {runs,run}=unresolved();
 if(kind==='completed'){run.state='COMPLETED';run.recovery=undefined;}
 if(kind==='active')runs.active=run;
 if(kind==='non-latest')runs.runs.push({...run,id:randomUUID()});
 if(kind==='checking')run.checking=true;
 if(kind==='session-pending')runs.sessionPending=Promise.resolve();
 if(kind==='provider-busy')runs.ai={busy:true};
 if(kind==='resolution-pending')runs.resolutionPending=true;
 if(kind==='closed')runs.closed=true;
 await assert.rejects(runs.acceptCurrentState(run.id,confirmation),{status:409});assert.equal(runs.uncertain,true);
});
test('exact ID and explicit confirmation required',async()=>{const {runs,run}=unresolved();await assert.rejects(runs.acceptCurrentState(randomUUID(),confirmation),{status:404});await assert.rejects(runs.acceptCurrentState(run.id),{status:400});assert.equal(run.recovery,'RECONCILIATION_REQUIRED');});
test('durability precedes unlock and new session; no Figma call or old prompt replay',async()=>{
 let f,release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);
 f=unresolved(async candidate=>{if(candidate.id!==f.run.id)return;assert.equal(f.runs.uncertain,true);assert.equal(f.run.recovery,'RECONCILIATION_REQUIRED');assert.equal(candidate.recovery,'USER_ACCEPTED_CURRENT_STATE');assert.equal(candidate.state,'FAILED');assert.equal(f.counts().sessions,0);entered();await gate;});
 const {runs,run,counts}=f,pending=runs.acceptCurrentState(run.id,confirmation);await started;
 await assert.rejects(runs.submit({input:'fresh',requestId:randomUUID()}),{status:409});await assert.rejects(runs.newWorkspace(),{status:409});await assert.rejects(runs.acceptCurrentState(run.id,confirmation),{status:409});
 release();await pending;
 assert.equal(runs.uncertain,false);assert.equal(run.state,'FAILED');assert.equal(run.recovery,'USER_ACCEPTED_CURRENT_STATE');assert.equal(run.manualResolution.type,run.recovery);assert.ok(Number.isFinite(Date.parse(run.manualResolution.at)));assert.notEqual(runs.workspaceId,run.workspaceId);assert.equal(runs.session.id,'fresh_1');assert.deepEqual(counts(),{submissions:0,reads:0,sessions:1});
 assert.equal(run.agentActivity.phase,'IDLE');assert.equal(run.agentActivity.technical.originalOutcome,'UNVERIFIED');assert.equal(run.activityHistory.filter(x=>x.messageId==='accepted').length,1);
 await runs.reconcileRun(run);assert.equal(run.recovery,'USER_ACCEPTED_CURRENT_STATE');assert.equal(counts().submissions,0);
 const next=await runs.submit({input:'Change dashboard title to Project Overview',requestId:randomUUID()});while(runs.active)await new Promise(r=>setTimeout(r,5));assert.equal(next.state,'COMPLETED');assert.equal(next.sessionId,'fresh_1');assert.equal(counts().submissions,1);
});
test('checkpoint failure retains old recovery, session and uncertainty lock',async()=>{const {runs,run,counts}=unresolved(async()=>{throw Error('disk unavailable');});await assert.rejects(runs.acceptCurrentState(run.id,confirmation),/disk unavailable/);assert.equal(runs.uncertain,true);assert.equal(run.recovery,'RECONCILIATION_REQUIRED');assert.equal(run.manualResolution,undefined);assert.equal(runs.session.id,'old_session');assert.deepEqual(counts(),{submissions:0,reads:0,sessions:0});});
test('session creation failure never restores old context; next request uses a fresh session',async()=>{const {runs,run,engine}=unresolved();engine.createSession=async()=>{throw Error('offline');};await runs.acceptCurrentState(run.id,confirmation);assert.equal(runs.session,null);assert.notEqual(runs.workspaceId,run.workspaceId);assert.equal(runs.uncertain,false);engine.createSession=async()=>({id:'fresh_after_outage'});const next=await runs.submit({input:'new task',requestId:randomUUID()});while(runs.active)await new Promise(r=>setTimeout(r,5));assert.equal(next.sessionId,'fresh_after_outage');});
test('restart retains accepted unverified history and later completed task without replay or duplicate activity',async t=>{
 const root=await mkdtemp(join(tmpdir(),'figma-manual-recovery-'));t.after(()=>rm(root,{recursive:true,force:true}));const file=join(root,'recovery.json'),store=recoveryStore(file),f=unresolved(store.save);
 f.run.input='PRIVATE_PROMPT';await store.save(f.run);await f.runs.acceptCurrentState(f.run.id,confirmation);
 const restoredStore=recoveryStore(file),restored=new Runs(f.engine,()=>{},async()=>null,async()=>{},async()=>null,restoredStore.save);await restoredStore.restore(restored);
 assert.equal(restored.uncertain,undefined);assert.equal(restored.session,null);assert.equal(restored.workspaceId,f.run.acceptedWorkspaceId);assert.equal(restored.runs[0].state,'FAILED');assert.deepEqual(restored.runs[0].manualResolution,f.run.manualResolution);assert.equal(restored.runs[0].activityHistory.filter(x=>x.messageId==='accepted').length,1);
 const next=await restored.submit({input:'PRIVATE_NEW_PROMPT',requestId:randomUUID()});while(restored.active)await new Promise(r=>setTimeout(r,5));assert.equal(next.state,'COMPLETED');const twice=new Runs({submit:()=>{throw Error('Replay');}});await recoveryStore(file).restore(twice);await twice.reconcile();assert.equal(twice.runs.length,2);assert.equal(twice.runs[0].recovery,'USER_ACCEPTED_CURRENT_STATE');assert.equal(twice.runs[1].state,'COMPLETED');assert.ok(!twice.uncertain);assert.doesNotMatch(await readFile(file,'utf8'),/PRIVATE_|FIGMA_REVISE: PASS/);
});

test('manual acceptance cannot race a normal check checkpoint',async()=>{
 let release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);const f=unresolved(async()=>{entered();await gate;});
 f.engine.context=async()=>[];const checking=f.runs.checkLatest(f.run.id);await started;assert.equal(f.run.checking,false);await assert.rejects(f.runs.acceptCurrentState(f.run.id,confirmation),{status:409});release();await checking;assert.equal(f.runs.reconcilePending,false);assert.equal(f.run.recovery,'RECONCILIATION_REQUIRED');
});

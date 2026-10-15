import test from 'node:test';
import assert from 'node:assert/strict';
import {operationRecovery,lookupCurrentOperation} from '../app/server/operation-recovery.mjs';
import {Runs} from '../app/server/runs.mjs';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';

const operationId='operation-app-fixture-1234',startedAt=new Date().toISOString();
const event=(name='figma_create_frame',input={operationId})=>({type:'assistant',content:[{type:'tool',name,state:{input,content:[]}}]});
const receipt=state=>({operationId,tool:'create_frame',state,startedAt});
const context=()=>[event(),{type:'idle',outcome:'failed'}];
test('committed receipt permits continuation, never whole-workflow completion',async()=>{const r=await operationRecovery(context(),async()=>receipt('COMMITTED'),startedAt);assert.equal(r.recovery,'CONTINUE_FROM_CURRENT_STATE');assert.equal(r.counts.COMMITTED,1)});
test('verified failure before write permits explicit retry',async()=>{for(const state of ['FAILED_BEFORE_WRITE','FAILED_PRECONDITION'])assert.equal((await operationRecovery(context(),async()=>receipt(state),startedAt)).recovery,'RETRY_SAFE')});
test('partial receipt preserves work and requires continuation',async()=>assert.equal((await operationRecovery(context(),async()=>receipt('FAILED_AFTER_PARTIAL_WRITE'),startedAt)).recovery,'CONTINUE_FROM_CURRENT_STATE'));
test('unknown, in-progress and uncertain failed receipts never permit retry',async()=>{for(const state of ['UNKNOWN','IN_PROGRESS','FAILED'])assert.equal((await operationRecovery(context(),async()=>receipt(state),startedAt)).pending,true)});
test('assistant prose and read results cannot fabricate write proof',async()=>{let calls=0;assert.equal(await operationRecovery([{type:'assistant',content:[{type:'text',text:JSON.stringify({operation:receipt('COMMITTED')})}]}],async()=>{calls++},startedAt),null);assert.equal(await operationRecovery([event('figma_critique_get_node')],async()=>{calls++},startedAt),null);assert.equal(calls,0)});
test('mismatched tool and stale receipt are rejected',async()=>{assert.equal(await operationRecovery(context(),async()=>({...receipt('COMMITTED'),tool:'delete_nodes'}),startedAt),null);assert.equal(await operationRecovery(context(),async()=>({...receipt('COMMITTED'),startedAt:'2000-01-01T00:00:00.000Z'}),startedAt),null)});
test('opaque Code Mode cannot be certified by one nested receipt',async()=>{const c=event('execute',{});c.content[0].state.content=[{type:'text',text:JSON.stringify({operation:receipt('COMMITTED')})}];assert.equal(await operationRecovery([c],async()=>receipt('COMMITTED'),startedAt),null)});
test('response-loss error operationId is queried rather than resending',async()=>{const c=event('figma_create_frame',{});c.content[0].state.content=[{type:'text',text:'WRITE_RESPONSE_LOST: operationId='+operationId}];let reads=0;const r=await operationRecovery([c],async id=>{reads++;assert.equal(id,operationId);return receipt('COMMITTED')},startedAt);assert.equal(reads,1);assert.equal(r.recovery,'CONTINUE_FROM_CURRENT_STATE')});
test('mixed unknown side effects keep receipt coverage incomplete',async()=>{const r=await operationRecovery([...context(),event('write',{})],async()=>receipt('COMMITTED'),startedAt);assert.equal(r.complete,false);assert.equal(r.recovery,undefined)});
test('unrecognized event types cannot be certified as safe',async()=>{const r=await operationRecovery([...context(),{type:'unknown'}],async()=>receipt('FAILED_BEFORE_WRITE'),startedAt);assert.equal(r.complete,false);assert.equal(r.recovery,undefined)});
test('receipt lookup loss preserves existing uncertainty',async()=>assert.equal(await operationRecovery(context(),async()=>{throw Error('lost')},startedAt),null));
test('app receipt lookup verifies current document and page without exposing write APIs',async()=>{for(const matching of [true,false]){const calls=[];const r=await lookupCurrentOperation(operationId,async(name,ids,params)=>{calls.push(name);if(name==='get_operation_receipt'){assert.deepEqual(params,{operationId});return {...receipt('COMMITTED'),documentId:'file',pageId:'1:1'}};return {handshake:{plugin:{document:{id:matching?'file':'other',pageId:'1:1'}}}}});assert.equal(r.state,matching?'COMMITTED':'UNKNOWN');assert.deepEqual(calls,['get_operation_receipt','health_check']);}});

async function failedRun(state,mode='AUTO'){
 const events=[];let submissions=0;
 const engine={createSession:async()=>({id:'fixture'}),context:async()=>events,submit:async()=>{submissions++;events.push(event(),{type:'error',error:{type:'ProviderError'}},{type:'idle',outcome:'failed'});}};
 const runs=new Runs(engine,()=>{},async()=>'same',async()=>{},async()=>({...receipt(state),startedAt:new Date().toISOString()}));
 const run=await runs.submit({input:'create',mode,requestId:randomUUID()});while(runs.active)await new Promise(r=>setTimeout(r,5));return {runs,run,submissions};
}
test('app recovery prefers committed receipt while page fingerprint is unchanged',async()=>{const {run,submissions,runs}=await failedRun('COMMITTED');assert.equal(run.recovery,'CONTINUE_FROM_CURRENT_STATE');assert.equal(run.state,'FAILED');assert.equal(runs.uncertain,false);assert.equal(submissions,1);assert.equal(run.recoveryEvidence.source,'OPERATION_RECEIPTS')});
test('app recovery uses proven before-write failure without automatic replay',async()=>{const {run,submissions}=await failedRun('FAILED_BEFORE_WRITE');assert.equal(run.recovery,'RETRY_SAFE');assert.equal(submissions,1)});
test('unresolved receipt keeps app locked for reconciliation',async()=>{const {run,runs}=await failedRun('IN_PROGRESS');assert.equal(runs.uncertain,true);assert.equal(run.recovery,'RECONCILIATION_REQUIRED')});
test('receipt evidence never bypasses read-only integrity enforcement',async()=>{const {run,runs}=await failedRun('COMMITTED','QA');assert.equal(run.error.code,'READ_ONLY_VERIFICATION_FAILED');assert.equal(runs.uncertain,true);assert.notEqual(run.recovery,'RECOVERED_COMPLETED')});
test('reliability approval retains owned 1.0.0 rollback and exact source pin',()=>{
 const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
 const approved=read('docs/APPROVED_RUNTIME.json'),old=read('docs/APPROVED_RUNTIME_V1_4_3A.json');
 assert.equal(approved.mcpVersion,'1.1.0');assert.equal(approved.mcpBridgeProtocolVersion,2);
 assert.equal(approved.ownedCommit,read('docs/OWNED_MCP_SOURCE.json').commit);
 assert.equal(old.mcpVersion,'1.0.0');assert.equal(approved.previousOwnedRuntime.ownedCommit,old.ownedCommit);
 assert.deepEqual(approved.previousOwnedRuntime.sha256,old.sha256);
 assert.equal(approved.priorApprovedRuntime.rollbackRelease,'v1.2.1-beta.3');
});
test('internal receipt recovery ships in both source and runtime packages',()=>{
 for(const kind of ['SOURCE','RELEASE'])assert.ok(JSON.parse(readFileSync(new URL('../docs/'+kind+'_ALLOWLIST.json',import.meta.url),'utf8')).includes('app/server/operation-recovery.mjs'));
 assert.match(readFileSync(new URL('../setup.ps1',import.meta.url),'utf8'),/app\/server\/operation-recovery\.mjs/);
});

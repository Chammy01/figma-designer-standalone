import {randomUUID} from 'node:crypto';
import {isCritiqueReadTool} from '../../.opencode/plugins/figma-critique-guard.js';
import {qaReportTool} from '../../rules/figma-qa-guard.mjs';
import {redact} from '../shared/result-contract.mjs';
import {operationRecovery} from './operation-recovery.mjs';
import {observeActivityContext,observeActivityRun} from './agent-activity.mjs';
export {redact} from '../shared/result-contract.mjs';

export const modes=['AUTO','DESIGN','QA','BROWSER','BROWSER_TEST','STATUS'];
export function safeError(error) {
  const tag=String(error?.code??error?.message??'');
  if(tag==='MODEL_SWITCH_UNVERIFIED')return {code:tag,title:'Model change not confirmed',message:'Choose and apply a model before starting another task. The last change could not be verified.',recoverable:true};
  if(tag==='PROVIDER_CONNECT_INVALID')return {code:tag,title:'Check your provider details',message:'Enter an API key or choose a supported sign-in method.',recoverable:true};
  if(tag==='MCP_INCOMPATIBLE')return {code:tag,title:'Plugin update needed',message:'Run the matching Figma Designer MCP development plugin and choose Check Again.',recoverable:true};
  if(['PLUGIN_NOT_CONNECTED','MCP_UNAVAILABLE','FIGMA_DISCONNECTED'].includes(tag))return {code:tag,title:'Figma disconnected',message:'Open your Figma file and run the Figma Designer development plugin, then choose Check Again.',recoverable:true};
  const code=['PROVIDER_REQUIRED','MODEL_REQUIRED','PROVIDER_AUTH_REQUIRED','MODEL_CHANGE_LOCKED','MODEL_UNAVAILABLE','READ_ONLY_VERIFICATION_FAILED'].includes(tag)?tag:/auth|credential/i.test(tag)?'PROVIDER_AUTH_REQUIRED':error?.providerStatus===429?'PROVIDER_RATE_LIMITED':/model/i.test(tag)?'MODEL_UNAVAILABLE':/provider/i.test(tag)?'PROVIDER_UNAVAILABLE':/runtime/i.test(tag)?'RUNTIME_HASH_MISMATCH':/OPENCODE|ENGINE/i.test(tag)?'OPENCODE_START_FAILED':'SESSION_FAILED';
  const copy={PROVIDER_REQUIRED:['AI provider needed','Connect an AI provider before starting a design.'],MODEL_REQUIRED:['Choose an AI model','Choose an available model to continue.'],PROVIDER_AUTH_REQUIRED:['Reconnect your AI provider','Your provider needs authentication before it can continue.'],MODEL_UNAVAILABLE:['Selected model unavailable','Choose another available model to continue.'],MODEL_CHANGE_LOCKED:['Finish the current task first','Models stay locked while a task is running or its result needs checking.'],PROVIDER_UNAVAILABLE:['AI provider unavailable','Your provider could not complete the request.'],PROVIDER_RATE_LIMITED:['Your provider needs a moment','The provider reported a request limit. Wait before trying again.'],RUNTIME_HASH_MISMATCH:['Runtime verification needs attention','Restore the approved runtime before starting design work.'],OPENCODE_START_FAILED:['Design engine unavailable','Check the application setup and choose Check Again.'],SESSION_FAILED:['This task needs attention','The design engine could not finish this task.']};
  copy.READ_ONLY_VERIFICATION_FAILED=['Read-only verification failed','The current Figma page changed during this check. Its read-only result was not accepted. Review the changes before continuing.'];
  const [title,message]=copy[code];return {code,title,message,recoverable:true};
}
export class Runs {
  constructor(engine,log=()=>{},fingerprint=async()=>null,result=async()=>{},lookup=async()=>null,checkpoint=async()=>{}){this.engine=engine;this.log=log;this.fingerprint=fingerprint;this.result=result;this.lookup=lookup;this.checkpoint=checkpoint;this.runs=[];this.session=null;this.workspaceId=randomUUID();this.active=null;this.closed=false;}
  async sessionForWorkspace(){if(!this.session){this.sessionPending??=this.engine.createSession(this.ai?.selected);try{this.session=await this.sessionPending;}finally{this.sessionPending=null;}}return this.session;}
  async newWorkspace(){if(this.resolutionPending||this.sessionPending)throw Object.assign(Error('Workspace operation in progress'),{status:409});this.sessionPending=this.engine.createSession(this.ai?.selected);try{const session=await this.sessionPending;this.session=session;this.workspaceId=randomUUID();return session;}finally{this.sessionPending=null;}}
  async verifyReadOnly(run){
    if(!['QA','BROWSER','BROWSER_TEST'].includes(run.mode))return;
    const after=await this.fingerprint().catch(()=>null);
    run.integrity={scope:'current-page',state:!run.beforeFingerprint||!after?'UNVERIFIED':run.beforeFingerprint===after?'UNCHANGED':'CHANGED',beforeFingerprint:run.beforeFingerprint??null,afterFingerprint:after};
    if(run.integrity.state==='CHANGED')throw Object.assign(Error('READ_ONLY_VERIFICATION_FAILED'),{code:'READ_ONLY_VERIFICATION_FAILED'});
  }
  async submit({input='',mode='AUTO',requestId}) {
    if(!modes.includes(mode)||typeof input!=='string'||input.length>32000||(!input.trim()&&mode==='AUTO')||!requestId||!/^[\w-]{8,80}$/.test(requestId))throw Object.assign(Error('Invalid request'),{status:400});
    const existing=this.runs.find(r=>r.requestId===requestId);if(existing)return existing;
    if(this.active||this.uncertain||this.resolutionPending||this.ai?.busy||this.sessionPending)throw Object.assign(Error('A task is running or its result needs checking'),{status:409});
    this.ai?.assertReady();
    const run={id:randomUUID(),workspaceId:this.workspaceId,requestId,input:redact(input),mode,state:'RUNNING',startedAt:new Date().toISOString(),result:'',activity:'Working…'};
    observeActivityRun(run);
    this.active=run;this.runs.push(run);if(this.runs.length>50)this.runs.shift();
    this.work(run,input);return run;
  }
  async work(run,input){
    let resultContext;
    try{
      run.beforeFingerprint=await this.fingerprint().catch(()=>null);
      const session=await this.sessionForWorkspace();run.sessionId=session.id;
      const before=await this.engine.context(session.id);run.offset=before.length;
      await this.checkpoint({...run,submissionStarted:true});
      try{run.submissionStarted=true;await this.engine.submit(session.id,run.mode,input);}catch(error){
        if(error.status && error.status<500 || /provider|model/i.test(error.code??''))throw error;
        // A lost submission response can hide completed writes; inspect, never resend.
        this.uncertain=true;this.uncertainOffset=run.offset;
        observeActivityRun(run,{recovering:true});
        const observed=await this.engine.context(session.id);
        if(observed.length<=run.offset)throw error;
        run.responseLost=true;
        this.uncertain=false;
      }
      while(!this.closed){
        const context=(await this.engine.context(session.id)).slice(run.offset);
        observeActivityContext(run,context);
        const messages=context.filter(m=>m.type==='assistant');
        const finalText=(messages.at(-1)?.content??[]).filter(c=>c.type==='text').map(c=>c.text).join('\n\n');
        const error=context.find(m=>m.type==='error'||m.error);
        const idle=context.at(-1);
        if(idle?.type==='idle'){
          resultContext=context;
          run.result=redact(this.engine.sanitize?.(finalText)??finalText).slice(-100000);
          if(idle.outcome==='interrupted'){run.state='CANCELLED';break;}
          if(error)throw Object.assign(Error(error.error?.type??error.type),{providerStatus:error.error?.status});
          if(idle.outcome==='failed')throw Error('SESSION_FAILED');
          await this.verifyReadOnly(run);
          this.engine.providerRequired=false;
          run.state=/FIGMA_[A-Z0-9_]+:\s*(?:PASS|WARN|FAIL|HOLD|BLOCKED)/.test(run.result)?'COMPLETED':'WAITING_FOR_USER';if(run.responseLost&&run.state==='COMPLETED')run.recovery='RECOVERED_COMPLETED';break;
        }
        await new Promise(r=>setTimeout(r,700));
      }
    }catch(error){run.state='FAILED';run.error=safeError(error);run.recovery='RECONCILIATION_REQUIRED';this.uncertain=true;this.uncertainOffset=run.offset??0;await this.reconcileRun(run);}
    finally{await this.result(run,resultContext).catch(()=>{run.validationUnavailable=true;});run.finishedAt=new Date().toISOString();run.activity='';if(this.closed&&run.state==='RUNNING'){run.state='FAILED';run.recovery='RECONCILIATION_REQUIRED';}observeActivityRun(run);await this.checkpoint(run).catch(()=>{this.uncertain=true;});this.active=null;this.log({event:'run',id:run.id,state:run.state,code:run.error?.code});}
  }
  async reconcileRun(run){
    if(run.checking||this.resolutionPending||run.recovery==='USER_ACCEPTED_CURRENT_STATE')return;
    run.checking=true;
    observeActivityRun(run,{recovering:true});
    try{
      if(!run.submissionStarted){run.recovery='RETRY_SAFE';this.uncertain=false;return;}
      const context=(await this.engine.context(run.sessionId)).slice(run.offset??0),idle=context.at(-1);
      if(idle?.type!=='idle')return;
      const operations=await operationRecovery(context,this.lookup,run.startedAt);
      if(operations){
        run.recoveryEvidence={source:operations.source,counts:operations.counts,complete:operations.complete};
        if(['QA','BROWSER','BROWSER_TEST'].includes(run.mode)&&operations.counts.COMMITTED+operations.counts.FAILED_AFTER_PARTIAL_WRITE>0){run.error=safeError(Error('READ_ONLY_VERIFICATION_FAILED'));return;}
        if(operations.pending)return;
        if(operations.complete&&run.integrity?.state!=='CHANGED'){
          run.recovery=operations.recovery;this.uncertain=false;return;
        }
      }
      const text=(context.filter(m=>m.type==='assistant').at(-1)?.content??[]).filter(c=>c.type==='text').map(c=>c.text).join('\n\n');
      if(run.integrity?.state!=='CHANGED'&&idle.outcome==='succeeded'&&!context.some(m=>m.type==='error'||m.error)&&/FIGMA_[A-Z0-9_]+:\s*(?:PASS|WARN|FAIL|HOLD|BLOCKED)/.test(text)){
        await this.verifyReadOnly(run).catch(error=>run.error=safeError(error));
        if(run.integrity?.state==='CHANGED')await this.result(run,context).catch(()=>{run.validationUnavailable=true;});
        if(run.integrity?.state!=='CHANGED'){run.result=redact(this.engine.sanitize?.(text)??text).slice(-100000);run.state='COMPLETED';run.recovery='RECOVERED_COMPLETED';delete run.error;this.uncertain=false;await this.result(run,context).catch(()=>{run.validationUnavailable=true;});return;}
      }
      // Unknown events/tools can have side effects. An idle event alone never proves a safe retry.
      const onlyReads=context.every(m=>['user','assistant','idle','error'].includes(m.type)&&(!m.content||m.content.every(c=>['text','reasoning'].includes(c.type)||c.type==='tool'&&(isCritiqueReadTool(c.name)||c.name===qaReportTool))));
      if(onlyReads&&run.integrity?.state!=='CHANGED'){run.recovery='RETRY_SAFE';this.uncertain=false;return;}
      const after=await this.fingerprint().catch(()=>null);
      if(after&&run.beforeFingerprint&&after!==run.beforeFingerprint){
        await new Promise(r=>setTimeout(r,500));
        if(await this.fingerprint().catch(()=>null)===after&&(await this.engine.context(run.sessionId)).at(-1)?.type==='idle'){run.recovery='CONTINUE_FROM_CURRENT_STATE';this.uncertain=false;}
      }
    }catch{}finally{run.checking=false;if(run.error){run.error.impact=run.recovery==='RETRY_SAFE'?'Your Figma file was not changed by this request.':run.recovery==='CONTINUE_FROM_CURRENT_STATE'?'Changes were found in the current Figma page. Preserve them and continue from the current design.':'Some changes may already exist in Figma. Check the current result before repeating this request.';if(run.error.code==='PROVIDER_UNAVAILABLE')run.error.code=run.recovery==='RETRY_SAFE'?'PROVIDER_UNAVAILABLE_SAFE':'PROVIDER_UNAVAILABLE_UNCERTAIN';}observeActivityRun(run);}
  }
  async checkLatest(id){
    const run=this.runs.find(r=>r.id===id);
    if(!run)throw Object.assign(Error('Run not found'),{status:404});
    if(this.active||this.resolutionPending||this.reconcilePending||run.checking||run!==this.runs.at(-1))throw Object.assign(Error('Only the latest finished task can be checked'),{status:409});
    this.reconcilePending=true;
    try{await this.reconcileRun(run);await this.checkpoint(run);return run;}finally{this.reconcilePending=false;}
  }
  async reconcile(){if(this.uncertain&&!this.active&&!this.resolutionPending&&!this.reconcilePending){const run=this.runs.at(-1);if(run&&!run.checking)await this.checkLatest(run.id);}}
  async acceptCurrentState(id,confirmation){
    const run=this.runs.find(r=>r.id===id);
    if(!run)throw Object.assign(Error('Run not found'),{status:404});
    if(confirmation!=='KEEP_CURRENT_FIGMA')throw Object.assign(Error('Explicit confirmation required'),{status:400});
    if(run!==this.runs.at(-1)||run.state!=='FAILED'||run.recovery!=='RECONCILIATION_REQUIRED'||!this.uncertain||this.active||run.checking||this.reconcilePending||this.resolutionPending||this.sessionPending||this.ai?.busy||this.closed)throw Object.assign(Error('Only the latest unresolved finished task can be accepted'),{status:409});
    this.resolutionPending=true;
    try{
      // Persist a candidate, not a live mutation: a failed checkpoint keeps the lock and old record.
      const candidate={...run,recovery:'USER_ACCEPTED_CURRENT_STATE',manualResolution:{type:'USER_ACCEPTED_CURRENT_STATE',at:new Date().toISOString()},acceptedWorkspaceId:randomUUID()};
      await this.checkpoint(candidate);
      Object.assign(run,candidate);
      this.uncertain=false;
      // A fresh boundary is durable above. Never continue the old session, even after a crash.
      this.workspaceId=run.acceptedWorkspaceId;this.session=null;this.uncertainOffset=null;
      observeActivityRun(run);
      // Creating a session submits no prompt. Failure leaves a fresh, empty boundary for the next task.
      try{await this.sessionForWorkspace();}catch{}
      this.log({event:'manual-resolution',id:run.id,type:run.recovery});
      return run;
    }finally{this.resolutionPending=false;}
  }
  async cancel(id){const run=this.runs.find(r=>r.id===id);if(!run)throw Object.assign(Error('Run not found'),{status:404});if(run!==this.active)return run; if(!run.sessionId)throw Object.assign(Error('Run is starting; check again'),{status:409});const value=await this.engine.interrupt(run.sessionId);run.cancelRequested=value.interrupted===true;return {interrupted:run.cancelRequested,message:run.cancelRequested?'Interrupt requested. Any completed Figma writes remain; verify before retrying.':'No active engine operation was interrupted.'};}
}

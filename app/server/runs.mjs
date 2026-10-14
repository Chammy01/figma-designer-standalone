import {randomUUID} from 'node:crypto';

export const modes=['AUTO','DESIGN','QA','BROWSER','BROWSER_TEST','STATUS'];
export function safeError(error) {
  const tag=String(error?.code??error?.message??'');
  const code=/provider|auth|credential/i.test(tag)?'PROVIDER_UNAVAILABLE':/model/i.test(tag)?'MODEL_UNAVAILABLE':/runtime/i.test(tag)?'RUNTIME_HASH_MISMATCH':/OPENCODE|ENGINE/i.test(tag)?'OPENCODE_START_FAILED':'SESSION_FAILED';
  return {code,title:code==='PROVIDER_UNAVAILABLE'?'Provider unavailable':'Engine request needs attention',message:'The engine could not complete this request. Check your local OpenCode configuration. Do not repeat a possibly running write without checking its result.',recoverable:true,recommendedAction:'Check System, then review the run before retrying.'};
}
export function redact(text) {
  let value=String(text);
  for(const [key,secret]of Object.entries(process.env))if(/TOKEN|SECRET|PASSWORD|API_KEY/i.test(key)&&secret?.length>=8)value=value.replaceAll(secret,'[redacted]');
  return value.replace(/\b(?:sk-[\w-]{12,}|gh[pousr]_[\w]{15,}|github_pat_[\w]{15,})\b/g,'[redacted]').replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9+/=._-]{8,}/gi,'[redacted]');
}
export class Runs {
  constructor(engine,log=()=>{}){this.engine=engine;this.log=log;this.runs=[];this.session=null;this.active=null;this.closed=false;}
  async sessionForWorkspace(){if(!this.session){this.sessionPending??=this.engine.createSession();try{this.session=await this.sessionPending;}finally{this.sessionPending=null;}}return this.session;}
  async submit({input='',mode='AUTO',requestId}) {
    if(!modes.includes(mode)||typeof input!=='string'||input.length>32000||(!input.trim()&&mode==='AUTO')||!requestId||!/^[\w-]{8,80}$/.test(requestId))throw Object.assign(Error('Invalid request'),{status:400});
    const existing=this.runs.find(r=>r.requestId===requestId);if(existing)return existing;
    if(this.active||this.uncertain)throw Object.assign(Error('A run is active or awaiting engine reconciliation'),{status:409});
    const run={id:randomUUID(),requestId,input:redact(input),mode,state:'RUNNING',startedAt:new Date().toISOString(),result:'',activity:'Working…'};
    this.active=run;this.runs.push(run);if(this.runs.length>50)this.runs.shift();
    this.work(run,input);return run;
  }
  async work(run,input){
    try{
      const session=await this.sessionForWorkspace();run.sessionId=session.id;
      const before=await this.engine.context(session.id);run.offset=before.length;
      try{await this.engine.submit(session.id,run.mode,input);}catch(error){
        if(error.status && error.status<500 || /provider|model/i.test(error.code??''))throw error;
        // A lost submission response can hide completed writes; inspect, never resend.
        this.uncertain=true;this.uncertainOffset=run.offset;
        const observed=await this.engine.context(session.id);
        if(observed.length<=run.offset)throw error;
        this.uncertain=false;
      }
      while(!this.closed){
        const context=(await this.engine.context(session.id)).slice(run.offset);
        const messages=context.filter(m=>m.type==='assistant');
        run.result=redact(this.engine.sanitize?.(messages.flatMap(m=>(m.content??[]).filter(c=>c.type==='text').map(c=>c.text)).join('\n\n'))??messages.flatMap(m=>(m.content??[]).filter(c=>c.type==='text').map(c=>c.text)).join('\n\n')).slice(-100000);
        const error=context.find(m=>m.type==='error'||m.error);
        const idle=context.at(-1);
        if(idle?.type==='idle'){
          if(idle.outcome==='interrupted'){run.state='CANCELLED';break;}
          if(error)throw Error(error.error?.type??error.error?.message??error.type);
          if(idle.outcome==='failed')throw Error('SESSION_FAILED');
          this.engine.providerRequired=false;
          run.state=/FIGMA_[A-Z0-9_]+:\s*(?:PASS|WARN|FAIL|HOLD|BLOCKED)/.test(run.result)?'COMPLETED':'WAITING_FOR_USER';break;
        }
        await new Promise(r=>setTimeout(r,700));
      }
    }catch(error){if(['TypeError','TimeoutError','AbortError'].includes(error.name)){this.uncertain=true;this.uncertainOffset=run.offset??0;}run.state='FAILED';run.error=safeError(error);if(run.error.code==='PROVIDER_UNAVAILABLE')this.engine.providerRequired=true;}
    finally{run.finishedAt=new Date().toISOString();run.activity='';this.active=null;this.log({event:'run',id:run.id,state:run.state,code:run.error?.code});}
  }
  async reconcile(){if(this.uncertain&&this.session){try{const context=await this.engine.context(this.session.id);if(context.length>this.uncertainOffset&&context.at(-1)?.type==='idle')this.uncertain=false;}catch{}}}
  async cancel(id){const run=this.runs.find(r=>r.id===id);if(!run)throw Object.assign(Error('Run not found'),{status:404});if(run!==this.active)return run; if(!run.sessionId)throw Object.assign(Error('Run is starting; check again'),{status:409});const value=await this.engine.interrupt(run.sessionId);run.cancelRequested=value.interrupted===true;return {interrupted:run.cancelRequested,message:run.cancelRequested?'Interrupt requested. Any completed Figma writes remain; verify before retrying.':'No active engine operation was interrupted.'};}
}

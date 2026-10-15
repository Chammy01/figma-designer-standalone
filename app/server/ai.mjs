import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';

const ref=m=>m?{id:m.id,providerID:m.providerID}:null;
const same=(a,b)=>a?.id===b?.id&&a?.providerID===b?.providerID;
const fail=(code,status=409)=>Object.assign(Error(code),{code,status});

// OpenCode owns credentials. Only a validated model reference is saved here.
export class AI {
  constructor(engine,runs,root){this.engine=engine;this.runs=runs;this.file=join(root,'.figma-designer/app/preferences.json');this.selected=null;this.checked=null;}
  async initialize(){try{const p=JSON.parse(await readFile(this.file,'utf8'));if(typeof p.model?.id==='string'&&typeof p.model?.providerID==='string')this.selected=ref(p.model);}catch{}await this.refresh(true);}
  async refresh(force=false){
    if(!force&&this.snapshot&&Date.now()-this.updated<15000)return this.status();
    this.pending??=this.load().finally(()=>this.pending=null);await this.pending;return this.status();
  }
  async load(){
    let providers=await this.engine.catalog('provider');const integrations=await this.engine.catalog('integration');
    let models=await this.engine.catalog('model'),fallback=await this.engine.catalog('model/default');
    // The native catalog is lazy on both audited versions; empty is not proof of missing credentials.
    if(!models?.length)models=await this.engine.catalog('model');
    if(!fallback?.id)fallback=await this.engine.catalog('model/default');
    if(!providers?.length&&models?.length)providers=await this.engine.catalog('provider');
    if(!Array.isArray(models)||!Array.isArray(providers)||!Array.isArray(integrations))throw fail('AI_CATALOG_UNAVAILABLE',503);
    this.rawIntegrations=integrations;
    this.models=models.map(m=>({id:m.id,providerID:m.providerID,name:m.name||m.id,available:m.enabled===true&&m.status!=='deprecated'&&m.capabilities?.tools!==false&&!providers.some(p=>p.id===m.providerID&&p.activation==='disabled')}));
    this.providers=providers.map(p=>({id:p.id,name:p.name||p.id,integrationID:p.integrationID,disabled:p.activation==='disabled'}));
    this.integrations=integrations.map(p=>({id:p.id,name:p.name||p.id,connected:!!p.connections?.length,needsAuth:!!p.connections?.length&&p.connections.every(c=>c.status?.status==='needs_auth'),methods:p.methods.filter(m=>['key','oauth'].includes(m.type)).map(m=>({type:m.type,id:m.id,label:m.label||m.type,supported:!m.form}))}));
    if(!this.selected&&fallback?.id)this.selected=ref(fallback);
    this.snapshot=true;this.updated=Date.now();
  }
  status(){
    const model=this.models?.find(m=>same(m,this.selected)),provider=this.providers?.find(p=>p.id===this.selected?.providerID),integration=this.integrations?.find(p=>p.id===(provider?.integrationID??this.selected?.providerID));
    const state=!this.snapshot?'CHECKING':this.selectionUnverified?'MODEL_REQUIRED':integration?.needsAuth?'PROVIDER_AUTH_REQUIRED':this.selected&&!model?.available?'MODEL_UNAVAILABLE':!this.models.length?(this.providers.length?'MODEL_REQUIRED':'PROVIDER_REQUIRED'):!this.selected?'MODEL_REQUIRED':provider?.disabled?'PROVIDER_REQUIRED':'READY';
    return {state,selected:this.selectionUnverified?null:model??(this.selected?{...this.selected,name:this.selected.id,available:false}:null),selectionUnverified:!!this.selectionUnverified,verified:!this.selectionUnverified&&!!this.checked&&same(this.checked,this.selected),busy:!!this.busy,locked:!!(this.runs.active||this.runs.uncertain||this.runs.sessionPending),providers:this.providers??[],models:this.models??[],integrations:this.integrations??[]};
  }
  assertReady(){const state=this.status().state;if(state!=='READY')throw fail(state);}
  async exclusive(fn,allowUncertain=false){if(this.busy||this.runs.active||this.runs.uncertain&&!allowUncertain||this.runs.sessionPending)throw fail('MODEL_CHANGE_LOCKED');this.busy=true;try{return await fn();}finally{this.busy=false;}}
  async choose(model){return this.exclusive(async()=>{
    await this.refresh(true);const actual=this.models.find(m=>same(m,model)&&m.available);if(!actual)throw fail('MODEL_UNAVAILABLE');
    const chosen=ref(actual);
    if(this.runs.session){
      this.selectionUnverified=true;
      // A lost switch response is indeterminate too; read back before accepting it.
      await this.engine.switchModel(this.runs.session.id,chosen).catch(()=>{});
      const observed=await this.engine.session(this.runs.session.id).catch(()=>null);
      if(!same(observed?.model,chosen))throw fail('MODEL_SWITCH_UNVERIFIED');
      this.runs.session.model=chosen;
    }
    this.selectionUnverified=false;
    this.selected=chosen;this.checked=null;await mkdir(join(this.file,'..'),{recursive:true});await writeFile(this.file,JSON.stringify({model:chosen}));return this.status();
  });}
  async check(){return this.exclusive(async()=>{this.checked=null;await this.refresh(true);this.assertReady();const result=await this.engine.testModel(this.selected);if(typeof result?.text!=='string'||!result.text.trim())throw fail('AI_CHECK_UNVERIFIED',503);this.checked=ref(this.selected);return this.status();});}
  async connect({integrationID,type,methodID,key,attemptID,code}){return this.exclusive(async()=>{
    await this.refresh(true);const integration=this.rawIntegrations.find(p=>p.id===integrationID);
    if(!integration)throw fail('PROVIDER_UNKNOWN',400);
    if(type==='key'){
      if(!integration.methods.some(m=>m.type==='key'&&!m.form)||typeof key!=='string'||!key.trim()||key.length>12000)throw fail('PROVIDER_CONNECT_INVALID',400);
      await this.engine.connect(integrationID,'key',{key});
    }else if(type==='oauth'){
      if(!integration.methods.some(m=>m.type==='oauth'&&m.id===methodID&&!m.form))throw fail('PROVIDER_CONNECT_LIMITED',400);
      const attempt=await this.engine.connect(integrationID,'oauth',{methodID});const url=new URL(attempt.url);
      if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw fail('PROVIDER_CONNECT_INVALID');
      this.attempt={integrationID,attemptID:attempt.attemptID};return {url:url.href,mode:attempt.mode,awaitingAuthentication:true};
    }else if(type==='complete'){
      if(this.attempt?.integrationID!==integrationID)throw fail('PROVIDER_CONNECT_INVALID',400);
      if(typeof code==='string'&&code.trim())await this.engine.connect(integrationID,'oauth',{code},this.attempt.attemptID,true);
      else {const result=await this.engine.connect(integrationID,'oauth',undefined,this.attempt.attemptID);if(result.status!=='complete')return {awaitingAuthentication:true};}
      this.attempt=null;
    }else throw fail('PROVIDER_CONNECT_INVALID',400);
    this.checked=null;await this.engine.reload();await this.refresh(true);return this.status();
  },true);}
}

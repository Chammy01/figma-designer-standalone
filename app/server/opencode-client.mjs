import {spawn,execFile,execFileSync} from 'node:child_process';
import {promisify} from 'node:util';
import {createServer} from 'node:net';
import {randomBytes} from 'node:crypto';
import {access} from 'node:fs/promises';
import {join,resolve,delimiter} from 'node:path';

export async function findOpenCode() {
  const candidates=[process.env.OPENCODE_EXECUTABLE,...(process.env.PATH??'').split(delimiter).flatMap(p=>[join(p,process.platform==='win32'?'opencode.exe':'opencode'),join(p,'node_modules/@opencode/cli/bin/opencode.exe')])].filter(Boolean);
  for(const file of candidates)try{await access(file);return file;}catch{}
  throw new Error('OPENCODE_START_FAILED');
}

export class OpenCodeClient {
  #password; #child; #url;
  constructor({root,executable,url,password,launch=spawn,versionOf=file=>execFileSync(file,['--version'],{encoding:'utf8',windowsHide:true,timeout:10000})}={}) {this.root=root;this.executable=executable;this.#url=url;this.#password=password;this.launch=launch;this.versionOf=versionOf;this.state='STOPPED';this.owned=false;}
  async api(path,body,{method=body===undefined?'GET':'POST',timeout=30000}={}) {
    const r=await fetch(this.#url+path,{method,headers:{Authorization:'Basic '+Buffer.from('opencode:'+this.#password).toString('base64'),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(timeout),redirect:'error'});
    const data=r.status===204?undefined:await r.json();
    if(!r.ok)throw Object.assign(new Error(data?._tag??'ENGINE_REQUEST_FAILED'),{code:data?._tag,status:r.status,providerStatus:data?.error?.status});
    return data?.data ?? data;
  }
  async start() {
    this.state='STARTING';
    try {
      if(this.#url) {
        const url=new URL(this.#url);
        if(url.hostname!=='127.0.0.1'||url.protocol!=='http:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||!this.#password)throw Error('EXTERNAL_ENGINE_INVALID');
        this.#url=url.origin;
      } else {
        this.executable ??= await findOpenCode();
        this.version=this.versionOf(this.executable).trim().replace(/^opencode v/,'');
        if(!['2.0.24','2.0.28'].includes(this.version))throw Error('ENGINE_VERSION_UNVERIFIED');
        const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
        this.#password=randomBytes(32).toString('hex');this.#url=`http://127.0.0.1:${port}`;
        this.#child=this.launch(this.executable,['serve','--hostname','127.0.0.1','--port',String(port)],{cwd:this.root,env:{...process.env,OPENCODE_PASSWORD:this.#password},windowsHide:true,stdio:'ignore'});
        this.owned=true;this.#child.on('error',()=>{this.state='FAILED';});this.#child.on('exit',()=>{if(this.state!=='STOPPED')this.state='FAILED';});
      }
      let info;
      const deadline=Date.now()+20000;
      while(Date.now()<deadline){try{info=await this.api('/api/info',undefined,{timeout:750});break;}catch{if(this.state==='FAILED')break;await new Promise(r=>setTimeout(r,250));}}
      if(!info || !['2.0.24','2.0.28'].includes(info.version))throw Error('ENGINE_VERSION_UNVERIFIED');
      this.version=info.version;
      const location=await this.api('/api/location?location[directory]='+encodeURIComponent(this.root));
      if(resolve(location.directory).toLowerCase()!==resolve(this.root).toLowerCase())throw Error('ENGINE_PROJECT_MISMATCH');
      this.state=this.owned?'READY':'EXTERNAL';
    } catch(error) {await this.stop();this.state='FAILED';throw error;}
  }
  status(){let port=null;try{if(this.#url)port=Number(new URL(this.#url).port);}catch{}return {state:this.state,version:this.version??null,owned:this.owned,port};}
  location(path){return path+'?location[directory]='+encodeURIComponent(this.root);}
  catalog(path){return this.api(this.location('/api/'+path));}
  reload(){return this.api('/api/location/reload',{});}
  async createSession(model){return this.api('/api/session',{title:'Figma Designer workspace',agent:'figma-designer',location:{directory:this.root},...(model?{model}:{})});}
  session(id){return this.api('/api/session/'+encodeURIComponent(id));}
  switchModel(id,model){return this.api('/api/session/'+encodeURIComponent(id)+'/model',{model});}
  testModel(model){return this.api('/api/experimental/generate',{model,prompt:'Reply OK. This is a connection check.'});}
  connect(id,kind,body,attempt,complete=false){return this.api(this.location('/api/integration/'+encodeURIComponent(id)+'/connect/'+kind+(attempt?'/'+encodeURIComponent(attempt):'')+(complete?'/complete':'')),body);}
  context(id){return this.api(`/api/session/${encodeURIComponent(id)}/context`);}
  submit(id,mode,text){return this.api(`/api/session/${encodeURIComponent(id)}/${mode==='AUTO'?'prompt':'command'}`,mode==='AUTO'?{text}:{name:{DESIGN:'figma/design',QA:'figma/qa',BROWSER:'figma/browser',BROWSER_TEST:'figma/browser-test',STATUS:'figma/doctor'}[mode],text});}
  interrupt(id){return this.api(`/api/session/${encodeURIComponent(id)}/interrupt?resume=false`,{});}
  sanitize(text){return this.#password?String(text).replaceAll(this.#password,'[redacted]'):String(text);}
  async stop(){this.state='STOPPED';if(this.owned&&this.#child?.pid){const child=this.#child;this.#child=undefined;if(child.exitCode===null&&child.signalCode===null){if(process.platform==='win32'){await promisify(execFile)('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true}).catch(()=>{});}else{child.kill('SIGTERM');}}this.owned=false;}this.#password=undefined;}
}

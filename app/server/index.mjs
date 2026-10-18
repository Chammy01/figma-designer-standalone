import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,realpath,stat} from 'node:fs/promises';
import {join,resolve,extname,basename} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {OpenCodeClient} from './opencode-client.mjs';
import {Runs,safeError} from './runs.mjs';
import {lookupCurrentOperation} from './operation-recovery.mjs';
import {systemStatus,previewStatus} from './status.mjs';
import {AI} from './ai.mjs';
import {readQATool} from '../../scripts/figma-interaction-qa.mjs';
import {documentFingerprint} from '../../rules/figma-interaction-qa.mjs';
import {Validation} from './validation.mjs';
import {safePath,isWithinRoot} from '../../scripts/figma-browser-contract.mjs';
import {recoveryStore} from './recovery-store.mjs';

export const projectRoot=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json'};
const studioAssets=new Set(['room/bedroom-base.png',...['idle','listening','planning','designing','prototyping','checking','waiting','recovering','done','alert'].map(n=>'character/'+n+'.png'),...['ready','inspecting','planning','designing','prototyping','checking','previewing','recovering','done','attention'].map(n=>'monitor/'+n+'.png')].map(p=>'/assets/agent-studio/'+p));
function localServer(handler){return createServer((req,res)=>{const authority=`127.0.0.1:${req.socket.localPort}`;res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');if(req.headers.host!==authority || req.headers.origin && req.headers.origin!==`http://${authority}` || req.headers['sec-fetch-site']==='cross-site'){json(res,{error:{title:'Access denied',message:'Use this application from its local address.'}},403);return;}Promise.resolve(handler(req,res)).catch(()=>{if(!res.headersSent)res.writeHead(500);res.end();});});}
async function listen(server,port=0){await new Promise((r,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',r);});return `http://127.0.0.1:${server.address().port}`;}
async function body(req){if(req.headers.origin!==`http://${req.headers.host}` || req.headers['content-type']?.split(';')[0]!=='application/json')throw Object.assign(Error('Same-origin JSON required'),{status:403});const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>40000)throw Object.assign(Error('Request too large'),{status:413});chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Object.assign(Error('Invalid JSON'),{status:400});}}
function json(res,value,status=200){res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));}

export async function createApplication({root=projectRoot,engine=new OpenCodeClient({root,executable:process.env.OPENCODE_EXECUTABLE,url:process.env.FIGMA_APP_OPENCODE_URL,password:process.env.FIGMA_APP_OPENCODE_PASSWORD}),status=()=>systemStatus(root),browser=()=>previewStatus(root),fingerprint=async()=>root===projectRoot?documentFingerprint(await readQATool('get_document')).sha256:null,validation=new Validation(root,root===projectRoot?{}:{read:async()=>{throw Error('Fixture source unavailable');}}),port=0,recoveryFile,onPreview=()=>{},onExternalSetup=()=>{}}={}) {
  const events=[];let logChain=Promise.resolve(),closed=false;
  const log=event=>{events.push({...event,time:new Date().toISOString()});if(events.length>100)events.shift();logChain=logChain.then(async()=>{await mkdir(join(root,'.figma-designer/app'),{recursive:true});await writeFile(join(root,'.figma-designer/app/events.json'),JSON.stringify(events));}).catch(()=>{});};
  const store=recoveryStore(recoveryFile??join(root,'.figma-designer/app/recovery.json'));
  const runs=new Runs(engine,log,fingerprint,(run,context)=>validation.capture(run,context),id=>root===projectRoot?lookupCurrentOperation(id):null,store?.save),ai=new AI(engine,runs,root);runs.ai=ai;await store?.restore(runs);let cachedStatus,lastCheck=0,statusPending,preview;
  async function check(force=false){if(force || !cachedStatus || Date.now()-lastCheck>3000){statusPending??=status().then(s=>{cachedStatus=s;lastCheck=Date.now();return s;}).finally(()=>statusPending=undefined);await statusPending;}return cachedStatus;}
  async function previewUrl(){
    const state=await browser();if(state.state==='NOT_BUILT')throw Object.assign(Error('Browser preview has not been built'),{status:404});
    if(preview)return preview.url;
    const base=await realpath(join(root,'.figma-designer/browser-prototype'));
    if(!isWithinRoot(await realpath(root),base))throw Object.assign(Error('Preview escaped the project'),{status:403});
    const server=localServer(async(req,res)=>{
      if(req.method!=='GET'){res.writeHead(405);res.end();return;}
      try{const path=safePath(base,req.url);if(!path)throw Error();const file=await realpath(path);if(!isWithinRoot(base,file)||!(await stat(file)).isFile()||!mime[extname(file)]||extname(file)==='.json')throw Error();res.writeHead(200,{'Content-Type':mime[extname(file)],'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'"});res.end(await readFile(file));}catch{res.writeHead(404);res.end();}
    });
    preview={server,url:await listen(server)};onPreview(preview.url);return preview.url;
  }
  const server=localServer(async(req,res)=>{
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'self'");
    try{
      const path=new URL(req.url,'http://127.0.0.1').pathname;
      if(req.method==='GET'){
        if(path==='/api/app/status'){await runs.reconcile();const force=new URL(req.url,'http://127.0.0.1').searchParams.has('refresh');if(['READY','EXTERNAL'].includes(engine.status().state))await ai.refresh(force).catch(()=>{});json(res,{...(await check(force)),engine:{...engine.status(),availability:ai.status().state},ai:ai.status(),activeRun:runs.active?.id??null,sessionId:runs.session?.id??null,workspaceId:runs.workspaceId,reconciliationRequired:!!runs.uncertain,features:{statefulVariables:'HOLD'},errors:events.filter(e=>e.code).slice(-5)});return;}
        if(path==='/api/ai/status'||path==='/api/ai/models'||path==='/api/ai/providers'){const value=await ai.refresh();json(res,path.endsWith('/models')?value.models:path.endsWith('/providers')?value.integrations:value);return;}
        if(path==='/api/figma/status'){json(res,await check());return;}
        if(path==='/api/opencode/status'){json(res,engine.status());return;}
        if(path==='/api/project'){json(res,{name:basename(root),version:'1.5.0-source'});return;}
        if(path==='/api/runs'){json(res,runs.runs);return;}
        if(path==='/api/browser/status'){json(res,await browser());return;}
        if(path==='/api/validation'){json(res,await validation.get());return;}
        if(path==='/api/browser/preview'){json(res,{url:await previewUrl()});return;}
        if(/^\/api\/run\/[\w-]+$/.test(path)){const run=runs.runs.find(r=>r.id===path.split('/').at(-1));json(res,run??{error:'Run not found'},run?200:404);return;}
        const staticFiles={'/':'index.html','/app.js':'app.js','/validation.js':'validation.js','/styles.css':'styles.css','/agent-presence.js':'agent-presence.js','/agent-presence.css':'agent-presence.css','/agent-activity.mjs':'../shared/agent-activity.mjs'};
        if(studioAssets.has(path)){
          const base=await realpath(join(projectRoot,'app/web/assets')),file=await realpath(join(projectRoot,'app/web',path));
          if(!isWithinRoot(base,file)){res.writeHead(404);res.end();return;}
          res.writeHead(200,{'Content-Type':'image/png'});res.end(await readFile(file));return;
        }
        if(staticFiles[path]){res.writeHead(200,{'Content-Type':mime[extname(staticFiles[path])]});res.end(await readFile(join(projectRoot,'app/web',staticFiles[path])));return;}
      }
      if(req.method==='POST'){
        const value=await body(req);
        if(path==='/api/ai/model'){json(res,await ai.choose(value.model));return;}
        if(path==='/api/ai/check'){json(res,await ai.check());return;}
        if(path==='/api/ai/connect'){const result=await ai.connect(value);if(result.url)onExternalSetup(result.url);json(res,result);return;}
        if(path==='/api/session'){if(runs.active||runs.uncertain||ai.busy)throw Object.assign(Error('Wait for the active task or result check'),{status:409});if(!['READY','EXTERNAL'].includes(engine.status().state))throw Object.assign(Error('Engine is not ready'),{status:503});ai.assertReady();json(res,{id:(await runs.newWorkspace()).id});return;}
        if(path==='/api/run'){
          if(!['READY','EXTERNAL'].includes(engine.status().state))throw Object.assign(Error('Engine is not ready'),{status:503});
          if(['AUTO','DESIGN','QA','BROWSER','BROWSER_TEST'].includes(value.mode??'AUTO')){const health=await check();if(health.runtime!=='VERIFIED')throw Object.assign(Error('Runtime must be verified before a workflow'),{status:409,code:'RUNTIME_HASH_MISMATCH'});if(health.figma!=='CONNECTED')throw Object.assign(Error('Connect the Figma plugin first'),{status:409,code:health.figma});if(health.mcp&&health.mcp.state!=='COMPATIBLE')throw Object.assign(Error('Run the matching Figma Designer MCP plugin'),{status:409,code:'MCP_INCOMPATIBLE'});}
          json(res,await runs.submit({...value,mode:value.mode??'AUTO'}),202);return;
        }
        if(/^\/api\/run\/[\w-]+\/cancel$/.test(path)){json(res,await runs.cancel(path.split('/')[3]));return;}
        if(/^\/api\/run\/[\w-]+\/accept-current-state$/.test(path)){json(res,await runs.acceptCurrentState(path.split('/')[3],value.confirmation));return;}
        if(/^\/api\/run\/[\w-]+\/reconcile$/.test(path)){json(res,await runs.checkLatest(path.split('/')[3]));return;}
      }
      json(res,{error:{title:'Not available',message:'This application endpoint does not exist.'}},404);
    }catch(error){const status=error.status??500;json(res,{error:error.code?safeError(error):status<500?{code:'REQUEST_INVALID',title:'Request needs attention',message:error.message,recoverable:true}:safeError(error)},status);}
  });
  const url=await listen(server,port);
  const ready=engine.start().then(async()=>{await ai.initialize().catch(()=>{});log({event:'engine',state:engine.status().state});}).catch(error=>log({event:'engine',state:'FAILED',code:safeError(error).code}));
  async function close(){if(closed)return;closed=true;runs.closed=true;await ready;await engine.stop();await runs.workPending;for(const s of [server,preview?.server].filter(Boolean)){s.closeAllConnections();await new Promise(r=>s.close(r));}await logChain;}
  return {url,server,runs,ai,validation,ready,close};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const port=Number(process.env.FIGMA_APP_PORT??0);if(!Number.isInteger(port)||port<0||port>65535)throw Error('Invalid local application port');
  const app=await createApplication({port});console.log(`Figma Designer: ${app.url}`);
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await app.close();process.exit(0);});
}

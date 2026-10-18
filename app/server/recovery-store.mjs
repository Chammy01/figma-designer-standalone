import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {observeActivityRun} from './agent-activity.mjs';

const fields=['id','workspaceId','requestId','mode','startedAt','sessionId','offset','submissionStarted','beforeFingerprint','beforeGraphFingerprint','state','recovery','finishedAt','integrity'];
export function recoveryStore(file){
  let chain=Promise.resolve();
  return {
    save:run=>chain=chain.catch(()=>{}).then(async()=>{const value=Object.fromEntries(fields.filter(k=>run[k]!==undefined).map(k=>[k,run[k]]));await mkdir(dirname(file),{recursive:true});const temp=file+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify({version:1,run:value}));await rename(temp,file);}),
    async restore(runs){
      let value;try{const bytes=await readFile(file);if(bytes.length>16384)throw Error('Recovery record too large');value=JSON.parse(bytes);}catch(error){if(error.code==='ENOENT')return;throw Error('RECOVERY_METADATA_UNVERIFIED');}
      const r=value.run;
      if(value.version!==1||!r||!/^[-\w]{8,80}$/.test(r.id)||!['AUTO','DESIGN','QA','BROWSER','BROWSER_TEST','STATUS'].includes(r.mode)||!Number.isFinite(Date.parse(r.startedAt))||!['RUNNING','COMPLETED','FAILED','CANCELLED','WAITING_FOR_USER'].includes(r.state)||r.sessionId!==undefined&&!/^[-\w]{1,160}$/.test(r.sessionId)||r.offset!==undefined&&(!Number.isSafeInteger(r.offset)||r.offset<0))throw Error('RECOVERY_METADATA_UNVERIFIED');
      const run={...Object.fromEntries(fields.filter(k=>r[k]!==undefined).map(k=>[k,r[k]])),input:'',result:''};
      runs.runs.push(run);runs.workspaceId=run.workspaceId;
      if(run.sessionId)runs.session={id:run.sessionId};
      if(run.state==='RUNNING'||run.recovery==='RECONCILIATION_REQUIRED'){
        run.state='FAILED';run.recovery='RECONCILIATION_REQUIRED';run.error={code:'SESSION_INTERRUPTED',title:'Previous task needs checking',message:'The app closed before completion was verified. Check the current result before repeating it.',recoverable:true};runs.uncertain=true;
      }
      observeActivityRun(run,{restored:true});
    }
  };
}

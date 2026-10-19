import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {observeActivityRun} from './agent-activity.mjs';

import {sanitizeArtifactIntegrity} from '../shared/result-contract.mjs';
import {canonicalBrowserTestExecution} from '../../rules/browser-test-artifact-guard.mjs';

const fields=['id','workspaceId','requestId','mode','execution','workspaceSessionId','startedAt','sessionId','offset','submissionStarted','beforeFingerprint','beforeGraphFingerprint','state','recovery','finishedAt','integrity','artifactIntegrity','validation','error','manualResolution','acceptedWorkspaceId'];
const accepted='USER_ACCEPTED_CURRENT_STATE';
function record(run){
  const value=Object.fromEntries(fields.filter(k=>run[k]!==undefined).map(k=>[k,run[k]]));
  if(value.artifactIntegrity)value.artifactIntegrity=sanitizeArtifactIntegrity(run.artifactIntegrity);
  const isBrowserTest=value.execution===canonicalBrowserTestExecution||(run.validation?.kind==='BROWSER_TEST'&&typeof run.validation.status==='string');
  if(isBrowserTest){
    if(value.validation)value.validation={kind:run.validation.kind,status:run.validation.status,generatedAt:run.validation.generatedAt};
    if(value.error)value.error={code:run.error.code,title:run.error.title,message:run.error.message,recoverable:run.error.recoverable===true};
    else delete value.error;
  }else{delete value.validation;delete value.error;}
  if(value.manualResolution)value.manualResolution={type:run.manualResolution.type,at:run.manualResolution.at};
  return JSON.parse(JSON.stringify(value));
}
export function recoveryStore(file){
  let chain=Promise.resolve(),records=[];
  return {
    save(run){const value=record(run);return chain=chain.catch(()=>{}).then(async()=>{const next=records.filter(r=>r.id!==value.id).concat(value).slice(-50);await mkdir(dirname(file),{recursive:true});const temp=file+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify({version:2,runs:next}));await rename(temp,file);records=next;});},
    async restore(runs){
      let value;try{const bytes=await readFile(file);if(bytes.length>819200)throw Error('Recovery record too large');value=JSON.parse(bytes);}catch(error){if(error.code==='ENOENT')return;throw Error('RECOVERY_METADATA_UNVERIFIED');}
      const entries=value.version===1?[value.run]:value.version===2?value.runs:null;
      if(!Array.isArray(entries)||!entries.length||entries.length>50)throw Error('RECOVERY_METADATA_UNVERIFIED');
      const ids=new Set();
      for(const r of entries){
        if(!r||!/^[-\w]{8,80}$/.test(r.id)||ids.has(r.id)||!['AUTO','DESIGN','QA','BROWSER','BROWSER_TEST','STATUS'].includes(r.mode)||!Number.isFinite(Date.parse(r.startedAt))||!['RUNNING','COMPLETED','FAILED','CANCELLED','WAITING_FOR_USER'].includes(r.state)||r.sessionId!==undefined&&!/^[-\w]{1,160}$/.test(r.sessionId)||r.offset!==undefined&&(!Number.isSafeInteger(r.offset)||r.offset<0))throw Error('RECOVERY_METADATA_UNVERIFIED');
        if(r.workspaceSessionId!==undefined&&(r.execution!==canonicalBrowserTestExecution||!/^[-\w]{1,160}$/.test(r.workspaceSessionId)))throw Error('RECOVERY_METADATA_UNVERIFIED');
        if(r.recovery===accepted?(r.state!=='FAILED'||r.manualResolution?.type!==accepted||!Number.isFinite(Date.parse(r.manualResolution?.at))||!/^[-\w]{8,80}$/.test(r.acceptedWorkspaceId)):r.manualResolution!==undefined||r.acceptedWorkspaceId!==undefined)throw Error('RECOVERY_METADATA_UNVERIFIED');
        ids.add(r.id);
      }
      records=entries.map(record);
      for(const r of records){const run={...r,input:'',result:''};runs.runs.push(run);observeActivityRun(run,{restored:true});}
      const run=runs.runs.at(-1);runs.workspaceId=run.recovery===accepted?run.acceptedWorkspaceId:run.workspaceId;
      const sessionId=run.sessionId??(run.execution===canonicalBrowserTestExecution?run.workspaceSessionId:null);
      runs.session=run.recovery!==accepted&&sessionId?{id:sessionId}:null;
      if(run.state==='RUNNING'||run.recovery==='RECONCILIATION_REQUIRED'){
        if(run.mode==='BROWSER_TEST'&&run.execution===canonicalBrowserTestExecution){
          run.state='FAILED';run.recovery='RETRY_SAFE';
          run.artifactIntegrity={...sanitizeArtifactIntegrity(run.artifactIntegrity),status:'UNVERIFIED'};
          run.error??={code:'SESSION_INTERRUPTED',title:'Test was stopped',message:'The application closed before the browser test completed. Review the saved evidence before starting another test.',recoverable:true};
        }else{
          run.state='FAILED';run.recovery='RECONCILIATION_REQUIRED';run.error={code:'SESSION_INTERRUPTED',title:'Previous task needs checking',message:'The app closed before completion was verified. Check the current result before repeating it.',recoverable:true};runs.uncertain=true;
          if(run.artifactIntegrity)run.artifactIntegrity={...sanitizeArtifactIntegrity(run.artifactIntegrity),status:'UNVERIFIED'};
        }
      }
      observeActivityRun(run,{restored:true});
    }
  };
}

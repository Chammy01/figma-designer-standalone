import {fork} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {policyCodes,browserTestPaths,writeBrowserTestOutput} from '../rules/browser-test-artifact-guard.mjs';

const runner=fileURLToPath(new URL('./figma-browser-test.mjs',import.meta.url));
// finalize is trusted application policy, never a model/tool argument. The child retains
// its TEST lease until this callback and report persistence complete and it receives ACK.
export async function runCanonicalBrowserTest(root,{finalize=async report=>report}={}){
 const env={...process.env};
 for(const name of ['NODE_OPTIONS','NODE_PATH','NODE_V8_COVERAGE','NODE_REDIRECT_WARNINGS'])delete env[name];
 return new Promise((resolveRun,reject)=>{
  const child=fork(runner,[],{cwd:resolve(root),execArgv:[],env,windowsHide:true,stdio:['ignore','pipe','pipe','ipc']});
  let report,output='',failure;
  const append=chunk=>{output=(output+chunk.toString()).slice(-65536);};
  child.stdout.on('data',append);child.stderr.on('data',append);
  child.on('message',async message=>{
   if(!message?.browserTestReport)return;
   report=message.browserTestReport;
   try{
    if(message.leaseHeld){
     report=await finalize(report);
     // Persist final policy evidence before releasing the child's freeze boundary.
     await writeBrowserTestOutput(root,browserTestPaths(root).report,JSON.stringify(report,null,2)+'\n');
    }
    child.send({browserTestAck:true,result:{result:report.result,passed:report.passed,policyCode:report.policyCode}});
   }catch{
    failure=Object.assign(Error(policyCodes.unverified),{code:policyCodes.unverified});
    if(message.leaseHeld){
     report={...report,result:'FAIL',browserAcceptance:'FAIL',passed:false,policyCode:policyCodes.unverified,artifactIntegrity:{...report.artifactIntegrity,status:'UNVERIFIED'}};
     await writeBrowserTestOutput(root,browserTestPaths(root).report,JSON.stringify(report,null,2)+'\n').catch(()=>{});
    }
    if(child.connected)child.send({browserTestAck:true,error:true});
   }
  });
  child.once('error',reject);
  child.once('exit',(code,signal)=>{
   if(failure)return reject(failure);
   if(!report||signal||![0,1].includes(code))return reject(Object.assign(Error(policyCodes.unverified),{code:policyCodes.unverified}));
   if(report.artifactIntegrity?.status!=='UNCHANGED'&&report.result!=='FAIL')return reject(Object.assign(Error(policyCodes.unverified),{code:policyCodes.unverified}));
   resolveRun({report,output});
  });
 });
}

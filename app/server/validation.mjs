import {readFile,writeFile,mkdir,realpath,lstat,rename,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {isWithinRoot,validateManifest} from '../../scripts/figma-browser-contract.mjs';
import {browserStatus} from '../../scripts/figma-browser-status.mjs';
import {collectLiveSource} from '../../scripts/figma-live-source.mjs';
import {readQATool} from '../../scripts/figma-interaction-qa.mjs';
import {documentFingerprint} from '../../rules/figma-interaction-qa.mjs';
import {sha256} from '../../scripts/figma-browser-freshness.mjs';
import {resultContractVersion,validQA,qaView,browserView,fingerprint,sanitizeArtifactIntegrity} from '../shared/result-contract.mjs';
import {policyCodes} from '../../rules/browser-test-artifact-guard.mjs';
import {safeError} from './runs.mjs';

const maxBytes=8*1024*1024;
export class Validation {
  constructor(root,{read=readQATool,browser=browserStatus}={}){this.root=root;this.read=read;this.browser=browser;this.qaFile=join(root,'.figma-designer/app/qa-result.json');this.browserRoot=join(root,'.figma-designer/browser-prototype');}
  async json(file){
    try{
      const [base,actual,info]=await Promise.all([realpath(this.root),realpath(file),lstat(file)]);
      if(info.isSymbolicLink()||!isWithinRoot(base,actual)||!info.isFile()||info.size>maxBytes)return {state:'UNVERIFIED'};
      const bytes=await readFile(actual);if(bytes.length>maxBytes)return {state:'UNVERIFIED'};
      return {state:'AVAILABLE',data:JSON.parse(bytes.toString('utf8')),digest:sha256(bytes)};
    }catch(error){return {state:error.code==='ENOENT'?'UNAVAILABLE':'UNVERIFIED'};}
  }
  async capture(run,context){
    if(run.mode==='QA'){
      const records=context?.flatMap(m=>(m.content??[]).filter(t=>t.type==='tool'&&t.name==='figma_qa_report'&&t.state?.status==='completed').map(t=>t.state.metadata?.qaResult))??[];
      const result=records.at(-1);
      const fp=sha256=>fingerprint({algorithm:'canonical-json-sha256-v1',sha256});
      const record=validQA(result)?{...result,wholeRunIntegrity:run.integrity?.state??'UNVERIFIED'}:run.integrity?.state==='CHANGED'?{contractVersion:resultContractVersion,producer:'application-qa-integrity',status:'FAIL',generatedAt:new Date().toISOString(),wholeRunIntegrity:'CHANGED',integrity:{status:'FAILED',before:{document:fp(run.integrity.beforeFingerprint)},after:{document:fp(run.integrity.afterFingerprint)}}}:null;
      if(!record)return;
      if(run.integrity?.state==='CHANGED')record.integrity={...record.integrity,status:'FAILED'};
      const safe=qaView(record); // Remove unknown fields and sanitize before persistence.
      const saved={...safe,status:record.status,producer:record.producer,sourceProjectionVersion:record.sourceProjectionVersion,wholeRunIntegrity:record.wholeRunIntegrity};
      const bytes=JSON.stringify(saved);if(Buffer.byteLength(bytes)>maxBytes)throw Error('QA_RESULT_TOO_LARGE');
      const dir=join(this.root,'.figma-designer/app');await mkdir(dir,{recursive:true});
      if(!isWithinRoot(await realpath(this.root),await realpath(dir)))throw Error('QA_RESULT_BOUNDARY');
      if((await lstat(this.qaFile).catch(()=>null))?.isSymbolicLink())throw Error('QA_RESULT_BOUNDARY');
      const temporary=join(dir,'qa-result-'+randomUUID()+'.tmp');
      try{await writeFile(temporary,bytes,{flag:'wx'});await rename(temporary,this.qaFile);}finally{await unlink(temporary).catch(()=>{});}
      run.validation={kind:'QA',status:saved.integrity.status==='FAILED'?'FAIL':saved.status,generatedAt:saved.generatedAt};
      return;
    }
    if(run.mode==='BROWSER_TEST')return;
    const toolReports=context?.flatMap(m=>(m.content??[])
      .filter(t=>t.type==='tool'&&t.name==='figma_browser_test_report'&&t.state?.status==='completed')
      .map(t=>t.state.metadata)
      .filter(r=>r&&typeof r==='object'&&typeof r.generatedAt==='string'))??[];
    const toolReport=toolReports.at(-1);
    if(!toolReport)return;
    const diskFile=await this.json(join(this.browserRoot,'figma-browser-test.json'));
    let effectiveReport;
    if(diskFile.state==='AVAILABLE'&&diskFile.data?.generatedAt===toolReport.generatedAt){
      effectiveReport=diskFile.data;
    }else{
      effectiveReport={...toolReport,artifactIntegrity:{...sanitizeArtifactIntegrity(toolReport.artifactIntegrity),status:'UNVERIFIED'}};
    }
    run.artifactIntegrity=sanitizeArtifactIntegrity(effectiveReport.artifactIntegrity);
    const blocked=effectiveReport.policyCode===policyCodes.blocked||run.artifactIntegrity.blockedWriteAttempts>0;
    const changed=run.artifactIntegrity.status==='CHANGED';
    const unverified=run.artifactIntegrity.status==='UNVERIFIED';
    if(blocked){
      run.state='FAILED';
      run.error=safeError(Object.assign(Error(policyCodes.blocked),{code:policyCodes.blocked}));
    }else if(changed){
      run.state='FAILED';
      run.error=safeError(Object.assign(Error(policyCodes.changed),{code:policyCodes.changed}));
    }else if(unverified){
      run.state='FAILED';
      run.error=safeError(Object.assign(Error(policyCodes.unverified),{code:policyCodes.unverified}));
    }
    const status=!blocked&&!changed&&!unverified&&['PASS','WARN','FAIL'].includes(effectiveReport.result)?effectiveReport.result:'FAIL';
    run.validation={kind:'BROWSER_TEST',status,generatedAt:effectiveReport.generatedAt};
    if(status==='FAIL'){
      run.result=(run.result||'').replace(/FIGMA_BROWSER_TEST:\s*(PASS|WARN)/g,'FIGMA_BROWSER_TEST: FAIL');
    }
  }
  async get(){
    this.pending??=this.load().finally(()=>this.pending=null);return this.pending;
  }
  async load(){
    const [qaFile,manifestFile,testFile]=await Promise.all([this.json(this.qaFile),this.json(join(this.browserRoot,'figma-browser.json')),this.json(join(this.browserRoot,'figma-browser-test.json'))]);
    let manifest=manifestFile.data,report=testFile.data,state;
    try{if(manifest)validateManifest(manifest);}catch{manifest=undefined;manifestFile.state='UNVERIFIED';}
    if([manifestFile,testFile].some(f=>f.state==='UNVERIFIED')){
      const live=await collectLiveSource(this.read);state={sourceFreshness:'UNVERIFIED',localFreshness:'UNVERIFIED',overallFreshness:'UNVERIFIED',liveSource:live};
    }else state=await this.browser(this.browserRoot,this.read).catch(()=>({}));
    const [manifestAfter,testAfter]=await Promise.all([this.json(join(this.browserRoot,'figma-browser.json')),this.json(join(this.browserRoot,'figma-browser-test.json'))]);
    if(manifestFile.digest!==manifestAfter.digest||testFile.digest!==testAfter.digest)state={...state,localFreshness:'UNVERIFIED',overallFreshness:state.sourceFreshness==='STALE'?'STALE':'UNVERIFIED'};
    let page,names={};
    try{page=await this.read('get_document');const visit=n=>{names[n.id]=n.name;for(const c of n.children??[])visit(c);};visit(page);}catch{}
    const live=state.liveSource;
    const qa=qaView(qaFile.data,{document:page?documentFingerprint(page):null,source:live?.status==='AVAILABLE'?live.sourceFingerprint:null,projectionVersion:live?.sourceProjectionVersion,names});
    if(qaFile.state==='UNVERIFIED'){qa.status='UNVERIFIED';qa.freshness='UNVERIFIED';qa.reason='Saved QA evidence could not be read safely.';}
    const views=browserView({manifest,report,state,names});
    if(manifestFile.state==='UNVERIFIED'){views.browser.buildState='UNVERIFIED';views.browser.freshness='UNVERIFIED';}
    if(testFile.state==='UNVERIFIED'){views.browser.acceptance='UNVERIFIED';views.browser.testFreshness='UNVERIFIED';}
    return {contractVersion:resultContractVersion,asOf:new Date().toISOString(),qa,...views,source:{status:live?.status??'UNAVAILABLE',fingerprint:live?.sourceFingerprint??null},evidence:{qa:qaFile.state,manifest:manifestFile.state,test:testFile.state},limitations:['Structural QA does not prove native playback.','Synthetic browser goldens do not certify this live design.','Exact native pixel parity is not certified.'],locateInFigma:'NOT_EXPOSED'};
  }
}

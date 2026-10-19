import {fidelityVersion} from '../../rules/figma-browser-fidelity.mjs';
import {browserMotionVersion} from '../../rules/figma-browser-motion.mjs';
import {runnerVersion,sanitizeArtifactIntegrity,redact,evidenceText} from '../../scripts/figma-browser-freshness.mjs';
export {sanitizeArtifactIntegrity,redact,evidenceText};

export const resultContractVersion='1.4.2';
export const freshnessStates=['CURRENT','STALE','UNAVAILABLE','UNVERIFIED'];
const statuses=['PASS','WARN','FAIL','UNVERIFIED','NOT_RUN'],severities=['BLOCKER','HIGH','MEDIUM','LOW','LIMITATION'];
const count=n=>Number.isSafeInteger(n)&&n>=0?n:null;
const status=s=>statuses.includes(s)?s:'UNVERIFIED';
const list=v=>Array.isArray(v)&&v.length<=5000?v:[];
export const fingerprint=f=>f?.algorithm==='canonical-json-sha256-v1'&&/^[a-f0-9]{64}$/.test(f.sha256)?{algorithm:f.algorithm,sha256:f.sha256}:null;
const same=(a,b)=>!!fingerprint(a)&&!!fingerprint(b)&&a.sha256===b.sha256;
const date=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))?s:null;
const nameFor=(names,id)=>typeof names?.[id]==='string'?evidenceText(names[id]):null;
const refs=(ids,names)=>list(ids).map(id=>({id:evidenceText(id),name:nameFor(names,id)}));
const maps={workingActions:'WORKING_ACTION',workingStates:'WORKING_STATE',brokenControls:'BROKEN',unknown:'UNKNOWN_EXPECTATION',limitedControls:'FIGMA_LIMITED',intentionallyInert:'INTENTIONALLY_INERT'};

// Projection only: counts, severity, order and wording come from the existing collector.
export function qaEvidence(result,generatedAt=new Date().toISOString()){
  if(!['PASS','WARN','FAIL'].includes(result?.status)||result.summary?.QA_STATUS!==result.status||!Array.isArray(result.findings)||result.findings.length>5000||!result.coverage)throw Error('QA_RESULT_INVALID');
  const counts=Object.fromEntries(Object.entries(maps).map(([name,key])=>[name,count(result.coverage[key])]));
  Object.assign(counts,{brokenEdges:count(result.summary.BROKEN_EDGE_COUNT),unreachable:count(result.summary.UNREACHABLE_COUNT),limitations:count(result.summary.LIMITATION_COUNT)});
  if(Object.values(counts).some(v=>v===null))throw Error('QA_COUNTS_INVALID');
  const names=Object.fromEntries(list(result.controls).map(c=>[c.id,c.label]));
  const findings=result.findings.map(f=>{
    if(!severities.includes(f.severity)||!['BROKEN','FIGMA_LIMITED','UNKNOWN_EXPECTATION','WORKING_ACTION','WORKING_STATE','INTENTIONALLY_INERT'].includes(f.classification)||typeof f.id!=='string'||typeof f.problem!=='string'||!Array.isArray(f.affectedIds))throw Error('QA_FINDING_INVALID');
    return {id:evidenceText(f.id),code:evidenceText(f.code),severity:f.severity,classification:f.classification,problem:evidenceText(f.problem),impact:evidenceText(f.why),expected:evidenceText(f.expected),actual:evidenceText(f.actual),workflow:evidenceText(f.recommendedWorkflow),grade:evidenceText(f.evidence?.grade),nodes:refs(f.affectedIds,names)};
  });
  const fps=result.integrity?.fingerprints,part=v=>({document:fingerprint(v?.document),source:fingerprint(v?.graph)});
  return {contractVersion:resultContractVersion,producer:'interaction-qa-v2',generatedAt:date(generatedAt),status:result.status,counts,findings,sourceProjectionVersion:result.collection?.sourceProjectionVersion??null,integrity:{status:result.integrity?.unchanged===false||result.integrity?.writeCalls>0?'FAILED':result.integrity?.unchanged===true&&result.integrity?.writeCalls===0?'VERIFIED_UNCHANGED':'UNVERIFIED',before:part(fps?.before),after:part(fps?.after),readCalls:count(result.integrity?.readCalls),writeCalls:count(result.integrity?.writeCalls)},evidenceMode:evidenceText(result.evidenceMode)};
}

export function validQA(record){
  return record?.contractVersion===resultContractVersion&&record.producer==='interaction-qa-v2'&&['PASS','WARN','FAIL'].includes(record.status)&&date(record.generatedAt)&&record.counts&&Object.keys({...maps,brokenEdges:0,unreachable:0,limitations:0}).every(k=>count(record.counts[k])!==null)&&Array.isArray(record.findings)&&record.findings.length<=5000&&record.findings.every(f=>f&&typeof f.id==='string'&&typeof f.problem==='string'&&severities.includes(f.severity)&&Array.isArray(f.nodes)&&f.nodes.length<=5000&&f.nodes.every(n=>n&&typeof n.id==='string'))&&['FAILED','VERIFIED_UNCHANGED','UNVERIFIED'].includes(record.integrity?.status);
}

export function qaView(record,{document,source,projectionVersion,names={}}={}){
  if(record?.contractVersion===resultContractVersion&&record.producer==='application-qa-integrity'&&record.wholeRunIntegrity==='CHANGED')return {contractVersion:resultContractVersion,status:'FAIL',freshness:'UNVERIFIED',generatedAt:date(record.generatedAt),reason:'The QA run changed the document. No trusted collector result is available.',counts:{},findings:[],integrity:{status:'FAILED',before:{document:fingerprint(record.integrity?.before?.document),source:null},after:{document:fingerprint(record.integrity?.after?.document),source:null}}};
  if(!validQA(record))return {status:'NOT_RUN',freshness:record?'UNVERIFIED':'UNAVAILABLE',reason:record?'Saved QA evidence is incompatible or incomplete.':'No structured QA result is available.',counts:{},findings:[],integrity:{status:'UNVERIFIED'}};
  // Re-project persisted data; unknown keys in a local file never become API fields.
  const r={contractVersion:resultContractVersion,generatedAt:record.generatedAt,lastStatus:record.status,counts:Object.fromEntries(Object.keys({...maps,brokenEdges:0,unreachable:0,limitations:0}).map(k=>[k,record.counts[k]])),findings:record.findings.map(f=>({id:evidenceText(f.id),code:evidenceText(f.code),severity:f.severity,classification:evidenceText(f.classification),problem:evidenceText(f.problem),impact:evidenceText(f.impact),expected:evidenceText(f.expected),actual:evidenceText(f.actual),workflow:evidenceText(f.workflow),grade:evidenceText(f.grade),nodes:f.nodes.map(n=>({id:evidenceText(n.id),name:evidenceText(n.name)}))})),integrity:{status:record.integrity.status,before:{document:fingerprint(record.integrity.before?.document),source:fingerprint(record.integrity.before?.source)},after:{document:fingerprint(record.integrity.after?.document),source:fingerprint(record.integrity.after?.source)},readCalls:count(record.integrity.readCalls),writeCalls:count(record.integrity.writeCalls)},evidenceMode:evidenceText(record.evidenceMode)};
  const before=r.integrity.before,after=r.integrity.after;
  if(record.wholeRunIntegrity==='CHANGED'||before.document&&after.document&&!same(before.document,after.document)||before.source&&after.source&&!same(before.source,after.source)||r.integrity.writeCalls>0)r.integrity.status='FAILED';
  if(r.integrity.status!=='FAILED'&&(!before.document||!before.source||!after.document||!after.source||r.integrity.writeCalls!==0))r.integrity.status='UNVERIFIED';
  const bound=after.document&&after.source&&document&&source&&record.sourceProjectionVersion==='figma-browser-source-v1'&&projectionVersion===record.sourceProjectionVersion;
  r.freshness=!bound?'UNVERIFIED':same(after.document,document)&&same(after.source,source)?'CURRENT':'STALE';
  if(r.integrity.status!=='VERIFIED_UNCHANGED'&&r.freshness==='CURRENT')r.freshness='UNVERIFIED';
  r.status=r.integrity.status==='FAILED'?'FAIL':r.freshness==='CURRENT'?r.lastStatus:r.freshness;
  r.reason=r.integrity.status==='FAILED'?'The QA integrity check failed. This result is not trusted.':r.freshness==='STALE'?'Source changed since this QA run.':r.freshness==='UNVERIFIED'?'Current page/source evidence could not be verified.':null;
  if(r.freshness==='CURRENT')for(const f of r.findings)for(const n of f.nodes)n.name??=nameFor(names,n.id);
  return r;
}

export function browserView({manifest,report,state,names={}}={}){
  const built=manifest?.version===2,tested=report?.version===2&&report.runnerVersion===runnerVersion&&Array.isArray(report.tests)&&report.tests.length<=5000&&report.tests.every(t=>t&&typeof t.name==='string'&&typeof t.passed==='boolean'&&typeof t.skipped==='boolean');
  const bound=built&&same(manifest.sourceFingerprint,report?.sourceFingerprint)&&same(manifest.sourceFingerprint,state?.liveSource?.sourceFingerprint)&&state?.liveSource?.status==='AVAILABLE'&&manifest.exportRunId&&manifest.exportRunId===report?.exportRunId&&state.exportRunId===manifest.exportRunId;
  const freshness=!built?'UNAVAILABLE':state?.overallFreshness==='STALE'?'STALE':tested&&bound&&state?.overallFreshness==='CURRENT'?'CURRENT':'UNVERIFIED';
  const testFreshness=tested?state?.overallFreshness==='STALE'?'STALE':bound&&state?.overallFreshness==='CURRENT'?'CURRENT':'UNVERIFIED':report?'UNVERIFIED':'UNAVAILABLE';
  const browser={buildState:built?'BUILT':manifest?'UNVERIFIED':'NOT_BUILT',freshness,generatedAt:date(manifest?.generatedAt),sourceFingerprint:fingerprint(manifest?.sourceFingerprint),testFreshness,acceptance:testFreshness==='CURRENT'?status(report.result):tested?testFreshness:report?'UNVERIFIED':'NOT_RUN',lastAcceptance:tested?status(report.result):null,testedAt:date(report?.generatedAt),sourceFreshness:state?.sourceFreshness??'UNVERIFIED',localFreshness:state?.localFreshness??'UNVERIFIED',checks:tested?list(report.tests).map(t=>({name:evidenceText(t.name),status:t.skipped?'NOT_RUN':t.passed?'PASS':'FAIL',detail:evidenceText(t.detail)})):[]};
  browser.artifactIntegrity=sanitizeArtifactIntegrity(tested?report.artifactIntegrity:null);
  if(tested){
    if(report?.artifactIntegrity){
      if(browser.artifactIntegrity.status!=='UNCHANGED'||browser.artifactIntegrity.blockedWriteAttempts>0){
        browser.acceptance='FAIL';browser.lastAcceptance='FAIL';
      }
    }else{
      if(browser.acceptance==='PASS'||browser.acceptance==='WARN'){
        browser.acceptance='UNVERIFIED';
      }
    }
  }
  const motionOK=tested&&manifest?.motion?.contractVersion===browserMotionVersion&&report.motion?.contractVersion===browserMotionVersion&&Array.isArray(report.motion.results)&&report.motion.results.length<=5000&&report.motion.results.every(r=>r&&typeof r.passed==='boolean'&&typeof r.token==='string'&&typeof r.mode==='string');
  const motion={status:!motionOK||!report.motion.results.length?'UNVERIFIED':testFreshness!=='CURRENT'?testFreshness:report.motion.results.every(r=>r.passed===true)?'PASS':'FAIL',freshness:testFreshness,contractVersion:motionOK?browserMotionVersion:null,rows:motionOK?list(report.motion.results).map(r=>({token:evidenceText(r.token),mode:evidenceText(r.mode),parity:evidenceText(r.parity),status:typeof r.passed!=='boolean'?'UNVERIFIED':r.passed?'PASS':'FAIL'})):[]};
  const f=tested&&report.fidelity?.contractVersion===fidelityVersion&&Array.isArray(report.fidelity.findings)&&report.fidelity.findings.length<=5000&&report.fidelity.findings.every(x=>x&&severities.includes(x.severity)&&typeof x.code==='string'&&typeof x.nodeId==='string'&&typeof x.screenId==='string')?report.fidelity:null;
  const fidelity={freshness:testFreshness,sourceFidelity:f?status(f.SOURCE_FIDELITY):'UNVERIFIED',browserVisualRegression:f?status(f.BROWSER_VISUAL_REGRESSION):'UNVERIFIED',nativeRenderParity:f?status(f.NATIVE_RENDER_PARITY):'UNVERIFIED',pixelRegression:f?status(f.PIXEL_REGRESSION):'UNVERIFIED',figmaPixelParity:f?status(f.FIGMA_PIXEL_PARITY):'UNVERIFIED',coverage:Object.fromEntries(['SCREENS_VALIDATED','NODES_COMPARED','TEXT_NODES_COMPARED','CONTROLS_COMPARED','UNSUPPORTED_PROPERTIES','FONT_LIMITATIONS'].map(k=>[k,count(f?.coverage?.[k])])),findings:list(f?.findings).filter(x=>severities.includes(x.severity)&&typeof x.code==='string').map((x,i)=>({id:'F'+String(i+1).padStart(2,'0'),code:evidenceText(x.code),severity:x.severity,node:{id:evidenceText(x.nodeId),name:testFreshness==='CURRENT'?nameFor(names,x.nodeId):null},screen:{id:evidenceText(x.screenId),name:evidenceText(manifest?.screens?.find(s=>s.id===x.screenId)?.name)},expected:evidenceText(x.expected),actual:evidenceText(x.actual)})),fonts:list(f?.fonts).filter(x=>x&&typeof x==='object').map(x=>({nodeId:evidenceText(x.nodeId),source:evidenceText(x.source?.family),browser:list(x.browser).map(evidenceText),status:['AVAILABLE_LOCAL','FALLBACK_USED','UNKNOWN'].includes(x.status)?x.status:'UNKNOWN'}))};
  return {browser,motion,fidelity};
}

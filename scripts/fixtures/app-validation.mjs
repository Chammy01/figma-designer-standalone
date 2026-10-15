import {flowFixture} from './interaction-qa.mjs';
import {analyzeInteractions,documentFingerprint} from '../../rules/figma-interaction-qa.mjs';
import {fidelityFixture} from './browser-fidelity.mjs';
import {fidelityModel,analyzeFidelity} from '../../rules/figma-browser-fidelity.mjs';
import {sourceFingerprint,sourceProjectionVersion,fingerprintAlgorithm,runnerVersion} from '../figma-browser-freshness.mjs';
import {qaEvidence,qaView,browserView,resultContractVersion} from '../../app/shared/result-contract.mjs';

export function validationFixture(kind='PASS'){
  const flow=flowFixture(),model=flow.model;
  if(kind==='WARN')model.scope.startIds=[];
  if(kind==='LIMITATION')flow.control.reactions[0].actions.push({type:'SET_VARIABLE',variableId:'synthetic-unverified-state'});
  if(kind==='FAIL')flow.control.reactions[0].actions[0].destinationId='missing';
  if(kind==='UNKNOWN'){flow.control.reactions=[];model.scope.controls=[];}
  const node=n=>({id:n.id,name:n.name,type:n.type,bounds:n.geometry,styles:n.props,children:n.children.map(id=>node(flow.find(id)))}),page=node(flow.find('0:1'));
  const source=sourceFingerprint({synthetic:'validation-fixture'}),document=documentFingerprint(page);
  model.fingerprints={before:{document,graph:source},after:{document,graph:source}};
  if(kind==='INTEGRITY')model.fingerprints.after.document=sourceFingerprint({synthetic:'changed'});
  const result=analyzeInteractions(model);result.collection={sourceProjectionVersion,readCalls:6,writeCalls:0};
  const qa=qaEvidence(result,'2026-10-15T00:00:00.000Z');
  const manifest={version:2,systemVersion:'1.2.1',generatedAt:'2026-10-15T00:00:00.000Z',exportRunId:'synthetic-export',sourceProjectionVersion,fingerprintAlgorithm,sourceFingerprint:source,sourceExportState:'STABLE',runtimeSectionId:'1:1',runtimeSectionName:'Figma Designer — Interactive App',sourceRuntimeId:'1:1',sourceRuntimeName:'Figma Designer — Interactive App',startScreenId:'3:1',screens:[{id:'3:1',name:'Start',route:'#/screen/3:1'},{id:'3:2',name:'Success',route:'#/screen/3:2'}],controls:[],interactions:[]};
  const f=fidelityFixture(),fm=fidelityModel(f.projection,f.manifest),measurements=[{id:'screen',nodes:fm.screens[0].nodes.map(n=>({...structuredClone(n),count:1,visible:true,fonts:['Arial']}))}];
  if(kind==='FONT')measurements[0].nodes.find(n=>n.type==='TEXT').fonts=['Courier New'];
  if(kind==='FIDELITY_WARN')measurements[0].nodes[1].bounds.x+=2;
  if(kind==='FIDELITY_FAIL')measurements[0].nodes[1].bounds.x+=20;
  if(kind==='COMPLEX')fm.screens[0].nodes[2].complex=true;
  const fidelity=analyzeFidelity(fm,measurements);
  const report={version:2,runnerVersion,systemVersion:'1.2.1',result:fidelity.SOURCE_FIDELITY==='FAIL'?'FAIL':'PASS',generatedAt:'2026-10-15T00:01:00.000Z',sourceProjectionVersion,sourceFingerprint:source,exportRunId:manifest.exportRunId,motion:{contractVersion:null,results:[],totals:{}},fidelity,tests:[{name:'Routing',passed:true,skipped:false,detail:'Existing route fixture'}]};
  const state={exportRunId:manifest.exportRunId,sourceFreshness:'CURRENT',localFreshness:'CURRENT',overallFreshness:'CURRENT',liveSource:{status:'AVAILABLE',sourceFingerprint:source,sourceProjectionVersion}};
  const names=Object.fromEntries(model.nodes.map(n=>[n.id,n.name]));
  return {page,source,document,result,qa,manifest,report,state,names,view:()=>({contractVersion:resultContractVersion,asOf:'2026-10-15T00:02:00.000Z',qa:qaView(qa,{document,source,projectionVersion:sourceProjectionVersion,names}),...browserView({manifest,report,state,names}),source:{status:'AVAILABLE',fingerprint:source},evidence:{qa:'AVAILABLE',manifest:'AVAILABLE',test:'AVAILABLE'},locateInFigma:'NOT_EXPOSED'})};
}

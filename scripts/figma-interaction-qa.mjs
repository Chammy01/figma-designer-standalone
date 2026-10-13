import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {qaReadTools,buildQAModel,analyzeInteractions,documentFingerprint,formatQAReport} from '../rules/figma-interaction-qa.mjs';
import {evidenceForProjection,normalizeSource} from './figma-live-source.mjs';
import {sourceFingerprint} from './figma-browser-freshness.mjs';

export async function readQATool(tool,nodeIds=[],params={}){
  if(!qaReadTools.includes(tool))throw Error('QA permits only approved reads');
  const response=await fetch('http://127.0.0.1:1994/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tool,nodeIds,params}),signal:AbortSignal.timeout(35000)});
  const result=await response.json();if(!response.ok||result.error)throw Error(result.error??`QA read HTTP ${response.status}`);return result.data;
}

export async function collectInteractionQA({scope={},read=readQATool}={}){
  const trace=[];
  async function inspect(tool,nodeIds=[],params={}){if(!qaReadTools.includes(tool))throw Error('QA permits only approved reads');const call={tool,nodeIds,params,status:'pending'};trace.push(call);try{const data=await read(tool,nodeIds,params);call.status='completed';return data;}catch(e){call.status='error';call.error=e.message;throw e;}}
  const health=await inspect('health_check');if(!health?.ok)throw Error('QA requires a healthy connected plugin');
  const metadata=await inspect('get_metadata'),pageId=metadata?.currentPageId;if(!pageId)throw Error('QA current page is unavailable');
  function flatten(n){return [n,...(n.children??[]).flatMap(flatten)];}
  async function capture(){
    const document=await inspect('get_document');if(document.id!==pageId)throw Error('QA page changed during read');
    let projection,projectionError;
    try{projection=(await inspect('get_node',[pageId],{browserSource:true})).projection;evidenceForProjection(projection);}catch(e){projection=undefined;projectionError=e.message;}
    let reactions={},instances={},registry=[],complete=true;
    if(!projection){
      // A bad reaction destination can abort source closure; raw reads still expose the defect.
      const all=flatten(document),roots=all.filter(n=>['Figma Designer — Interactive App','Figma Designer — Component States','Figma Designer — Prototype Flows'].includes(n.name));
      const targets=[...new Map(roots.flatMap(flatten).filter(n=>!['SECTION','PAGE'].includes(n.type)).map(n=>[n.id,n])).values()];
      for(let i=0;i<targets.length;i+=8)await Promise.all(targets.slice(i,i+8).map(async n=>{try{reactions[n.id]=(await inspect('get_reactions',[n.id])).reactions;}catch(e){if(/does not support reactions/.test(e.message))reactions[n.id]=[];else complete=false;}}));
      try{const components=await inspect('get_local_components');registry=components.components??components;
        const context=await inspect('get_design_context',[],{depth:100,detail:'full',dedupeComponents:true});
        const visit=value=>{if(!value||typeof value!=='object')return;if(value.type==='INSTANCE'&&value.mainComponentId)instances[value.id]={mainComponentId:value.mainComponentId,componentSetId:registry.find(c=>c.id===value.mainComponentId)?.componentSetId??null};for(const v of Object.values(value))if(v&&typeof v==='object')visit(v);};visit(context);
      }catch{complete=false;}
    }
    const model=buildQAModel({document,projection,scope,reactions,instances,registry,complete});
    const graphHash=projection?evidenceForProjection(projection).sourceFingerprint:sourceFingerprint(normalizeSource({reactions,instances,registry}));
    return {document,projection,projectionError,model,fingerprint:{document:documentFingerprint(document),graph:graphHash},complete};
  }
  const before=await capture(),after=await capture();
  const model={...after.model,complete:before.complete&&after.complete,fingerprints:{before:before.fingerprint,after:after.fingerprint},trace};
  const result=analyzeInteractions(model);
  return {...result,collection:{health,sourceProjectionVersion:after.projection?.sourceProjectionVersion??null,projectionError:after.projectionError??null,readCalls:trace.length,writeCalls:0,trace}};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    const args=process.argv.slice(2),scopeIndex=args.indexOf('--scope');
    if(args.some((a,i)=>a!=='--json'&&a!=='--scope'&&!(scopeIndex>=0&&i===scopeIndex+1))||scopeIndex>=0&&(!args[scopeIndex+1]||args[scopeIndex+1].startsWith('--')))throw Error('Use --scope <evidence.json> and/or --json');
    const scope=scopeIndex>=0?JSON.parse(await readFile(args[scopeIndex+1],'utf8')):{};
    const result=await collectInteractionQA({scope});console.log(args.includes('--json')?JSON.stringify(result,null,2):formatQAReport(result));
    if(result.status==='FAIL')process.exitCode=1;
  }catch(error){console.error(`FIGMA_INTERFACE_QA: FAIL\nEvidence unavailable: ${error.message}\nNo repair attempted.`);process.exitCode=1;}
}

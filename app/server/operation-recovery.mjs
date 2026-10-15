import {isCritiqueReadTool} from '../../.opencode/plugins/figma-critique-guard.js';
import {qaReportTool} from '../../rules/figma-qa-guard.mjs';
import {readQATool} from '../../scripts/figma-interaction-qa.mjs';

const validId=id=>typeof id==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{15,79}$/.test(id);
export async function lookupCurrentOperation(operationId,read=readQATool){
  if(!validId(operationId))throw Error('INVALID_OPERATION_ID');
  const receipt=await read('get_operation_receipt',[],{operationId});
  if(receipt?.state==='UNKNOWN')return receipt;
  const health=await read('health_check'),document=health?.handshake?.plugin?.document;
  if(!document?.id||receipt?.documentId!==document.id||receipt?.pageId!==document.pageId)return {operationId,state:'UNKNOWN'};
  return receipt;
}
// Only inspect actual tool events. Prose/model claims never certify a receipt.
export async function operationRecovery(context,lookup,startedAt){
  if(!Number.isFinite(Date.parse(startedAt)))return null;
  const calls=context.flatMap(m=>m.content??[]).filter(c=>c.type==='tool'&&c.executed!==false&&!isCritiqueReadTool(c.name)&&c.name!==qaReportTool);
  if(!calls.length)return null;
  const receipts=[];let complete=calls.length<=64&&context.every(m=>['user','assistant','idle','error'].includes(m.type)&&(!m.content||m.content.every(c=>['text','reasoning','tool'].includes(c.type))));
  for(const call of calls.slice(0,64)){
    const ids=new Set(),name=String(call.name??'').replace(/^figma_/,'');
    if(validId(call.state?.input?.operationId))ids.add(call.state.input.operationId);
    let visited=0;
    function inspect(value,depth=0){
      if(depth>7||visited++>512||!value)return;
      if(typeof value==='string'){
        if(value.length>100000)return;
        for(const match of value.matchAll(/operationId=([A-Za-z0-9_-]{16,80})\b/g))ids.add(match[1]);
        try{inspect(JSON.parse(value),depth+1);}catch{}
      }else if(typeof value==='object'){
        if(value.operation&&validId(value.operation.operationId))ids.add(value.operation.operationId);
        for(const v of Object.values(value))inspect(v,depth+1);
      }
    }
    inspect(call.state?.content);inspect(call.state?.metadata);
    if(ids.size!==1){complete=false;continue;}
    const operationId=[...ids][0];
    try{
      const r=await lookup(operationId);
      if(r?.operationId===operationId&&r.state==='UNKNOWN'){receipts.push({state:'UNKNOWN'});continue;}
      if(r?.operationId!==operationId||r.tool!==name||Date.parse(r.startedAt)<Date.parse(startedAt)||!Number.isFinite(Date.parse(r.startedAt))){complete=false;continue;}
      receipts.push(r);
    }catch{complete=false;}
  }
  if(!receipts.length)return null;
  const counts=Object.fromEntries(['COMMITTED','FAILED_BEFORE_WRITE','FAILED_PRECONDITION','FAILED_AFTER_PARTIAL_WRITE','IN_PROGRESS','UNKNOWN','FAILED'].map(s=>[s,receipts.filter(r=>r.state===s).length]));
  // Opaque Code Mode/local tools cannot be proved covered by one embedded receipt.
  if(!complete||receipts.length!==calls.length)return {source:'OPERATION_RECEIPTS',counts,complete:false,pending:!!(counts.IN_PROGRESS||counts.UNKNOWN)};
  if(counts.IN_PROGRESS||counts.UNKNOWN||counts.FAILED||Object.values(counts).reduce((a,b)=>a+b,0)!==receipts.length)return {source:'OPERATION_RECEIPTS',counts,complete:true,pending:true};
  return {source:'OPERATION_RECEIPTS',counts,complete:true,recovery:counts.COMMITTED||counts.FAILED_AFTER_PARTIAL_WRITE?'CONTINUE_FROM_CURRENT_STATE':'RETRY_SAFE'};
}

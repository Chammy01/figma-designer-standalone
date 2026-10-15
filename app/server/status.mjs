import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {readQATool} from '../../scripts/figma-interaction-qa.mjs';
import {browserStatus} from '../../scripts/figma-browser-status.mjs';

export async function systemStatus(root,read=readQATool) {
  let runtime='VERIFIED';
  let expectedVersion,expectedProtocol;
  try{const approved=JSON.parse(await readFile(join(root,'docs/APPROVED_RUNTIME.json'),'utf8'));
    expectedVersion=approved.mcpVersion;expectedProtocol=approved.mcpBridgeProtocolVersion;
    for(const path of ['bin/figma-designer-mcp.exe','vendor/figma-mcp/plugin/dist/code.js','vendor/figma-mcp/plugin/dist/index.html'])if(createHash('sha256').update(await readFile(join(root,path))).digest('hex')!==approved.sha256[path])runtime='HASH_MISMATCH';
  }catch(error){runtime=error.code==='ENOENT'?'MISSING':'UNKNOWN';}
  let figma='UNKNOWN';
  try{const m=await read('get_metadata');figma=m?.currentPageId?'CONNECTED':'DOCUMENT_UNAVAILABLE';}
  catch(error){figma=/plugin not connected/i.test(error.message)?'PLUGIN_NOT_CONNECTED':'BRIDGE_UNAVAILABLE';}
  let mcp={state:'UNKNOWN',serverVersion:null,pluginVersion:null,protocolVersion:null};
  if(figma==='CONNECTED')try{
    const h=(await read('health_check'))?.handshake;
    const version=v=>typeof v==='string'&&v.length<=32&&/^\d+\.\d+\.\d+$/.test(v)?v:null;
    const state=['COMPATIBLE','PLUGIN_TOO_OLD','SERVER_TOO_OLD','PROTOCOL_MISMATCH','PLUGIN_VERSION_MISMATCH','CAPABILITY_MISSING','UNKNOWN'].includes(h?.compatibility?.state)?h.compatibility.state:'UNKNOWN';
    mcp={state,serverVersion:version(h?.server?.version),pluginVersion:version(h?.plugin?.version),protocolVersion:Number.isInteger(h?.plugin?.protocolVersion)?h.plugin.protocolVersion:null};
    if(mcp.state==='COMPATIBLE'&&expectedVersion&&(mcp.serverVersion!==expectedVersion||mcp.pluginVersion!==expectedVersion))mcp.state='PLUGIN_VERSION_MISMATCH';
    if(mcp.state==='COMPATIBLE'&&Number.isInteger(expectedProtocol)&&(mcp.protocolVersion!==expectedProtocol||h?.server?.protocolVersion!==expectedProtocol))mcp.state='PROTOCOL_MISMATCH';
  }catch{}
  return {runtime,figma,mcp,connection:{bridge:['CONNECTED','DOCUMENT_UNAVAILABLE','PLUGIN_NOT_CONNECTED'].includes(figma)?'HEALTHY':figma==='BRIDGE_UNAVAILABLE'?'UNAVAILABLE':'UNKNOWN',plugin:figma==='CONNECTED'||figma==='DOCUMENT_UNAVAILABLE'?'CONNECTED':figma==='PLUGIN_NOT_CONNECTED'?'NOT_CONNECTED':'UNKNOWN',document:figma==='CONNECTED'?'READABLE':'UNAVAILABLE'}};
}
export async function previewStatus(root,read){
  const value=await browserStatus(join(root,'.figma-designer/browser-prototype'),read);
  let fidelity={SOURCE_FIDELITY:'NOT_RUN'};
  try{const report=JSON.parse(await readFile(join(root,'.figma-designer/browser-prototype/figma-browser-test.json'),'utf8'));if(value.localFreshness==='CURRENT')fidelity={SOURCE_FIDELITY:report.fidelity?.SOURCE_FIDELITY??'UNVERIFIED',coverage:report.fidelity?.coverage??{}};}catch{}
  return {state:!value.manifestPresent?'NOT_BUILT':value.overallFreshness,acceptance:value.browserAcceptance,fidelity};
}

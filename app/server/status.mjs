import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {readSourceRPC} from '../../scripts/figma-live-source.mjs';
import {browserStatus} from '../../scripts/figma-browser-status.mjs';

export async function systemStatus(root,read=readSourceRPC) {
  let runtime='VERIFIED';
  try{const approved=JSON.parse(await readFile(join(root,'docs/APPROVED_RUNTIME.json'),'utf8'));
    for(const path of ['bin/figma-mcp-go.exe','vendor/figma-mcp/plugin/dist/code.js','vendor/figma-mcp/plugin/dist/index.html'])if(createHash('sha256').update(await readFile(join(root,path))).digest('hex')!==approved.sha256[path])runtime='HASH_MISMATCH';
  }catch(error){runtime=error.code==='ENOENT'?'MISSING':'UNKNOWN';}
  let figma='UNKNOWN';
  try{const m=await read('get_metadata');figma=m?.currentPageId?'CONNECTED':'DOCUMENT_UNAVAILABLE';}
  catch(error){figma=/plugin not connected/i.test(error.message)?'PLUGIN_NOT_CONNECTED':'BRIDGE_UNAVAILABLE';}
  return {runtime,figma};
}
export async function previewStatus(root){
  const value=await browserStatus(join(root,'.figma-designer/browser-prototype'));
  let fidelity={SOURCE_FIDELITY:'NOT_RUN'};
  try{const report=JSON.parse(await readFile(join(root,'.figma-designer/browser-prototype/figma-browser-test.json'),'utf8'));if(value.localFreshness==='CURRENT')fidelity={SOURCE_FIDELITY:report.fidelity?.SOURCE_FIDELITY??'UNVERIFIED',coverage:report.fidelity?.coverage??{}};}catch{}
  return {state:!value.manifestPresent?'NOT_BUILT':value.overallFreshness,acceptance:value.browserAcceptance,fidelity};
}

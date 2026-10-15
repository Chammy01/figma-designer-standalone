import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { randomUUID } from 'node:crypto';

// Exercise the real packaged dispatcher when verifying a staged release.
export async function pluginDispatch(request: any, sourceHandler: (request: any) => Promise<any>) {
  if (!process.env.FIGMA_PLUGIN_BUNDLE) return sourceHandler(request);
  const figma = (globalThis as any).figma;
  const responses: any[] = [];
  let target = request.nodeIds?.[0] ? await figma.getNodeByIdAsync?.(request.nodeIds[0]) : null;
  while(target?.parent)target=target.parent;
  figma.currentPage ??= target?.type==='PAGE'?target:{id:'0:1',type:'PAGE',name:'Mock page',selection:[],children:[]};
  figma.root ??= {id:'0:0',type:'DOCUMENT', name: 'Mock document',children:[figma.currentPage] };
  figma.fileKey ??= 'disposable-bundle-test';
  const storage=new Map();
  figma.clientStorage ??= {getAsync:async(k:string)=>storage.get(k),setAsync:async(k:string,v:any)=>storage.set(k,structuredClone(v))};
  figma.currentPage.selection ??= [];
  figma.ui = { postMessage: (response: any) => responses.push(response) };
  figma.showUI = () => {};
  figma.on = () => {};
  runInNewContext(readFileSync(process.env.FIGMA_PLUGIN_BUNDLE, 'utf8'), { figma, __html__: '', console, setTimeout, clearTimeout });
  await figma.ui.onmessage({ type: 'server-request', payload: {...request,protocolVersion:2,params:{...request.params,operationId:randomUUID()}} });
  const response = responses.findLast(r => r.type === request.type);
  if (response?.error) throw new Error(response.error);
  return response;
}

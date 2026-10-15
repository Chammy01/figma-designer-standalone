import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Exercise the real packaged dispatcher when verifying a staged release.
export async function pluginDispatch(request: any, sourceHandler: (request: any) => Promise<any>) {
  if (!process.env.FIGMA_PLUGIN_BUNDLE) return sourceHandler(request);
  const figma = (globalThis as any).figma;
  const responses: any[] = [];
  figma.root ??= { name: 'Mock document' };
  figma.currentPage ??= { name: 'Mock page', selection: [] };
  figma.currentPage.selection ??= [];
  figma.ui = { postMessage: (response: any) => responses.push(response) };
  figma.showUI = () => {};
  figma.on = () => {};
  runInNewContext(readFileSync(process.env.FIGMA_PLUGIN_BUNDLE, 'utf8'), { figma, __html__: '', console, setTimeout, clearTimeout });
  await figma.ui.onmessage({ type: 'server-request', payload: request });
  const response = responses.findLast(r => r.type === request.type);
  if (response?.error) throw new Error(response.error);
  return response;
}

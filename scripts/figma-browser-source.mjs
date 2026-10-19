import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectLiveSource, bindExportSource } from './figma-live-source.mjs';
import {artifactDirectory,acquireBrowserBuildWrite,authorizeArtifactOperation,normalizeArtifactPath,writeBrowserBuildOutput} from '../rules/browser-test-artifact-guard.mjs';

const workspaceFor=root=>{
  const workspace=resolve(root,'../..');
  const path=relative(workspace,resolve(root)).replaceAll('\\','/');
  if((process.platform==='win32'?path.toLowerCase():path)!==artifactDirectory)throw Error('BROWSER_BUILD_ARTIFACT_ROOT_INVALID');
  return workspace;
};

export async function beginExport(root, read) {
  const lease=await acquireBrowserBuildWrite(workspaceFor(root));
  try {
  await authorizeArtifactOperation(workspaceFor(root),{workflow:'BROWSER_BUILD',operation:'write',path:join(root,'figma-source.json')});
  const source = await collectLiveSource(read);
  if (source.status !== 'AVAILABLE') return source;
  const snapshot = { ...source, exportRunId: randomUUID() };
  await writeBrowserBuildOutput(workspaceFor(root),join(root,'figma-source.json'),JSON.stringify(snapshot,null,2)+'\n');
  return snapshot;
  } finally {await lease.release();}
}

export async function finishExport(root, read) {
  const lease=await acquireBrowserBuildWrite(workspaceFor(root));
  try {
  await normalizeArtifactPath(workspaceFor(root),join(root,'figma-source.json'));
  await authorizeArtifactOperation(workspaceFor(root),{workflow:'BROWSER_BUILD',operation:'write',path:join(root,'figma-browser.json')});
  const before = JSON.parse(await readFile(join(root, 'figma-source.json'), 'utf8'));
  const manifestPath = join(root, 'figma-browser.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.version !== 2) throw new Error('Source binding requires schema 2; legacy exports are preserved');
  const after = await collectLiveSource(read);
  const bound = bindExportSource(manifest, before, after);
  await writeBrowserBuildOutput(workspaceFor(root),manifestPath,JSON.stringify(bound,null,2)+'\n');
  return bound;
  } finally {await lease.release();}
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const operation = process.argv[2];
  const root = resolve('.figma-designer/browser-prototype');
  if (!['read', 'begin', 'finish'].includes(operation)) throw new Error('Use read, begin, or finish');
  const result = operation === 'read' ? await collectLiveSource() : operation === 'begin' ? await beginExport(root) : await finishExport(root);
  console.log(JSON.stringify(result, null, 2));
  if (result.status === 'UNVERIFIED' || (operation === 'finish' && result.sourceExportState !== 'STABLE')) process.exitCode = 1;
}

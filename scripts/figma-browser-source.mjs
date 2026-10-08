import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectLiveSource, bindExportSource } from './figma-live-source.mjs';

export async function beginExport(root, read) {
  const source = await collectLiveSource(read);
  if (source.status !== 'AVAILABLE') return source;
  const snapshot = { ...source, exportRunId: randomUUID() };
  await mkdir(root, { recursive: true });
  await writeFile(join(root, 'figma-source.json'), JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
  return snapshot;
}

export async function finishExport(root, read) {
  const before = JSON.parse(await readFile(join(root, 'figma-source.json'), 'utf8'));
  const manifestPath = join(root, 'figma-browser.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.version !== 2) throw new Error('Source binding requires schema 2; legacy exports are preserved');
  const after = await collectLiveSource(read);
  const bound = bindExportSource(manifest, before, after);
  await writeFile(manifestPath, JSON.stringify(bound, null, 2) + '\n', 'utf8');
  return bound;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const operation = process.argv[2];
  const root = resolve('.figma-designer/browser-prototype');
  if (!['read', 'begin', 'finish'].includes(operation)) throw new Error('Use read, begin, or finish');
  const result = operation === 'read' ? await collectLiveSource() : operation === 'begin' ? await beginExport(root) : await finishExport(root);
  console.log(JSON.stringify(result, null, 2));
  if (result.status === 'UNVERIFIED' || (operation === 'finish' && result.sourceExportState !== 'STABLE')) process.exitCode = 1;
}

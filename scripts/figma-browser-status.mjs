import { readFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { artifactHashes, classifyFreshness } from './figma-browser-freshness.mjs';
import { collectLiveSource } from './figma-live-source.mjs';

async function optionalJSON(file) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return undefined; throw error; }
}
async function present(file) {
  try { await stat(file); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

export async function browserStatus(root, read) {
  const live = await collectLiveSource(read);
  const systemVersion = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version;
  let manifest, report, hashes = {}, localError, manifestPresent = false, reportPresent = false;
  try {
    manifestPresent = await present(join(root, 'figma-browser.json'));
    reportPresent = await present(join(root, 'figma-browser-test.json'));
    manifest = await optionalJSON(join(root, 'figma-browser.json'));
    report = await optionalJSON(join(root, 'figma-browser-test.json'));
    hashes = await artifactHashes(root);
  } catch (error) { localError = error.message; }
  const freshness = classifyFreshness(manifest ?? {}, report, hashes, live, systemVersion);
  if (localError) { freshness.local = 'UNVERIFIED'; freshness.overall = freshness.source === 'STALE' ? 'STALE' : 'UNVERIFIED'; }
  return { figmaConnection: live.figmaConnection, runtimeSourceFingerprintAvailable: live.status === 'AVAILABLE',
    manifestPresent, reportPresent, manifestSchema: manifest?.version ?? null,
    schema: manifest?.version === 2 ? 'CURRENT' : manifest ? 'LEGACY' : 'MISSING', exportRunId: manifest?.exportRunId ?? null,
    ...freshness, browserAcceptance: freshness.validationResult, localFreshness: freshness.local, sourceFreshness: freshness.source, overallFreshness: freshness.overall,
    reason: localError || (freshness.source === 'STALE' ? manifest.sourceEvidenceReason || 'Figma changed after export' : freshness.source === 'UNVERIFIED' ? live.reason || 'Missing or incompatible export source evidence' : null),
    liveSource: { status: live.status, reason: live.reason ?? null, sourceFingerprint: live.sourceFingerprint ?? null, sourceProjectionVersion: live.sourceProjectionVersion, sourceRuntimeId: live.sourceRuntimeId ?? null, metrics: live.metrics } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv[2]) throw new Error('Status now collects live source automatically; saved snapshots cannot substitute for live evidence');
  console.log(JSON.stringify(await browserStatus(resolve('.figma-designer/browser-prototype')), null, 2));
}

import { createHash } from 'node:crypto';
import { readdir, readFile, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { isWithinRoot } from './figma-browser-contract.mjs';

export const fingerprintAlgorithm = 'canonical-json-sha256-v1';
export const runnerVersion = '1.2.1';
export const sourceProjectionVersion = 'figma-browser-source-v1';
export const sha256 = value => createHash('sha256').update(value).digest('hex');

function canonical(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && Object.getPrototypeOf(value) === Object.prototype) return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  throw new Error('Fingerprints require finite JSON values.');
}

export function sourceFingerprint(snapshot) {
  return { algorithm: fingerprintAlgorithm, sha256: sha256(canonical(snapshot)) };
}

export function validateFingerprint(value) {
  if (value !== undefined && (!value || value.algorithm !== fingerprintAlgorithm || !/^[a-f0-9]{64}$/.test(value.sha256))) throw new Error('Invalid sourceFingerprint algorithm or SHA-256.');
}

export async function artifactHashes(root) {
  const realRoot = await realpath(root);
  const hashes = {};
  async function walk(dir, prefix = '') {
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const name = prefix + entry.name;
      if (name === 'figma-browser-test.json') continue;
      const file = join(dir, entry.name);
      if (entry.isSymbolicLink() || !isWithinRoot(realRoot, await realpath(file))) throw new Error(`Artifact links are unsupported: ${name}`);
      if (entry.isDirectory()) await walk(file, `${name}/`);
      else if (entry.isFile()) hashes[name] = sha256(await readFile(file));
    }
  }
  await walk(root);
  return hashes;
}

export function classifySource(manifest, live) {
  const valid = f => f?.algorithm === fingerprintAlgorithm && /^[a-f0-9]{64}$/.test(f.sha256);
  if (manifest.version !== 2 || manifest.sourceProjectionVersion !== sourceProjectionVersion || live?.sourceProjectionVersion !== sourceProjectionVersion || !valid(manifest.sourceFingerprint) || !valid(live.sourceFingerprint) || live.status !== 'AVAILABLE' || manifest.fingerprintAlgorithm !== fingerprintAlgorithm || live.fingerprintAlgorithm !== fingerprintAlgorithm || !live.sourceRuntimeId || live.sourceRuntimeName !== 'Figma Designer — Interactive App' || manifest.sourceRuntimeId !== manifest.runtimeSectionId || manifest.sourceRuntimeName !== 'Figma Designer — Interactive App') return 'UNVERIFIED';
  if (manifest.sourceExportState === 'STALE') return 'STALE';
  if (manifest.sourceExportState !== 'STABLE') return 'UNVERIFIED';
  if (manifest.sourceFingerprint.sha256 !== live.sourceFingerprint.sha256) return 'STALE';
  return manifest.sourceRuntimeId === live.sourceRuntimeId ? 'CURRENT' : 'UNVERIFIED';
}

export function classifyFreshness(manifest, report, hashes, live, systemVersion = '1.2.1') {
  const same = (a, b) => canonical(a) === canonical(b);
  let local = 'UNVERIFIED';
  if (report?.artifactSha256 && report.runnerVersion) {
    local = same(report.artifactSha256, hashes) && report.manifestSha256 === hashes['figma-browser.json'] && report.runnerVersion === runnerVersion && report.systemVersion === systemVersion && same(report.sourceFingerprint ?? null, manifest.sourceFingerprint ?? null) && (report.exportRunId ?? null) === (manifest.exportRunId ?? null) && (report.sourceProjectionVersion ?? null) === (manifest.sourceProjectionVersion ?? null) ? 'CURRENT' : 'STALE';
  }
  const source = classifySource(manifest, live);
  const validationResult = report?.result ?? (report?.version === 1 && typeof report.passed === 'boolean' ? report.passed ? 'LEGACY_PASS' : 'LEGACY_FAIL' : 'UNVERIFIED');
  return { local, source, overall: local === 'STALE' || source === 'STALE' ? 'STALE' : local === 'CURRENT' && source === 'CURRENT' ? 'CURRENT' : 'UNVERIFIED', validationResult };
}

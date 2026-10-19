import { createHash } from 'node:crypto';
import { readdir, readFile, realpath } from 'node:fs/promises';
import { join } from 'node:path';
import { isWithinRoot } from './figma-browser-contract.mjs';
import { artifactDirectory, requiredArtifacts, createBlockedEvidence, recordBlockedAttempt } from '../rules/browser-test-artifact-guard.mjs';

export const fingerprintAlgorithm = 'canonical-json-sha256-v1';
export const runnerVersion = '1.3.2';
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

const count = n => Number.isSafeInteger(n) && n >= 0 ? n : null;
const date = s => typeof s === 'string' && Number.isFinite(Date.parse(s)) ? s : null;

export function redact(text) {
  let value = String(text);
  for (const [key, secret] of Object.entries(process.env)) if (/TOKEN|SECRET|PASSWORD|API_KEY/i.test(key) && secret?.length >= 8) value = value.replaceAll(secret, '[redacted]');
  return value.replace(/\b(?:sk-[\w-]{12,}|gh[pousr]_[\w]{15,}|github_pat_[\w]{15,})\b/g, '[redacted]').replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9+/=._-]{8,}/gi, '[redacted]');
}

export const evidenceText = v => v === undefined || v === null ? null : redact(typeof v === 'string' ? v : JSON.stringify(v)).replace(/([?&](?:api[_-]?key|token|access_token|refresh_token|client_secret|password)=)[^&#\s"<>]+/gi, '$1[redacted]').replace(/(?:(?<![A-Za-z])[A-Za-z]:[\\/]|file:\/\/|\/(?:Users|home|tmp)\/)[^\r\n"<>]*/g, '[local path]').slice(0, 2400);

export function sanitizeArtifactIntegrity(ai) {
  if (!ai || typeof ai !== 'object') ai = {};
  let status = ['UNCHANGED', 'CHANGED', 'UNVERIFIED'].includes(ai.status) ? ai.status : 'UNVERIFIED';
  const protectedFileCount = count(ai.protectedFileCount) ?? 0;
  const changedRows = Array.isArray(ai.changedFiles) ? ai.changedFiles : [];
  const blockedRows = Array.isArray(ai.blockedWriteEvidence) ? ai.blockedWriteEvidence : [];
  const changedFileCount = count(ai.changedFileCount) ?? Math.min(changedRows.length, 64);
  const blockedWriteAttempts = Math.max(count(ai.blockedWriteAttempts) ?? 0, Math.min(blockedRows.length, 32));
  const inconsistent = ai.changedFileCount !== undefined && count(ai.changedFileCount) === null ||
    ai.changedFileCount !== undefined && Math.min(ai.changedFileCount, 64) !== Math.min(changedRows.length, 64) ||
    count(ai.blockedWriteAttempts) === null || blockedRows.length > 32 || changedRows.length > 64 ||
    (count(ai.blockedWriteAttempts) ?? 0) < blockedRows.length;
  if (inconsistent || status === 'UNCHANGED' && (protectedFileCount < requiredArtifacts.length || changedFileCount > 0 || changedRows.length > 0)) status = 'UNVERIFIED';
  const safeRelative = value => typeof value === 'string' && value.startsWith(artifactDirectory + '/') && !/[\\:\0]/.test(value) && !value.split('/').some(p => p === '..' || p === '.') ? evidenceText(value) : null;
  const safeHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value) ? value : null;
  const changedFiles = Array.isArray(ai.changedFiles) ? ai.changedFiles.slice(0, 64).map(f => ({
    relativePath: safeRelative(f?.relativePath),
    before: f?.before ? { size: count(f.before.size) ?? 0, sha256: safeHash(f.before.sha256) } : null,
    after: f?.after ? { size: count(f.after.size) ?? 0, sha256: safeHash(f.after.sha256) } : null
  })) : [];
  const blockedWriteEvidence = Array.isArray(ai.blockedWriteEvidence) ? ai.blockedWriteEvidence.slice(0, 32).map(e => {
    const safe = createBlockedEvidence(), row = recordBlockedAttempt(safe, { category: e?.category, relativePath: e?.relativePath, operationClass: e?.operationClass });
    row.timestamp = typeof e?.timestamp === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(e.timestamp) && date(e.timestamp) ? e.timestamp : null;
    return row;
  }) : [];
  return { status, protectedFileCount, changedFileCount, changedFiles, blockedWriteAttempts, blockedWriteEvidence };
}

export function resolveBrowserAcceptance(report, overallFreshness = 'CURRENT', rawResult = report?.result) {
  const raw = rawResult ?? (report?.version === 1 && typeof report?.passed === 'boolean' ? report.passed ? 'LEGACY_PASS' : 'LEGACY_FAIL' : 'UNVERIFIED');
  if (!report || typeof report !== 'object') return 'UNVERIFIED';
  if (report.artifactIntegrity) {
    const ai = sanitizeArtifactIntegrity(report.artifactIntegrity);
    if (ai.status !== 'UNCHANGED' || ai.blockedWriteAttempts > 0) {
      return 'FAIL';
    }
    return raw;
  }
  if (overallFreshness === 'CURRENT') {
    return raw === 'PASS' || raw === 'WARN' || raw === 'LEGACY_PASS' ? 'UNVERIFIED' : raw;
  }
  return raw;
}

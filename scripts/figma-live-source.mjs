import { performance } from 'node:perf_hooks';
import { fingerprintAlgorithm, sourceProjectionVersion, sourceFingerprint } from './figma-browser-freshness.mjs';

const pixels = new Set('x y width height rotation fontSize strokeWeight strokeTopWeight strokeRightWeight strokeBottomWeight strokeLeftWeight cornerRadius cornerSmoothing topLeftRadius topRightRadius bottomLeftRadius bottomRightRadius radius spread itemSpacing counterAxisSpacing paddingTop paddingRight paddingBottom paddingLeft minWidth maxWidth minHeight maxHeight paragraphIndent paragraphSpacing listSpacing'.split(' '));

export function normalizeSource(value, key = '') {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Source requires finite JSON numbers');
    const scale = pixels.has(key) ? 1000 : 1000000;
    const rounded = Math.round(value * scale) / scale || 0;
    if (!Number.isFinite(rounded)) throw new Error('Source number exceeds normalization range');
    return rounded;
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    if (key === 'relativeTransform') return value.map(row => row.map((v, i) => normalizeSource(v, i === 2 ? 'x' : '')));
    return value.map(v => normalizeSource(v, key));
  }
  if (value && Object.getPrototypeOf(value) === Object.prototype) return Object.fromEntries(Object.keys(value).sort().map(k => [k, normalizeSource(value[k], k === 'value' && ['PIXELS', 'PERCENT'].includes(value.unit ?? value.type) ? 'fontSize' : k)]));
  throw new Error('Source requires finite JSON values');
}

export function evidenceForProjection(raw) {
  if (raw?.sourceProjectionVersion !== sourceProjectionVersion || raw.runtime?.name !== 'Figma Designer — Interactive App' || raw.runtime?.type !== 'SECTION' || typeof raw.runtime.visible !== 'boolean' || !raw.runtime?.id || !Array.isArray(raw.runtime.children) || !raw.runtime.children.some(n => n.type === 'FRAME') || !raw.document?.pageId || !['dependencies', 'families', 'variables', 'collections'].every(k => Array.isArray(raw[k]))) throw new Error('Incomplete or incompatible source projection');
  function node(n, parentId) {
    if (!n?.id || !n.type || typeof n.name !== 'string' || n.parentId !== parentId || !n.geometry || !['x', 'y', 'width', 'height'].every(k => Number.isFinite(n.geometry[k])) || !n.props || typeof n.props.visible !== 'boolean' || !Number.isFinite(n.props.opacity) || !Array.isArray(n.reactions) || !Array.isArray(n.children)) throw new Error('Incomplete projected node');
    if (n.type === 'INSTANCE' && !n.component?.mainComponentId) throw new Error('Incomplete instance source');
    for (const child of n.children) node(child, n.id);
  }
  for (const child of raw.runtime.children) node(child, raw.runtime.id);
  for (const dependency of raw.dependencies) node(dependency, null);
  const projection = normalizeSource(raw);
  return { status: 'AVAILABLE', sourceProjectionVersion, fingerprintAlgorithm, sourceRuntimeId: projection.runtime.id, sourceRuntimeName: projection.runtime.name, sourceFingerprint: sourceFingerprint(projection) };
}

// Only these two existing read requests can leave this collector.
export async function readSourceRPC(tool, nodeIds = [], params = {}) {
  if (!['get_metadata', 'get_node'].includes(tool) || (tool === 'get_node' && params.browserSource !== true)) throw new Error('Collector permits only source reads');
  const response = await fetch('http://127.0.0.1:1994/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tool, nodeIds, params }), signal: AbortSignal.timeout(35000) });
  const result = await response.json();
  if (!response.ok || result.error) throw new Error(result.error || `Source read HTTP ${response.status}`);
  return result.data;
}

export async function collectLiveSource(read = readSourceRPC) {
  const start = performance.now();
  let connected = false;
  try {
    async function capture() {
      const metadata = await read('get_metadata');
      connected = true;
      if (!metadata?.currentPageId) throw new Error('Current page unavailable');
      const result = await read('get_node', [metadata.currentPageId], { browserSource: true });
      const hashStart = performance.now();
      const evidence = evidenceForProjection(result?.projection);
      return { ...evidence, projection: normalizeSource(result.projection), metrics: { ...result.metrics, fingerprintMs: performance.now() - hashStart, projectionBytes: Buffer.byteLength(JSON.stringify(normalizeSource(result.projection)), 'utf8') } };
    }
    const first = await capture(), second = await capture();
    if (first.sourceFingerprint.sha256 !== second.sourceFingerprint.sha256) throw new Error('SOURCE_CHANGED_DURING_READ');
    return { ...second, figmaConnection: 'CONNECTED', metrics: { ...second.metrics, collectionMs: performance.now() - start, stableReads: 2 } };
  } catch (error) {
    return { status: 'UNVERIFIED', figmaConnection: connected ? 'CONNECTED' : 'UNVERIFIED', reason: error.message, sourceProjectionVersion, metrics: { collectionMs: performance.now() - start } };
  }
}

export function bindExportSource(manifest, before, after) {
  const bound = { ...manifest, systemVersion: '1.2.1', exportRunId: before.exportRunId, sourceProjectionVersion, fingerprintAlgorithm };
  const unverified = reason => ({ ...bound, sourceFingerprint: undefined, sourceFingerprintBefore: undefined, sourceFingerprintAfter: undefined, sourceExportState: 'UNVERIFIED', sourceEvidenceReason: reason });
  if (before.status !== 'AVAILABLE' || after.status !== 'AVAILABLE') return unverified(before.reason || after.reason || 'LIVE_SOURCE_UNAVAILABLE');
  if (!before.exportRunId || manifest.exportRunId !== before.exportRunId) return unverified('EXPORT_RUN_ID_MISMATCH');
  const checked = evidenceForProjection(before.projection);
  if (checked.sourceFingerprint.sha256 !== before.sourceFingerprint?.sha256 || before.sourceProjectionVersion !== after.sourceProjectionVersion) return unverified('INCOMPATIBLE_EXPORT_SNAPSHOT');
  const screenIds = before.projection.runtime.children.filter(n => n.type === 'FRAME').map(n => n.id).sort();
  if (manifest.runtimeSectionId !== before.sourceRuntimeId || JSON.stringify(manifest.screens?.map(n => n.id).sort()) !== JSON.stringify(screenIds)) return unverified('MANIFEST_RUNTIME_MISMATCH');
  const stable = before.sourceFingerprint.sha256 === after.sourceFingerprint.sha256;
  return { ...bound, sourceRuntimeId: before.sourceRuntimeId, sourceRuntimeName: before.sourceRuntimeName, sourceFingerprint: before.sourceFingerprint, sourceFingerprintBefore: before.sourceFingerprint, sourceFingerprintAfter: after.sourceFingerprint, sourceExportState: stable ? 'STABLE' : 'STALE', sourceEvidenceReason: stable ? null : 'SOURCE_CHANGED_DURING_EXPORT' };
}

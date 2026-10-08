import { isAbsolute, join, relative, resolve, sep } from 'node:path';

export function isWithinRoot(root, file) {
  const rel = relative(root, file);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

export function safePath(root, urlPath) {
  try {
    const clean = decodeURIComponent((urlPath || '/').split('?')[0]).replace(/\\/g, '/');
    const file = resolve(join(root, clean === '/' ? 'index.html' : clean.replace(/^\/+/, '')));
    return isWithinRoot(root, file) ? file : null;
  } catch {
    return null;
  }
}

export function validateManifest(manifest, legacy = false) {
  const require = (ok, message) => { if (!ok) throw new Error(message); };
  const id = value => typeof value === 'string' && value.trim().length > 0;
  require(manifest && typeof manifest === 'object', 'Manifest must be an object.');
  const old = manifest.version === 1 || manifest.version === '1.0.0';
  require(manifest.version === 2 || (legacy && old), 'V1.1 requires manifest schema version 2. Regenerate with /figma/browser, or use --legacy for V1 navigation-only validation.');
  require(Array.isArray(manifest.screens) && manifest.screens.length > 0, 'Manifest contains no screens.');
  require(Array.isArray(manifest.interactions), 'Manifest interactions must be an array.');
  const screenIds = new Set();
  const routes = new Set();
  for (const screen of manifest.screens) {
    require(id(screen?.id) && !screenIds.has(screen.id), 'Screen IDs must be nonempty and unique.');
    screenIds.add(screen.id);
    const route = screen.route || `#/screen/${screen.id}`;
    require(!routes.has(route), 'Screen routes must be unique.');
    routes.add(route);
    if (!old) require(screen.route === `#/screen/${screen.id}`, `Screen ${screen.id} needs its canonical hash route.`);
  }
  require(screenIds.has(manifest.startScreenId), 'startScreenId must identify a manifest screen.');
  if (!old) {
    require(manifest.runtimeSectionName === 'Figma Designer — Interactive App' && id(manifest.runtimeSectionId), 'V1.1 requires the canonical Interactive App runtime name and ID.');
    require(Array.isArray(manifest.controls), 'V1.1 requires a controls array.');
  } else {
    require(manifest.controls === undefined || Array.isArray(manifest.controls), 'controls must be an array when present.');
  }
  const controlIds = new Set();
  const classifications = ['WORKING_ACTION', 'WORKING_STATE', 'FIGMA_LIMITED', 'INTENTIONALLY_INERT'];
  for (const control of manifest.controls || []) {
    require(id(control?.nodeId) && !controlIds.has(control.nodeId), 'Control node IDs must be nonempty and unique.');
    controlIds.add(control.nodeId);
    require(screenIds.has(control.screenId), `Control ${control.nodeId} has an unknown screenId.`);
    require(classifications.includes(control.classification), `Control ${control.nodeId} has an invalid classification.`);
  }
  const navEdges = new Set();
  for (const interaction of manifest.interactions) {
    require(interaction && typeof interaction === 'object', 'Interactions must be objects.');
    if (interaction.navigation !== 'NAVIGATE') continue;
    require(id(interaction.sourceId) && screenIds.has(interaction.destinationId), 'Every NAVIGATE needs a sourceId and a known destinationId.');
    if (!old) require(screenIds.has(interaction.sourceScreenId), 'Every V1.1 NAVIGATE needs a known sourceScreenId.');
    else if (interaction.sourceScreenId !== undefined) require(screenIds.has(interaction.sourceScreenId), 'NAVIGATE sourceScreenId is unknown.');
    const edge = JSON.stringify([interaction.sourceId, interaction.sourceScreenId, interaction.destinationId, interaction.trigger]);
    require(!navEdges.has(edge), 'Duplicate NAVIGATE interaction.');
    navEdges.add(edge);
    if (!old) require(manifest.controls.some(c => c.nodeId === interaction.sourceId && c.screenId === interaction.sourceScreenId && c.classification === 'WORKING_ACTION'), 'Every V1.1 NAVIGATE must match a WORKING_ACTION control.');
  }
  return old;
}

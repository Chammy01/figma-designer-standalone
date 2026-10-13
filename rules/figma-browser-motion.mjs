import { motionTokens, transitionMatches } from './figma-motion-semantics.mjs';
import { isDeepStrictEqual } from 'node:util';

export const browserMotionVersion = '1.3.1';
export const parityLevels = Object.freeze(['BEHAVIORAL_PARITY', 'TIMING_BOUNDED', 'PARTIAL', 'NOT_IMPLEMENTED', 'NATIVE_REFERENCE_UNVERIFIED', 'REDUCED_MOTION_OVERRIDE']);
export const browserMotionTokens = Object.freeze(Object.fromEntries([
  ...Object.entries(motionTokens).map(([name, token]) => [name, { durationMs: token.duration * 1000, easing: 'ease-out' }]),
  ['SCROLL_NATIVE', { durationMs: 0, easing: null }],
]));
for (const token of Object.values(browserMotionTokens)) Object.freeze(token);

// Read-only translation: evidence describes verified source relationships, never canvas positions.
export function browserMotion(action, evidence = {}) {
  const native = structuredClone(action?.transition ?? null);
  const descriptor = { semantic: null, token: null, native, kind: 'immediate', durationMs: 0, easing: null, parity: 'NOT_IMPLEMENTED', reducedMotion: 'REDUCED_MOTION_OVERRIDE' };
  const limited = reason => ({ ...descriptor, reason });
  if (['CLOSE','BACK'].includes(action?.type) && !action.transition) return { ...descriptor, parity:'BEHAVIORAL_PARITY', reason:'Existing immediate history/close behavior; no native transition field' };
  if (action?.type !== 'NODE' || evidence.destinationExists !== true) return limited('Missing existing NODE destination or unimplemented action');
  if (action.navigation !== 'SCROLL_TO' && !native) return limited('No captured transition; preserve immediate source behavior without inventing a token');
  let token, semantic, kind;
  switch (action.navigation) {
    case 'CHANGE_TO':
      if (!evidence.sourceSetId || evidence.sourceSetId !== evidence.destinationSetId) return limited('Verified same-family state relationship required');
      [token, semantic, kind] = ['STATE_FAST', 'STATE', 'state']; break;
    case 'NAVIGATE':
      if (native?.type === 'DISSOLVE') [token, semantic, kind] = ['NAV_DEFAULT', 'NAVIGATION', 'fade'];
      else if (motionTokens.NAV_SPATIAL.types.includes(native?.type) && ['LEFT', 'RIGHT', 'TOP', 'BOTTOM'].includes(native.direction)) [token, semantic, kind] = ['NAV_SPATIAL', 'SPATIAL_NAVIGATION', 'spatial'];
      else return limited('General Smart Animate/shared-element and experimental navigation are not implemented');
      break;
    case 'OVERLAY':
      [token, semantic, kind] = ['OVERLAY_DEFAULT', 'OVERLAY', 'overlay']; break;
    case 'SCROLL_TO':
      if (!Object.hasOwn(action,'transition')) return limited('Scroll transition was not captured; missing is not native/null evidence');
      if (evidence.scrollContext?.status !== 'PREPARED' || typeof evidence.scrollContext.containerId !== 'string') return limited('Verified native scrolling context required');
      if (native === null) [token, semantic, kind] = ['SCROLL_NATIVE', 'SCROLL', 'scroll-native'];
      else [token, semantic, kind] = ['SCROLL_SMOOTH', 'SCROLL_SMOOTH', 'scroll'];
      break;
    default: return limited('SWAP and other experimental behavior are not implemented');
  }
  const expected = token === 'SCROLL_NATIVE' ? null : { type: token === 'NAV_SPATIAL' ? native.type : motionTokens[token].type, duration: motionTokens[token]?.duration, easing: motionTokens[token]?.easing };
  if (native && (native.matchLayers === true || !transitionMatches(native, { ...expected, ...(token === 'NAV_SPATIAL' ? { direction: native.direction, matchLayers: false } : {}) }))) return limited('Noncanonical transition, matching layers or easing: preserve native evidence; no parity claim');
  let parity = 'BEHAVIORAL_PARITY';
  if (token === 'NAV_SPATIAL' && ['SLIDE_IN', 'SLIDE_OUT'].includes(native.type)) parity = 'PARTIAL';
  if (token === 'NAV_SPATIAL' && native.type !== 'PUSH' && native.direction !== 'LEFT') parity = 'NATIVE_REFERENCE_UNVERIFIED';
  if (token === 'OVERLAY_DEFAULT' && evidence.overlayPositionType !== 'CENTER') parity = 'PARTIAL';
  return { ...descriptor, semantic, token, kind, ...browserMotionTokens[token], parity, ...(native?.direction ? { direction: native.direction } : {}), ...(token.startsWith('SCROLL') ? { containerId: evidence.scrollContext.containerId } : {}), reason: parity === 'PARTIAL' ? 'Bounded movement/fade only; native dimming/contextual positioning may differ' : 'Behavioral mapping; native renderer and exact frame timing are not reproduced' };
}

export function browserMotionManifest(interactions) {
  return { contractVersion: browserMotionVersion, reducedMotion: 'prefers-reduced-motion', tokens: structuredClone(browserMotionTokens), parity: interactions.filter(i => i.motion).map(i => ({ sourceId: i.sourceId, token: i.motion.token, status: i.motion.parity })) };
}

export function validateBrowserMotion(manifest) {
  if (!manifest.motion?.contractVersion) return;
  const fail = message => { throw new Error(`Motion contract: ${message}`); };
  if (manifest.motion.contractVersion !== browserMotionVersion || manifest.motion.reducedMotion !== 'prefers-reduced-motion') fail('unknown version/reduced-motion policy');
  if (!isDeepStrictEqual(manifest.motion.tokens, browserMotionTokens)) fail('token registry differs');
  if (!isDeepStrictEqual(manifest.motion.parity, browserMotionManifest(manifest.interactions).parity)) fail('parity inventory differs');
  for (const i of manifest.interactions) {
    if (!i.nativeAction) fail('complete nativeAction required');
    const expected = browserMotion(i.nativeAction, i.motionEvidence);
    if (!isDeepStrictEqual(expected, i.motion)) fail(`descriptor differs for ${i.sourceId}`);
    const trigger = typeof i.trigger === 'object' ? i.trigger.type : i.trigger;
    if (expected.token && !(expected.kind === 'state' ? ['ON_HOVER','ON_PRESS'] : ['ON_CLICK']).includes(trigger)) fail('trigger is not implemented by this browser motion contract');
    if (i.navigation !== i.nativeAction.navigation || i.destinationId !== i.nativeAction.destinationId || (typeof i.action === 'string' && i.action !== i.nativeAction.type)) fail('action metadata differs from native source');
  }
}

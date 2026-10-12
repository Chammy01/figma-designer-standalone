import { isDeepStrictEqual } from 'node:util';

export const motionTokens = Object.freeze({
  STATE_FAST: { type: 'SMART_ANIMATE', duration: 0.10, easing: { type: 'EASE_OUT' }, tolerance: [0.095, 0.105] },
  NAV_DEFAULT: { type: 'DISSOLVE', duration: 0.15, easing: { type: 'EASE_OUT' }, tolerance: [0.145, 0.155] },
  NAV_SPATIAL: { types: ['PUSH', 'MOVE_IN', 'MOVE_OUT', 'SLIDE_IN', 'SLIDE_OUT'], duration: 0.20, easing: { type: 'EASE_OUT' }, tolerance: [0.195, 0.205] },
  OVERLAY_DEFAULT: { type: 'DISSOLVE', duration: 0.15, easing: { type: 'EASE_OUT' }, tolerance: [0.145, 0.155] },
});
export const motionSupport = Object.freeze({
  STATE: 'SUPPORTED: existing same-set NODE + CHANGE_TO -> STATE_FAST',
  NAVIGATION: 'SUPPORTED: existing NODE + NAVIGATE -> NAV_DEFAULT',
  SPATIAL_NAVIGATION: 'SUPPORTED when direction/order is justified: existing NODE + NAVIGATE -> NAV_SPATIAL; otherwise NAV_DEFAULT',
  OVERLAY: 'SUPPORTED: existing NODE + OVERLAY -> OVERLAY_DEFAULT; position/behavior immutable',
  SCROLL: 'SEMANTIC_ONLY / PRESERVE: existing SCROLL_TO -> SCROLL_NATIVE, SEMANTICALLY_RECOGNIZED / NO_TRANSITION_WRITE',
  FEEDBACK: 'CONDITIONALLY_SUPPORTED: existing same-set CHANGE_TO -> STATE_FAST; otherwise prerequisite, no decorative animation',
  ENTER: 'CONDITIONALLY_SUPPORTED through an existing NAVIGATE/OVERLAY transition; arbitrary element entrance is MOTION_LIMITED',
  EXIT: 'CONDITIONALLY_SUPPORTED through an existing NAVIGATE/OVERLAY transition; arbitrary element exit is MOTION_LIMITED',
  SHARED_ELEMENT: 'CONDITIONALLY_SUPPORTED / PRESERVE only already-verified matching-layer or SMART_ANIMATE continuity; otherwise MOTION_LIMITED',
});
for (const token of Object.values(motionTokens)) {
  Object.freeze(token.easing); Object.freeze(token.tolerance);
  if (token.types) Object.freeze(token.types);
  Object.freeze(token);
}
const directions = ['LEFT', 'RIGHT', 'TOP', 'BOTTOM'];
const eligible = action => action?.type === 'NODE' && ['CHANGE_TO', 'NAVIGATE', 'OVERLAY'].includes(action.navigation);
const result = (intent, token, support, reason, transition) => ({ intent, token, support, reason, ...(transition ? { transition } : {}) });

// Pure proposals only: evidence is supplied from inspection, never inferred from canvas coordinates.
export function resolveMotion({ intent, action, evidence = {}, override }) {
  if (!Object.hasOwn(motionSupport, intent)) throw new Error('Unknown semantic motion intent');
  if (intent === 'SCROLL' && action?.type === 'NODE' && action.navigation === 'SCROLL_TO') return result(intent, 'SCROLL_NATIVE', evidence.destinationExists === true ? 'PRESERVE' : 'UNKNOWN', evidence.destinationExists === true ? 'SEMANTICALLY_RECOGNIZED / NO_TRANSITION_WRITE' : 'Recognized SCROLL; verify destination/context, no transition write');
  if (!eligible(action)) return result(intent, null, ['ENTER', 'EXIT', 'SHARED_ELEMENT'].includes(intent) || override ? 'LIMITED' : 'UNKNOWN', 'MOTION_LIMITED or prerequisite: no compatible existing NODE transition; preserve action');
  if (evidence.destinationExists !== true) return result(intent, null, 'UNKNOWN', 'Verify existing destination before proposing motion');
  if (['ENTER', 'EXIT'].includes(intent) && evidence.representedIntent !== intent) return result(intent, null, 'LIMITED', `MOTION_LIMITED: ${intent}; existing reaction does not verify the requested entrance/exit`);
  const sameSet = typeof evidence.sourceSetId === 'string' && evidence.sourceSetId.length > 0 && evidence.sourceSetId === evidence.destinationSetId;
  if (intent === 'SHARED_ELEMENT') {
    const relationship = action.navigation === 'CHANGE_TO' ? sameSet : evidence.runtimeDestination === true;
    const verified = evidence.sharedElementVerified === true && relationship && (action.transition?.type === 'SMART_ANIMATE' || motionTokens.NAV_SPATIAL.types.includes(action.transition?.type) && action.transition?.matchLayers === true);
    return result(intent, null, verified ? 'PRESERVE' : 'LIMITED', verified ? 'Preserve verified existing continuity; never enable matchLayers' : 'MOTION_LIMITED: SHARED_ELEMENT');
  }
  let token;
  if (['STATE', 'FEEDBACK'].includes(intent)) {
    if (action.navigation !== 'CHANGE_TO' || !sameSet) return result(intent, null, 'UNKNOWN', 'Prerequisite: compatible same-set CHANGE_TO, not screen navigation');
    token = 'STATE_FAST';
  } else if (intent === 'OVERLAY' || (['ENTER', 'EXIT'].includes(intent) && action.navigation === 'OVERLAY')) {
    if (action.navigation !== 'OVERLAY' || evidence.runtimeDestination !== true) return result(intent, null, 'UNKNOWN', 'Verify existing runtime OVERLAY destination');
    token = 'OVERLAY_DEFAULT';
  } else if (['NAVIGATION', 'SPATIAL_NAVIGATION', 'ENTER', 'EXIT'].includes(intent)) {
    if (action.navigation !== 'NAVIGATE' || evidence.runtimeDestination !== true) return result(intent, null, ['ENTER', 'EXIT'].includes(intent) ? 'LIMITED' : 'UNKNOWN', 'Require existing runtime NAVIGATE; arbitrary element motion is MOTION_LIMITED');
    token = intent === 'SPATIAL_NAVIGATION' && evidence.spatialMeaning === true && directions.includes(evidence.direction) ? 'NAV_SPATIAL' : 'NAV_DEFAULT';
  } else return result(intent, null, 'UNKNOWN', 'Semantic intent does not fit existing action');
  const { tolerance, types, ...base } = motionTokens[token];
  let transition = structuredClone(base);
  if (token === 'NAV_SPATIAL') transition = { ...transition, type: types.includes(action.transition?.type) ? action.transition.type : types[0], direction: evidence.direction, matchLayers: action.transition?.matchLayers === true && evidence.sharedElementVerified === true ? true : false };
  if (override) {
    const type = override.type ?? transition.type;
    const spatial = motionTokens.NAV_SPATIAL.types.includes(type);
    const compatible = spatial ? action.navigation === 'NAVIGATE' && evidence.spatialMeaning === true && directions.includes(override.direction ?? evidence.direction)
      : type === 'DISSOLVE' || type === 'SMART_ANIMATE' && (action.navigation === 'CHANGE_TO' && sameSet || evidence.sharedElementVerified === true && action.transition?.type === 'SMART_ANIMATE');
    const easingValid = override.easing === undefined || override.easing && Object.keys(override.easing).length === 1 && ['LINEAR', 'EASE_IN', 'EASE_OUT', 'EASE_IN_AND_OUT'].includes(override.easing.type);
    if (!compatible || override.duration !== undefined && (!Number.isFinite(override.duration) || override.duration < 0)
      || !easingValid || Object.keys(override).some(k => !['type', 'duration', 'direction', 'easing'].includes(k))) return result(intent, token, 'LIMITED', 'Incompatible or unverified override; preserve action, no transition write');
    transition = { type, duration: override.duration ?? transition.duration, easing: structuredClone(override.easing ?? base.easing) };
    if (spatial) { transition.direction = override.direction ?? evidence.direction; transition.matchLayers = action.transition?.matchLayers === true && evidence.sharedElementVerified === true ? true : false; }
    else if (override.direction !== undefined) return result(intent, token, 'LIMITED', 'Direction is incompatible with this transition');
  }
  if (evidence.sourceHasInstances === true && evidence.instanceProjectionSafe !== true && !transitionMatches(action.transition, transition)) return result(intent, token, 'UNKNOWN', 'SKIP THE WRITE: dependent instance reaction projection is uncertain');
  return result(intent, token, 'SUPPORTED', token === 'NAV_DEFAULT' && intent === 'SPATIAL_NAVIGATION' ? 'Direction not justified; NAV_DEFAULT, not canvas-derived motion' : 'Verified existing action', transition);
}

export function transitionMatches(actual, expected) {
  if (!actual || !expected) return actual === expected;
  const { duration: a, ...actualFields } = actual, { duration: b, tolerance, ...expectedFields } = expected;
  const range = Object.values(motionTokens).find(t => t.duration === b)?.tolerance;
  return isDeepStrictEqual(actualFields, expectedFields) && Number.isFinite(a) && Number.isFinite(b)
    && (range ? a >= range[0] && a <= range[1] : a === b || a === Math.fround(b));
}

export function reactionSemantics(reactions) {
  if (!Array.isArray(reactions) || reactions.some(r => !r || !Object.hasOwn(r, 'trigger') || !Array.isArray(r.actions))) throw new Error('SKIP THE WRITE: complete plural reaction arrays required');
  const semanticAction = a => {
    if (!eligible(a)) return structuredClone(a);
    const { transition, ...semantic } = a; return structuredClone(semantic);
  };
  return reactions.map(r => {
    if (r.action != null && !isDeepStrictEqual(r.action, r.actions[0])) throw new Error('SKIP THE WRITE: deprecated action mirror differs from first plural action');
    return { ...r, ...(r.action != null ? { action: semanticAction(r.action) } : {}), actions: r.actions.map(semanticAction) };
  });
}

// No tool executor or writes. Callers must still verify live ownership and complete read-back.
export function planMotion(reactions, requests, { authorized = false, ownership } = {}) {
  reactionSemantics(reactions);
  const proposed = structuredClone(reactions), seen = new Set();
  const findings = requests.map(({ reactionIndex, actionIndex, ...request }) => {
    const key = `${reactionIndex}:${actionIndex}`;
    if (!Number.isInteger(reactionIndex) || !Number.isInteger(actionIndex) || !proposed[reactionIndex]?.actions[actionIndex] || seen.has(key)) throw new Error('Invalid or duplicate motion target');
    seen.add(key);
    const action = reactions[reactionIndex].actions[actionIndex], decision = resolveMotion({ ...request, action });
    const status = decision.support === 'LIMITED' ? 'LIMITED' : decision.support === 'UNKNOWN' ? 'UNKNOWN' : !decision.transition || transitionMatches(action.transition, decision.transition) ? 'MATCH' : 'MISMATCH';
    if (authorized && ['states', 'runtime'].includes(ownership) && status === 'MISMATCH') {
      proposed[reactionIndex].actions[actionIndex].transition = decision.transition;
      if (actionIndex === 0 && proposed[reactionIndex].action != null) proposed[reactionIndex].action = structuredClone(proposed[reactionIndex].actions[0]);
    }
    return { reactionIndex, actionIndex, ...decision, status };
  });
  if (!isDeepStrictEqual(reactionSemantics(reactions), reactionSemantics(proposed))) throw new Error('Non-transition semantics changed');
  return { reactions: proposed, findings, write: !isDeepStrictEqual(reactions, proposed) };
}

export const motionRoutingInstructions = `Single motion requests and transition audits use motion: subtle navigation, snappy existing state changes, forward/backward steps, quiet modal, less motion, scroll smoothly, shared element or arbitrary element entrance/exit. Recognize limited intents rather than routing them to redesign. More animated needs one motion-intent clarification before writes. Audit/review/consistency questions are read-only without explicit change authorization. Add hover states remains states; make the whole app interactive remains prototype_planner. A broad interactive outcome explicitly requesting separate states/runtime verification, a semantic MOTION finishing phase and final QA selects prototype_planner, even when a focused interaction repair dominates the recent context or matching phases are no-ops. Do not collapse that explicitly requested multi-capability sequence into working_interaction. Ordinary narrow interactions using their normal transition defaults still stay working_interaction.\nSemantic vocabulary: ${Object.keys(motionSupport).join(', ')}.`;
export const motionPolicy = `SEMANTIC MOTION REGISTRY — V1.2.4\nInterpret intent before transition implementation.\nSUPPORT MATRIX\n${Object.entries(motionSupport).map(([k,v]) => `${k}: ${v}`).join('\n')}\nCANONICAL TOKENS (tolerance is duration read-back range, not a Figma transition field)\n${JSON.stringify(motionTokens, null, 2)}\nNo arbitrary timelines, keyframes, springs/bounce, parallax, looping or scroll-driven animation. Reduced-motion-conscious authoring, not OS preference detection. Audit without change authorization and plan-only mean zero Figma or filesystem authoring: no helper/report file creation. Preserve complete non-transition reaction semantics. Equivalent float values mean MOTION_ALREADY_NORMALIZED, zero writes.`;

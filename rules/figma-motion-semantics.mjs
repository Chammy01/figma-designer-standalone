import { isDeepStrictEqual } from 'node:util';

export const motionTokens = Object.freeze({
  STATE_FAST: { type: 'SMART_ANIMATE', duration: 0.10, easing: { type: 'EASE_OUT' }, tolerance: [0.095, 0.105] },
  NAV_DEFAULT: { type: 'DISSOLVE', duration: 0.15, easing: { type: 'EASE_OUT' }, tolerance: [0.145, 0.155] },
  NAV_SPATIAL: { types: ['PUSH', 'MOVE_IN', 'MOVE_OUT', 'SLIDE_IN', 'SLIDE_OUT'], duration: 0.20, easing: { type: 'EASE_OUT' }, tolerance: [0.195, 0.205] },
  OVERLAY_DEFAULT: { type: 'DISSOLVE', duration: 0.15, easing: { type: 'EASE_OUT' }, tolerance: [0.145, 0.155] },
  SCROLL_SMOOTH: { type: 'SCROLL_ANIMATE', duration: 0.20, easing: { type: 'EASE_OUT' }, tolerance: [0.195, 0.205] },
});
export const motionSupport = Object.freeze({
  STATE: 'SUPPORTED: existing same-set NODE + CHANGE_TO -> STATE_FAST',
  NAVIGATION: 'SUPPORTED: existing NODE + NAVIGATE -> NAV_DEFAULT',
  SPATIAL_NAVIGATION: 'SUPPORTED when direction/order is justified: existing NODE + NAVIGATE -> NAV_SPATIAL; otherwise NAV_DEFAULT',
  OVERLAY: 'SUPPORTED: existing NODE + OVERLAY -> OVERLAY_DEFAULT; position/behavior immutable',
  SCROLL: 'SEMANTIC_ONLY / PRESERVE: existing SCROLL_TO -> SCROLL_NATIVE, SEMANTICALLY_RECOGNIZED / NO_TRANSITION_WRITE',
  SCROLL_SMOOTH: 'SUPPORTED only for explicit animated-scroll intent: existing owned NODE + SCROLL_TO in a verified prepared native scroll context -> SCROLL_SMOOTH; otherwise FIGMA_LIMITED: SCROLL_CONTEXT_PREPARATION',
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
const scrollAction = action => action?.type === 'NODE' && action.navigation === 'SCROLL_TO';
const result = (intent, token, support, reason, transition) => ({ intent, token, support, reason, ...(transition ? { transition } : {}) });

// Parent-relative geometry proves overflow only after real native overflowDirection is known.
export function inspectScrollContext({ nodes, sourceId, destinationId, runtimeId }) {
  const context = (status, reason, extra = {}) => ({ status, reason, sourceId, destinationId, ...extra });
  if (!Array.isArray(nodes)) return context('UNKNOWN', 'Current native node inventory required');
  const index = new Map(nodes.map(n => [n.id, n]));
  if (index.size !== nodes.length || index.get(runtimeId)?.type !== 'SECTION' || index.get(runtimeId)?.name !== 'Figma Designer — Interactive App' || nodes.filter(n => n.name === 'Figma Designer — Interactive App' && n.type === 'SECTION').length !== 1) return context('UNKNOWN', 'Unambiguous owned runtime required');
  function path(id) {
    const visited = new Set(), chain = [];
    for (let n = index.get(id); n; n = index.get(n.parentId)) {
      if (visited.has(n.id)) return [];
      visited.add(n.id); chain.push(n);
      if (n.id === runtimeId) return chain;
      if (!index.get(n.parentId)?.children?.includes(n.id)) return [];
    }
    return [];
  }
  const source = path(sourceId), target = path(destinationId);
  if (!source.length || !target.length || target.length < 3) return context('UNKNOWN', 'Verify owned source and actual child destination');
  const frames = target.slice(1).filter(n => n.type === 'FRAME');
  const container = frames.find(n => ['VERTICAL', 'HORIZONTAL', 'BOTH'].includes(n.props?.overflowDirection));
  const inspected = container ? frames.slice(0, frames.indexOf(container) + 1) : frames;
  if (!inspected.length || inspected.some(n => !['NONE','VERTICAL','HORIZONTAL','BOTH'].includes(n.props?.overflowDirection))) return context('UNKNOWN', 'Native overflow evidence unavailable; clipping/name/canvas placement is insufficient');
  if (!container) return context('LIMITED', 'FIGMA_LIMITED: SCROLL_CONTEXT_PREPARATION');
  const sourceContainer = source.filter(n => n.type === 'FRAME').find(n => ['VERTICAL','HORIZONTAL','BOTH'].includes(n.props?.overflowDirection));
  if (sourceContainer?.id !== container.id) return context('UNKNOWN', 'Source and destination do not share the verified scroll context');
  if (source.slice(0,source.indexOf(container)+1).some(n => n.type === 'FRAME' && !['NONE','VERTICAL','HORIZONTAL','BOTH'].includes(n.props?.overflowDirection))) return context('UNKNOWN', 'Source native scroll context is incomplete');
  const children = (container.children ?? []).map(id => index.get(id));
  const geometry = n => n?.geometry && ['x','y','width','height'].every(k => Number.isFinite(n.geometry[k])) && n.geometry.width > 0 && n.geometry.height > 0;
  const transformed = n => { const t=n.props?.relativeTransform; return n.props?.rotation || n.geometry?.rotation || t && (t[0]?.[0]!==1 || t[0]?.[1]!==0 || t[1]?.[0]!==0 || t[1]?.[1]!==1); };
  if (!geometry(container) || children.some(n => !geometry(n)) || [...source.slice(0,source.indexOf(container)+1), ...target.slice(0,target.indexOf(container)+1)].some(n => !geometry(n) || n.props?.visible === false || transformed(n))) return context('UNKNOWN', 'Verify visible, axis-aligned parent-relative geometry and content');
  const offset=target.slice(0,target.indexOf(container)).reduce((p,n)=>({x:p.x+n.geometry.x,y:p.y+n.geometry.y}),{x:0,y:0});
  if (!Number.isFinite(offset.x+offset.y) || offset.x<0 || offset.y<0 || container.props.overflowDirection==='VERTICAL' && (offset.x>=container.geometry.width || offset.x+target[0].geometry.width<=0) || container.props.overflowDirection==='HORIZONTAL' && (offset.y>=container.geometry.height || offset.y+target[0].geometry.height<=0)) return context('UNKNOWN', 'Destination cannot be verified within the native scrolling axes');
  const visible = children.filter(n => n.props?.visible !== false && n.props?.scrollBehavior !== 'FIXED');
  const overflowAxes = [];
  if (['VERTICAL','BOTH'].includes(container.props.overflowDirection) && visible.some(n => n.geometry.y + n.geometry.height > container.geometry.height)) overflowAxes.push('VERTICAL');
  if (['HORIZONTAL','BOTH'].includes(container.props.overflowDirection) && visible.some(n => n.geometry.x + n.geometry.width > container.geometry.width)) overflowAxes.push('HORIZONTAL');
  if (!overflowAxes.length) return context('LIMITED', 'FIGMA_LIMITED: SCROLL_CONTEXT_PREPARATION; no evidenced content overflow');
  return context('PREPARED', 'Native overflowDirection, child ancestry and content overflow verified', { containerId: container.id, nativeOverflow: container.props.overflowDirection, overflowAxes });
}

// Pure proposals only: evidence is supplied from inspection, never inferred from canvas coordinates.
export function resolveMotion({ intent, action, evidence = {}, override }) {
  if (!Object.hasOwn(motionSupport, intent)) throw new Error('Unknown semantic motion intent');
  if ((action?.transition?.type === 'SCROLL_ANIMATE' || override?.type === 'SCROLL_ANIMATE') && !scrollAction(action)) return result(intent, null, 'LIMITED', 'SCROLL_ANIMATE is compatible only with NODE + SCROLL_TO; preserve action');
  if (intent === 'SCROLL' && action?.type === 'NODE' && action.navigation === 'SCROLL_TO') return result(intent, 'SCROLL_NATIVE', evidence.destinationExists === true ? 'PRESERVE' : 'UNKNOWN', evidence.destinationExists === true ? 'SEMANTICALLY_RECOGNIZED / NO_TRANSITION_WRITE' : 'Recognized SCROLL; verify destination/context, no transition write');
  if (intent === 'SCROLL_SMOOTH') {
    if (!scrollAction(action)) return result(intent, 'SCROLL_SMOOTH', 'LIMITED', 'SCROLL_ANIMATE is compatible only with existing NODE + SCROLL_TO');
    if (evidence.destinationExists !== true || evidence.intendedDestinationId !== action.destinationId) return result(intent, 'SCROLL_SMOOTH', 'UNKNOWN', 'Verify the actual intended existing child destination');
    const context = evidence.scrollContext;
    if (!context || !context.sourceId || context.destinationId !== action.destinationId || context.sourceId !== evidence.sourceId || context.status === 'UNKNOWN') return result(intent, 'SCROLL_SMOOTH', 'UNKNOWN', 'Verify current native scroll-context evidence');
    if (context.status !== 'PREPARED') return result(intent, 'SCROLL_SMOOTH', 'LIMITED', 'FIGMA_LIMITED: SCROLL_CONTEXT_PREPARATION');
    if (!context.containerId || !['VERTICAL','HORIZONTAL','BOTH'].includes(context.nativeOverflow) || !context.overflowAxes?.length || !context.overflowAxes.every(axis => ['VERTICAL','HORIZONTAL'].includes(axis))) return result(intent, 'SCROLL_SMOOTH', 'UNKNOWN', 'Incomplete native scroll-context evidence');
    const { tolerance, ...transition } = motionTokens.SCROLL_SMOOTH;
    if (override && !transitionMatches(override, transition)) return result(intent, 'SCROLL_SMOOTH', 'LIMITED', 'EXPERIMENTAL / not enabled: scroll uses the canonical token only');
    if (action.transition != null && action.transition.type !== 'SCROLL_ANIMATE') return result(intent, 'SCROLL_SMOOTH', 'LIMITED', 'Unverified existing scroll transition; preserve without normalization');
    if (evidence.sourceHasInstances === true && evidence.instanceProjectionSafe !== true && !transitionMatches(action.transition, transition)) return result(intent, 'SCROLL_SMOOTH', 'UNKNOWN', 'SKIP THE WRITE: dependent instance reaction projection is uncertain');
    return result(intent, 'SCROLL_SMOOTH', 'SUPPORTED', 'Explicit smooth scrolling in verified native context', structuredClone(transition));
  }
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
    if (!eligible(a) && !scrollAction(a)) return structuredClone(a);
    const { transition, ...semantic } = a; return structuredClone(semantic);
  };
  return reactions.map(r => {
    if (r.action != null && !isDeepStrictEqual(r.action, r.actions[0])) throw new Error('SKIP THE WRITE: deprecated action mirror differs from first plural action');
    return { ...r, ...(r.action != null ? { action: semanticAction(r.action) } : {}), actions: r.actions.map(semanticAction) };
  });
}

export function conflictingScrollActions(reactions, reactionIndex) {
  return reactions.filter(r => isDeepStrictEqual(r.trigger, reactions[reactionIndex].trigger)).flatMap(r => r.actions ?? []).filter(a => a.type === 'NODE' && ['NAVIGATE','OVERLAY','SWAP','SCROLL_TO'].includes(a.navigation) || ['BACK','CLOSE','URL'].includes(a.type)).length > 1;
}

// No tool executor or writes. Callers must still verify live ownership and complete read-back.
export function planMotion(reactions, requests, { authorized = false, ownership } = {}) {
  reactionSemantics(reactions);
  const proposed = structuredClone(reactions), seen = new Set();
  const findings = requests.map(({ reactionIndex, actionIndex, ...request }) => {
    const key = `${reactionIndex}:${actionIndex}`;
    if (!Number.isInteger(reactionIndex) || !Number.isInteger(actionIndex) || !proposed[reactionIndex]?.actions[actionIndex] || seen.has(key)) throw new Error('Invalid or duplicate motion target');
    seen.add(key);
    const action = reactions[reactionIndex].actions[actionIndex];
    const decision = request.intent === 'SCROLL_SMOOTH' && conflictingScrollActions(reactions,reactionIndex) ? result(request.intent, 'SCROLL_SMOOTH', 'UNKNOWN', 'SKIP THE WRITE: conflicting reaction semantics') : resolveMotion({ ...request, action });
    const status = decision.support === 'LIMITED' ? 'LIMITED' : decision.support === 'UNKNOWN' ? 'UNKNOWN' : !decision.transition || transitionMatches(action.transition, decision.transition) ? 'MATCH' : 'MISMATCH';
    if (authorized && ['states', 'runtime'].includes(ownership) && (request.intent !== 'SCROLL_SMOOTH' || ownership === 'runtime') && status === 'MISMATCH') {
      proposed[reactionIndex].actions[actionIndex].transition = decision.transition;
      if (actionIndex === 0 && proposed[reactionIndex].action != null) proposed[reactionIndex].action = structuredClone(proposed[reactionIndex].actions[0]);
    }
    return { reactionIndex, actionIndex, ...decision, status };
  });
  if (!isDeepStrictEqual(reactionSemantics(reactions), reactionSemantics(proposed))) throw new Error('Non-transition semantics changed');
  return { reactions: proposed, findings, write: !isDeepStrictEqual(reactions, proposed) };
}

export const motionRoutingInstructions = `Explicit smooth/animated scroll requests select SCROLL_SMOOTH; ordinary scroll-to requests keep SCROLL_NATIVE and belong to flow/interactive when wiring is needed. Do not infer animated scrolling from generic subtle/less-motion requests. A broad interactive goal explicitly including smooth scrolling uses prototype_planner; checking whether scrolling works stays qa, aesthetic scrolling critique stays design_critique. Single motion requests and transition audits use motion: subtle navigation, snappy existing state changes, forward/backward steps, quiet modal, less motion, scroll smoothly, shared element or arbitrary element entrance/exit. Recognize limited intents rather than routing them to redesign. More animated needs one motion-intent clarification before writes. Audit/review/consistency questions are read-only without explicit change authorization. Add hover states remains states; make the whole app interactive remains prototype_planner. A broad interactive outcome explicitly requesting separate states/runtime verification, a semantic MOTION finishing phase and final QA selects prototype_planner, even when a focused interaction repair dominates the recent context or matching phases are no-ops. Do not collapse that explicitly requested multi-capability sequence into working_interaction. Ordinary narrow interactions using their normal transition defaults still stay working_interaction.\nSemantic vocabulary: ${Object.keys(motionSupport).join(', ')}.`;
export const motionPolicy = `SEMANTIC MOTION REGISTRY — V1.3\nInterpret intent before transition implementation.\nSUPPORT MATRIX\n${Object.entries(motionSupport).map(([k,v]) => `${k}: ${v}`).join('\n')}\nCANONICAL TOKENS (tolerance is duration read-back range, not a Figma transition field)\n${JSON.stringify(motionTokens, null, 2)}\nNo arbitrary timelines, keyframes, springs/bounce, parallax, looping or scroll-driven animation. Reduced-motion-conscious authoring, not OS preference detection. Audit without change authorization and plan-only mean zero Figma or filesystem authoring: no helper/report file creation. Preserve complete non-transition reaction semantics. Equivalent float values mean MOTION_ALREADY_NORMALIZED, zero writes.`;

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { motionTokens, transitionMatches, resolveMotion } from '../rules/figma-motion-semantics.mjs';
import { loadContracts, loadPlannerContract } from '../rules/figma-intent-router.mjs';

const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8').replaceAll('\r\n','\n');
const audit = JSON.parse(read('scripts/fixtures/figma-motion-capabilities.json'));
const row = id => audit.nativeProbes.find(r=>r.id===id);
const transition = r => r.readback[0].actions[0].transition;
const capability = name => audit.capabilities.find(c=>c.capability===name);
const declared = audit.api.declarations;
const doc = read('docs/FIGMA_MOTION_CAPABILITY_AUDIT_V1_2_8.md');

test('evidence vocabulary separates declarations, native rejection and playback',()=>{
  assert.deepEqual(audit.evidenceStatuses,['DECLARED','TRANSPORTED','AUTHORABLE','READBACK_VERIFIED','PLAYBACK_VERIFIED','REJECTED_NATIVE','PLAN_BLOCKED','NOT_EXPOSED','UNVERIFIED']);
  for(const c of audit.capabilities) assert.ok(audit.evidenceStatuses.includes(c.status),c.capability);
});
test('all eight pinned transition types have matrix entries and exact public requests',()=>{
  assert.deepEqual(declared.simple,['DISSOLVE','SMART_ANIMATE','SCROLL_ANIMATE']);
  assert.deepEqual(declared.directional,['MOVE_IN','MOVE_OUT','PUSH','SLIDE_IN','SLIDE_OUT']);
  for(const type of [...declared.simple,...declared.directional]) {
    assert.ok(capability(type)); assert.equal(row('transition/'+type).request[0].actions[0].transition.type,type);
  }
});
test('all thirteen pinned easing types have tested exact shapes',()=>{
  assert.equal(declared.easing.length,13);
  for(const type of declared.easing) assert.equal(row('easing/'+type).request[0].actions[0].transition.easing.type,type);
  assert.deepEqual(declared.bezier,['x1','y1','x2','y2']);
  assert.deepEqual(declared.spring,['mass','stiffness','damping','initialVelocity']);
});
test('canonical float32 duration normalization remains within existing tolerances',()=>{
  for(const duration of [.1,.15,.2,.5]) assert.equal(transition(row('duration/'+duration)).duration,Math.fround(duration));
  assert.equal(transition(row('duration/0')).duration,.3);
});
test('zero duration readback is not promoted to measured instant playback',()=>{
  const r=audit.playback.find(r=>r.id==='duration/0'); assert.equal(r.playback,'UNVERIFIED'); assert.match(r.observation,/timing remains unverified/);
});
test('directional fields are required by native setter rather than permissive validator',()=>{
  for(const type of declared.directional) {
    assert.deepEqual(capability(type).requiredFields,['type','duration','easing','direction','matchLayers']);
    for(const field of ['direction','matchLayers']) assert.equal(row('required/'+type+'/no-'+field).status,'REJECTED_NATIVE');
  }
});
test('all four directions read back for all five directional types',()=>{
  assert.deepEqual(declared.directions,['LEFT','RIGHT','TOP','BOTTOM']);
  for(const type of declared.directional) for(const direction of declared.directions) {
    assert.equal(transition(row('direction/'+type+'/'+direction)).direction,direction);
  }
});
test('direction playback coverage is bounded; canvas placement is not semantic direction',()=>{
  for(const direction of ['RIGHT','TOP','BOTTOM']) assert.match(audit.playback.find(r=>r.id==='direction/PUSH/'+direction).observation,/despite rightward canvas placement/);
  assert.match(capability('MOVE_IN').limitations,/Other type\/direction playback remains UNVERIFIED/);
});
test('matchLayers booleans survive native readback for every directional type',()=>{
  for(const type of declared.directional) {
    assert.equal(transition(row('matchLayers/'+type+'/true')).matchLayers,true);
    assert.equal(transition(row('direction/'+type+'/LEFT')).matchLayers,false);
  }
});
test('SMART_ANIMATE rejects invented matchLayers and preserves implicit matching',()=>{
  assert.equal(row('smart/extra-matchLayers').status,'REJECTED_NATIVE');
  assert.ok(!('matchLayers' in transition(row('transition/SMART_ANIMATE'))));
});
test('SCROLL_ANIMATE is action-specific, not a new screen transition',()=>{
  assert.equal(row('transition/SCROLL_ANIMATE').status,'REJECTED_NATIVE');
  const r=audit.playback.find(r=>r.id==='scroll/animated');
  assert.equal(r.readback[0].actions[0].navigation,'SCROLL_TO'); assert.equal(r.readback[0].actions[0].transition.type,'SCROLL_ANIMATE');
  assert.equal(r.playback,'PLAYBACK_VERIFIED');
});
test('SCROLL_TO native null is captured without an invented transition',()=>{
  const r=audit.playback.find(r=>r.id==='scroll/native'); assert.equal(r.readback[0].actions[0].transition,null); assert.equal(r.playback,'PLAYBACK_VERIFIED');
});
test('centered overlay accepts dissolve and move-in; native rejects other probe types',()=>{
  for(const type of [...declared.simple,...declared.directional]) assert.equal(row('compatibility/OVERLAY/'+type).status,['DISSOLVE','MOVE_IN'].includes(type)?'READBACK_VERIFIED':'REJECTED_NATIVE');
  for(const type of ['DISSOLVE','MOVE_IN']) assert.equal(audit.playback.find(r=>r.id==='overlay/'+type).playback,'PLAYBACK_VERIFIED');
});
test('same-set CHANGE_TO uses genuine variants, not the invalid frame-control probes',()=>{
  for(const type of [...declared.simple,...declared.directional]) assert.equal(row('same-set/'+type).status,['DISSOLVE','SMART_ANIMATE'].includes(type)?'READBACK_VERIFIED':'REJECTED_NATIVE');
  assert.equal(row('compatibility/CHANGE_TO/SMART_ANIMATE').invalidDestinationContext,true);
  assert.equal(transition(row('same-set/SMART_ANIMATE')).type,'SMART_ANIMATE');
});
test('Smart Animate property/matching observations are separate from reaction JSON',()=>{
  for(const name of ['position','size','opacity','fill','rotation','corner','rename','hierarchy','instance','font-size','gap','reorder']) assert.equal(audit.playback.find(r=>r.id==='smart/'+name).playback,'PLAYBACK_VERIFIED');
  assert.equal(audit.playback.find(r=>r.id==='smart/text').playback,'UNVERIFIED');
  assert.match(capability('SHARED_ELEMENT_CONDITIONAL').limitations,/Never restructure/);
});
test('custom spring declares initialVelocity but native rejects it; alternate is explicit',()=>{
  assert.equal(row('easing/CUSTOM_SPRING').status,'REJECTED_NATIVE');
  assert.match(row('easing/CUSTOM_SPRING').error,/initialVelocity/);
  const r=audit.playback.find(r=>r.id==='curve/CUSTOM_SPRING');
  assert.deepEqual(Object.keys(r.transition.easing.easingFunctionSpring),['mass','stiffness','damping']);
  assert.equal(capability('CUSTOM_SPRING_NATIVE_THREE_FIELDS').recommendation,'EXPERIMENTAL');
});
test('every capability has a browser parity and V1.3 recommendation',()=>{
  for(const c of audit.capabilities) {
    assert.ok(['SUPPORTED','PARTIAL','NOT_IMPLEMENTED','UNVERIFIED'].includes(c.browserParity));
    assert.ok(audit.recommendations.includes(c.recommendation)); assert.ok(c.limitations);
  }
});
test('every future ship candidate has native visible playback evidence',()=>{
  for(const c of audit.capabilities.filter(c=>c.recommendation==='SHIP_V1_3')) assert.equal(c.status,'PLAYBACK_VERIFIED');
  assert.equal(audit.policy.visiblePromotionRequiresPlayback,true);
});
test('DECLARED, TRANSPORTED and READBACK never imply playback support',()=>{
  assert.equal(audit.policy.readbackDoesNotProvePlayback,true);
  for(const c of audit.capabilities.filter(c=>['DECLARED','TRANSPORTED','READBACK_VERIFIED'].includes(c.status))) assert.notEqual(c.recommendation,'SHIP_V1_3');
});
test('all five existing semantic tokens retain valid bounded native evidence',()=>{
  const state=transition(row('same-set/SMART_ANIMATE'));
  assert.ok(transitionMatches(state,motionTokens.STATE_FAST));
  assert.ok(transitionMatches(transition(row('duration/0.15')),motionTokens.NAV_DEFAULT));
  const spatial=audit.canonicalTokenReadbacks.find(r=>r.id==='type/PUSH').readback[0].actions[0].transition;
  const {types,...spatialToken}=motionTokens.NAV_SPATIAL;
  assert.ok(transitionMatches(spatial,{...spatialToken,type:'PUSH',direction:'LEFT',matchLayers:false}));
  const overlay=audit.canonicalTokenReadbacks.find(r=>r.id==='overlay/DISSOLVE').readback[0].actions[0].transition;
  assert.ok(transitionMatches(overlay,motionTokens.OVERLAY_DEFAULT));
  assert.equal(capability('SCROLL_NATIVE').status,'PLAYBACK_VERIFIED');
});
test('historical audit enabled no tokens; current registry retains its four baseline tokens',()=>{
  assert.deepEqual(Object.keys(motionTokens).filter(name=>name!=='SCROLL_SMOOTH'),['STATE_FAST','NAV_DEFAULT','NAV_SPATIAL','OVERLAY_DEFAULT']);
  assert.equal(audit.policy.auditOnly,true); assert.equal(audit.policy.runtimeChanges,0);
});
test('audit introduces no user-facing command or alias',()=>{
  const names=readdirSync(new URL('../.opencode/commands/figma/',import.meta.url));
  assert.equal(audit.policy.newCommands,0);
  for(const name of ['motion-audit.md','timeline.md','spring.md','shared-element.md']) assert.ok(!names.includes(name));
});
test('V1.2.5 remains HOLD, native plan restriction and playback gap remain',()=>{
  assert.equal(audit.policy.statefulStatus,'HOLD'); const text=read('docs/STATEFUL_VARIABLES_V1_2_5.md');
  assert.match(text,/FIGMA_STATEFUL_VARIABLES: HOLD/); assert.match(text,/plan/i); assert.match(text,/playback/i);
});
test('rich overlay readonly-placement limitations remain intact',()=>{
  assert.match(read('rules/figma-overlay-rules.md'),/MANUAL/);
  assert.match(doc,/contextual.*setter/i); assert.match(doc,/readonly/);
});
test('Interaction QA remains read-only and uses existing semantic interpretation',()=>{
  assert.match(read('.opencode/commands/figma/qa.md'),/read-only/i);
  assert.match(read('rules/figma-interaction-qa.mjs'),/resolveMotion/);
  assert.match(doc,/QA V2 remains unchanged/);
});
test('approved Beta 2 runtime hashes remain exact; source archive may omit binaries',()=>{
  const approved=JSON.parse(read('docs/APPROVED_RUNTIME.json'));
  assert.equal(approved.releaseVersion,'v1.2.1-beta.2');
  for(const [path,expected] of Object.entries(approved.sha256)) {
    const url=new URL('../'+path,import.meta.url);
    if(existsSync(url)) assert.equal(createHash('sha256').update(readFileSync(url)).digest('hex'),expected);
  }
});
test('cleanup restores original node count and both protected fingerprints',()=>{
  assert.equal(audit.policy.cleanupRequired,true); assert.equal(audit.cleanup.restored,true);
  assert.equal(audit.cleanup.count,1290); assert.equal(audit.cleanup.remainingAuditNodes,0);
  assert.deepEqual(audit.liveRead.documentFingerprint,audit.cleanup.documentFingerprint);
  for(const fp of audit.liveRead.sourceFingerprints) assert.deepEqual(fp,audit.cleanup.sourceFingerprint);
  assert.equal(audit.liveRead.figmaWrites,0);
});
test('AFTER_TIMEOUT sequence cannot become a keyframe timeline claim',()=>{
  assert.equal(audit.policy.afterTimeoutIsNotTimeline,true);
  assert.equal(capability('TIMELINE_AUTHORING').status,'NOT_EXPOSED');
  const r=audit.playback.find(r=>r.id==='timed');assert.equal(r.readback[0].trigger.type,'AFTER_TIMEOUT'); assert.equal(r.readback[0].trigger.timeout,1.5);
});
test('ON_DRAG cannot become continuous interpolation or parallax support',()=>{
  assert.equal(audit.policy.onDragIsNotContinuous,true); assert.equal(capability('CONTINUOUS_MOTION').status,'NOT_EXPOSED');
});
test('MCP/API mismatches are documented without a runtime fix or token expansion',()=>{
  assert.equal(capability('SCROLL_ANIMATE').mcpDocumented,false);
  assert.equal(capability('SCROLL_PREPARATION_SETTER').status,'NOT_EXPOSED');
  assert.match(doc,/MCP_GAP: NONE/); assert.match(doc,/initialVelocity/); assert.match(doc,/overflowDirection/);
});
test('source projection V1 preserves exact native fields with no version bump',()=>{
  assert.equal(audit.policy.projectionVersion,'figma-browser-source-v1');
  for(const c of audit.capabilities.filter(c=>c.status!=='NOT_EXPOSED')) assert.equal(c.sourceFreshness,'PRESERVED_V1');
});
test('single motion and planner contracts retain current truthful limitations',async()=>{
  const contracts=await loadContracts(),planner=await loadPlannerContract(contracts);
  assert.match(planner,/SEMANTIC MOTION|semantic intent/i);
  assert.equal(resolveMotion({intent:'ENTER'}).support,'LIMITED');
  assert.equal(resolveMotion({intent:'SHARED_ELEMENT'}).support,'LIMITED');
  assert.match(contracts.motion,/existing/i);
});
test('audit is shipped in source tests and packaged as documentation only',()=>{
  const source=JSON.parse(read('docs/SOURCE_ALLOWLIST.json')),release=JSON.parse(read('docs/RELEASE_ALLOWLIST.json'));
  for(const path of ['scripts/figma-motion-capability.test.mjs','scripts/fixtures/figma-motion-capabilities.json','docs/FIGMA_MOTION_CAPABILITY_AUDIT_V1_2_8.md']) assert.ok(source.includes(path));
  assert.ok(release.includes('docs/FIGMA_MOTION_CAPABILITY_AUDIT_V1_2_8.md'));
  assert.ok(!release.includes('scripts/fixtures/figma-motion-capabilities.json'));
});

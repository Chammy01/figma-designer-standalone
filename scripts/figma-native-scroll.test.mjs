import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {motionTokens,motionSupport,motionRoutingInstructions,planMotion,resolveMotion,reactionSemantics,transitionMatches} from '../rules/figma-motion-semantics.mjs';
import {analyzeInteractions} from '../rules/figma-interaction-qa.mjs';
import {loadContracts,loadMotionContract,loadPlannerContract} from '../rules/figma-intent-router.mjs';
import {scrollFixture} from './fixtures/native-scroll.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8').replaceAll('\r\n','\n');
const live=JSON.parse(read('scripts/fixtures/native-scroll-live.json'));
const plan=f=>planMotion(f.control.reactions,f.request(),{authorized:true,ownership:'runtime'});
const {tolerance,...token}=motionTokens.SCROLL_SMOOTH;

test('SCROLL_NATIVE remains default preservation, including existing animated transitions',()=>{
  for(const transition of [null,token]){const f=scrollFixture({smooth:false,transition});assert.equal(plan(f).write,false);assert.equal(plan(f).findings[0].token,'SCROLL_NATIVE');}
});
test('SCROLL_SMOOTH is one centralized immutable conservative token',()=>{
  assert.match(motionSupport.SCROLL_SMOOTH,/explicit/);assert.equal(token.type,'SCROLL_ANIMATE');assert.equal(token.duration,.2);assert.deepEqual(token.easing,{type:'EASE_OUT'});assert.deepEqual(tolerance,[.195,.205]);assert.ok(Object.isFrozen(motionTokens.SCROLL_SMOOTH));
});
test('explicit smooth scroll maps only an existing valid child edge to canonical transition',()=>{
  const f=scrollFixture(),p=plan(f);assert.equal(p.write,true);assert.equal(p.findings[0].token,'SCROLL_SMOOTH');assert.deepEqual(p.reactions[0].actions[0].transition,token);
});
for(const navigation of ['NAVIGATE','CHANGE_TO','OVERLAY','SWAP'])test(`${navigation} cannot receive SCROLL_ANIMATE`,()=>{
  const f=scrollFixture(),a={...f.control.reactions[0].actions[0],navigation};
  assert.equal(resolveMotion({...f.request()[0],action:a}).support,'LIMITED');
  assert.equal(resolveMotion({intent:'NAVIGATION',action:{...a,transition:token},evidence:{destinationExists:true,runtimeDestination:true}}).support,'LIMITED');
  assert.equal(resolveMotion({intent:'NAVIGATION',action:a,evidence:{destinationExists:true,runtimeDestination:true},override:token}).support,'LIMITED');
});
test('actual intended destination must exist and match the inspected child',()=>{
  const f=scrollFixture(),r=f.request()[0],action=f.control.reactions[0].actions[0];
  for(const evidence of [{...r.evidence,destinationExists:false},{...r.evidence,intendedDestinationId:'missing'}])assert.equal(resolveMotion({...r,action,evidence}).support,'UNKNOWN');
  f.target.parentId='missing';assert.equal(plan(f).write,false);
});
test('native overflowDirection, common ancestry and overflow are verified',()=>{
  const f=scrollFixture();assert.equal(f.context().status,'PREPARED');assert.equal(f.context().containerId,'3:1');assert.deepEqual(f.context().overflowAxes,['VERTICAL']);
});
test('clipping or a scroll-like name without native preparation does not authorize motion',()=>{
  const f=scrollFixture({prepared:false});f.find('3:1').name='Scrollable';f.find('3:1').props.clipsContent=true;assert.equal(f.context().status,'LIMITED');assert.equal(plan(f).write,false);
});
test('canvas placement and frame size cannot establish native scrolling',()=>{
  const f=scrollFixture({prepared:false});f.find('3:1').geometry.x=100000;f.find('3:1').geometry.height=40;assert.equal(f.context().status,'LIMITED');assert.equal(plan(f).write,false);
});
test('unprepared context is LIMITED with zero proposals/writes',()=>{
  const f=scrollFixture({prepared:false}),p=plan(f);assert.equal(p.findings[0].status,'LIMITED');assert.match(p.findings[0].reason,/FIGMA_LIMITED: SCROLL_CONTEXT_PREPARATION/);assert.equal(p.write,false);assert.deepEqual(p.reactions,f.control.reactions);
});
test('missing native properties fail UNKNOWN without guessed preparation',()=>{
  const f=scrollFixture();delete f.find('3:1').props.overflowDirection;assert.equal(f.context().status,'UNKNOWN');assert.equal(plan(f).write,false);
});
test('prepared container still requires genuine content overflow',()=>{
  const f=scrollFixture();f.target.geometry.y=100;assert.equal(f.context().status,'LIMITED');assert.equal(plan(f).write,false);
});
test('cross-container, cyclic and incomplete child relationships fail closed',()=>{
  for(const mutate of [f=>f.target.parentId='3:2',f=>f.target.parentId=f.target.id,f=>f.find('3:1').children=[]]){const f=scrollFixture();mutate(f);assert.equal(plan(f).write,false);}
});
test('hidden/rotated or missing geometry is not reliable scroll evidence',()=>{
  for(const mutate of [f=>f.target.props.rotation=45,f=>f.target.props.visible=false,f=>delete f.target.geometry]){const f=scrollFixture();mutate(f);assert.equal(f.context().status,'UNKNOWN');assert.equal(plan(f).write,false);}
});
test('scaled ancestry and targets outside the native scroll axis cannot authorize motion',()=>{
  const f=scrollFixture();f.target.props.relativeTransform=[[2,0,24],[0,2,700]];assert.equal(plan(f).write,false);
  const h=scrollFixture();h.find('3:1').props.overflowDirection='HORIZONTAL';h.target.geometry.x=800;assert.equal(h.context().status,'UNKNOWN');assert.equal(plan(h).write,false);
});
test('complete plural arrays and matching deprecated action mirror are required',()=>{
  const f=scrollFixture();assert.throws(()=>planMotion([{action:f.control.reactions[0].action}],f.request(),{authorized:true,ownership:'runtime'}),/complete plural/);
  f.control.reactions[0].action.destinationId='other';assert.throws(()=>plan(f),/mirror differs/);
});
test('only target transition changes; triggers, flags, destinations and unrelated actions remain exact',()=>{
  const f=scrollFixture();f.control.reactions.push({trigger:{type:'ON_PRESS'},actions:[{type:'URL',url:'https://example.test',extra:{keep:true}}]});
  f.control.reactions[0].actions[0].preserveScrollPosition=true;f.control.reactions[0].action=structuredClone(f.control.reactions[0].actions[0]);
  const before=structuredClone(f.control.reactions),p=plan(f);assert.equal(p.write,true);assert.deepEqual(reactionSemantics(before),reactionSemantics(p.reactions));assert.deepEqual(p.reactions[1],before[1]);assert.deepEqual(f.control.reactions,before);
  const altered=structuredClone(p.reactions);altered[0].actions[0].resetVideoPosition=true;altered[0].action=structuredClone(altered[0].actions[0]);assert.notDeepEqual(reactionSemantics(before),reactionSemantics(altered));
});
test('deprecated action mirrors the first plural action after smooth-scroll proposal',()=>{
  const f=scrollFixture(),p=plan(f);assert.deepEqual(p.reactions[0].action,p.reactions[0].actions[0]);assert.equal(p.reactions[0].actions.length,1);
});
test('conflicting same-trigger location actions prevent writes',()=>{
  const f=scrollFixture();f.control.reactions.push({trigger:{type:'ON_CLICK'},actions:[{type:'NODE',navigation:'NAVIGATE',destinationId:'3:2',transition:null}]});assert.equal(plan(f).write,false);assert.match(plan(f).findings[0].reason,/conflicting/);
});
test('equivalent float32 values and repeated smooth requests are no-ops',()=>{
  const f=scrollFixture({transition:{...token,duration:Math.fround(.2)}});assert.ok(transitionMatches(f.control.reactions[0].action.transition,token));assert.equal(plan(f).write,false);
  const fresh=scrollFixture();fresh.control.reactions=plan(fresh).reactions;assert.equal(plan(fresh).write,false);
});
test('uncertain dependent-instance projection blocks smooth-scroll writes but permits an existing no-op',()=>{
  const f=scrollFixture(),r=f.request()[0];r.evidence.sourceHasInstances=true;
  assert.equal(planMotion(f.control.reactions,[r],{authorized:true,ownership:'runtime'}).write,false);
  assert.equal(resolveMotion({...r,action:f.control.reactions[0].action}).support,'UNKNOWN');
  const normalized=scrollFixture({transition:token}),n=normalized.request()[0];n.evidence.sourceHasInstances=true;assert.equal(planMotion(normalized.control.reactions,[n],{authorized:true,ownership:'runtime'}).write,false);assert.equal(resolveMotion({...n,action:normalized.control.reactions[0].action}).support,'SUPPORTED');
});
test('audit, unauthorized and production/state-library proposals make zero writes',()=>{
  const f=scrollFixture();for(const options of [{},{authorized:false,ownership:'runtime'},{authorized:true,ownership:'production'},{authorized:true,ownership:'states'}])assert.equal(planMotion(f.control.reactions,f.request(),options).write,false);
});
test('unknown scroll transitions and experimental overrides are not normalized',()=>{
  const f=scrollFixture({transition:{type:'DISSOLVE',duration:.3,easing:{type:'EASE_OUT'}}});assert.equal(plan(f).write,false);
  for(const override of [{...token,duration:.5},{...token,easing:{type:'CUSTOM_SPRING'}},{...token,easing:{type:'CUSTOM_CUBIC_BEZIER'}}]){const f=scrollFixture(),r=f.request()[0];assert.equal(resolveMotion({...r,action:f.control.reactions[0].action,override}).support,'LIMITED');}
});
test('language policy distinguishes explicit animation, default scroll, QA and broad planner',()=>{
  assert.match(motionRoutingInstructions,/Explicit smooth\/animated scroll requests select SCROLL_SMOOTH/);assert.match(motionRoutingInstructions,/ordinary scroll-to requests keep SCROLL_NATIVE/);assert.match(motionRoutingInstructions,/broad interactive goal.*prototype_planner/);assert.match(motionRoutingInstructions,/checking whether scrolling works stays qa/);
});
test('motion and planner contracts share canonical smooth intent and prohibit preparation',async()=>{
  const c=await loadContracts(),m=await loadMotionContract(c.motion),p=await loadPlannerContract(c);assert.match(m,/SCROLL_SMOOTH/);assert.match(m,/No UI automation/);assert.match(p,/SCROLL_SMOOTH only after.*SCROLL_TO/);assert.match(p,/QA always last/);assert.match(p,/V1.2.5 HOLD/);
});
test('QA default null scroll is MATCH without an animated expectation',()=>{
  const f=scrollFixture({smooth:false}),r=analyzeInteractions(f.model);assert.equal(r.graph.edges[0].motion.token,'SCROLL_NATIVE');assert.equal(r.graph.edges[0].motion.status,'MATCH');assert.equal(r.status,'PASS');
});
test('QA canonical smooth scroll and native context MATCH read-only',()=>{
  const f=scrollFixture({transition:token}),before=structuredClone(f.model),r=analyzeInteractions(f.model);assert.equal(r.graph.edges[0].motion.token,'SCROLL_SMOOTH');assert.equal(r.graph.edges[0].motion.status,'MATCH');assert.equal(r.graph.edges[0].motion.context.status,'PREPARED');assert.equal(r.status,'PASS');assert.deepEqual(f.model,before);assert.equal(r.integrity.writeCalls,0);
});
test('QA explicit smooth requirement with null in a prepared context is BROKEN',()=>{
  const r=analyzeInteractions(scrollFixture().model);assert.equal(r.status,'FAIL');assert.ok(r.findings.some(f=>f.code==='SMOOTH_SCROLL_MISMATCH'&&f.classification==='BROKEN'));assert.equal(r.graph.edges[0].motion.status,'MISMATCH');
});
test('QA a non-approved scroll transition is BROKEN while motion refuses normalization',()=>{
  const f=scrollFixture({transition:{type:'DISSOLVE',duration:.2,easing:{type:'EASE_OUT'}}});assert.equal(plan(f).write,false);const r=analyzeInteractions(f.model);assert.equal(r.graph.edges[0].motion.status,'MISMATCH');assert.equal(r.status,'FAIL');
});
test('QA unprepared context is FIGMA_LIMITED, not BROKEN',()=>{
  const r=analyzeInteractions(scrollFixture({prepared:false}).model);assert.equal(r.status,'WARN');assert.equal(r.coverage.BROKEN,0);assert.equal(r.graph.edges[0].motion.status,'LIMITED');assert.ok(r.findings.some(f=>f.classification==='FIGMA_LIMITED'));
});
test('QA supplied evidence cannot override real native context',()=>{
  const f=scrollFixture({prepared:false});f.model.scope.controls[0].motion.evidence={scrollContext:{status:'PREPARED'},destinationExists:true};assert.equal(analyzeInteractions(f.model).graph.edges[0].motion.status,'LIMITED');
});
test('QA missing evidence reports UNKNOWN without repair',()=>{
  const f=scrollFixture();delete f.find('3:1').props.overflowDirection;const r=analyzeInteractions(f.model);assert.equal(r.graph.edges[0].motion.status,'UNKNOWN');assert.equal(r.integrity.writeCalls,0);
});
test('browser parity and experimental capabilities remain truthfully limited',()=>{
  assert.match(read('rules/figma-motion-semantics.md'),/Browser[\s\S]*browser motion foundation/);assert.match(read('rules/figma-motion-semantics.md'),/No custom scroll durations/);assert.equal(resolveMotion({intent:'SHARED_ELEMENT'}).support,'LIMITED');assert.equal(resolveMotion({intent:'ENTER'}).support,'LIMITED');
  assert.match(read('.opencode/commands/figma/browser.md'),/Report per-token browser parity/);
});
test('V1.2.5 remains HOLD, with no new slash command or runtime dependency',()=>{
  assert.match(read('docs/STATEFUL_VARIABLES_V1_2_5.md'),/FIGMA_STATEFUL_VARIABLES: HOLD/);assert.equal(readdirSync(new URL('../.opencode/commands/figma/',import.meta.url)).filter(n=>n.endsWith('.md')).length,14);assert.doesNotMatch(read('rules/figma-motion-semantics.mjs'),/fetch\(|set_reactions|writeFile|execFile/);
});
test('approved hashes and critique guard remain unchanged',()=>{
  const a=JSON.parse(read('docs/APPROVED_RUNTIME.json'));for(const [p,hash]of Object.entries(a.sha256)){const url=new URL('../'+p,import.meta.url);if(existsSync(url))assert.equal(createHash('sha256').update(readFileSync(url)).digest('hex'),hash);}
  assert.equal(createHash('sha256').update(read('.opencode/plugins/figma-critique-guard.js')).digest('hex'),'520c8934b0fbc4a334d084596e3e5dd3f4e2aff41fe7ff5bf130e1515c9f11ed');
});
test('retained native acceptance proves explicit authoring, float readback and separate playback',()=>{
  assert.equal(live.cases.A.route,'motion');assert.equal(live.cases.A.directMCPWrites,1);assert.ok(transitionMatches(live.cases.A.after[0].actions[0].transition,token));assert.equal(live.playback.status,'PLAYBACK_VERIFIED');assert.equal(live.playback.exactTimingMeasured,false);assert.deepEqual(reactionSemantics(live.cases.A.before),reactionSemantics(live.cases.A.after));
});
test('live no-op/default/limited requests retain native arrays without writes',()=>{
  for(const label of ['B','C','D']){assert.equal(live.cases[label].directMCPWrites,0);assert.deepEqual(live.cases[label].before,live.cases[label].after);}
  assert.equal(live.cases.C.after[0].actions[0].transition,null);assert.equal(live.policy.scrollPreparationWrites,0);
});
test('live planner preserves partial valid motion, terminal QA stays read-only and cleanup is exact',()=>{
  assert.equal(live.initialPlannerAttempt.status,'FAIL');assert.equal(live.cases.E.route,'prototype_planner');assert.equal(live.cases.E.directMCPWrites,0);assert.equal(live.cases.F.route,'qa');assert.equal(live.qa.status,'PASS');assert.equal(live.qa.writeCalls,0);assert.equal(live.cleanup.restored,true);assert.equal(live.cleanup.remainingFixtureNodes,0);assert.equal(live.cleanup.count,live.baseline.count);assert.deepEqual(live.cleanup.documentFingerprint,live.baseline.documentFingerprint);assert.deepEqual(live.cleanup.sourceFingerprint,live.baseline.sourceFingerprint);
});

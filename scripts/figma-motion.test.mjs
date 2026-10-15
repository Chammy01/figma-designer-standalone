import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { motionTokens, motionSupport, resolveMotion, transitionMatches, reactionSemantics, planMotion, motionPolicy, motionRoutingInstructions } from '../rules/figma-motion-semantics.mjs';
import { loadContracts, loadMotionContract, loadPlannerContract } from '../rules/figma-intent-router.mjs';
import { semanticCases, stateEvidence, runtimeEvidence } from './fixtures/semantic-motion.mjs';
const read = p => readFileSync(new URL('../'+p, import.meta.url),'utf8').replaceAll('\r\n','\n');
const rules = read('rules/figma-motion-semantics.md'), command = read('.opencode/commands/figma/motion.md');
const reaction = action => [{ trigger: { type: 'ON_KEY_DOWN', device: 'KEYBOARD', keyCodes: [13] }, actions: [structuredClone(action), { type: 'URL', url: 'https://example.test', extra: { preserve: true } }], extra: 'retain' }];
const request = c => [{ reactionIndex: 0, actionIndex: 0, intent: c.intent, evidence: c.evidence }];

test('semantic intents and immutable canonical tokens include only the narrow V1.3 extension', () => {
  assert.deepEqual(Object.keys(motionSupport), ['STATE','NAVIGATION','SPATIAL_NAVIGATION','OVERLAY','SCROLL','SCROLL_SMOOTH','FEEDBACK','ENTER','EXIT','SHARED_ELEMENT']);
  assert.deepEqual(Object.keys(motionTokens), ['STATE_FAST','NAV_DEFAULT','NAV_SPATIAL','OVERLAY_DEFAULT','SCROLL_SMOOTH']);
  assert.ok(Object.values(motionTokens).every(t=>Object.isFrozen(t)&&Object.isFrozen(t.easing)&&Object.isFrozen(t.tolerance)));
  assert.ok(motionPolicy.includes(JSON.stringify(motionTokens,null,2)));
});
for (const c of semanticCases) test(c.id+': audit then authorized transition-only proposal', () => {
  const before = reaction(c.action), original = structuredClone(before);
  const audit = planMotion(before, request(c));
  assert.equal(audit.findings[0].token,c.token); assert.equal(audit.findings[0].status,c.status);
  assert.equal(audit.write,false); assert.deepEqual(audit.reactions,before);
  const proposed = planMotion(before,request(c),{authorized:true,ownership:'runtime'});
  assert.equal(proposed.write,c.status==='MISMATCH');
  assert.deepEqual(reactionSemantics(before),reactionSemantics(proposed.reactions)); assert.deepEqual(before,original);
  assert.equal(planMotion(proposed.reactions,request(c),{authorized:true,ownership:'runtime'}).write,false);
});
test('STATE requires real same-family CHANGE_TO and never normalizes screen navigation', () => {
  for(const evidence of [{...stateEvidence,destinationSetId:'other'}, {...stateEvidence,destinationExists:false}]) assert.equal(resolveMotion({intent:'STATE',action:semanticCases[0].action,evidence}).support,'UNKNOWN');
  assert.equal(resolveMotion({intent:'STATE',action:semanticCases[1].action,evidence:runtimeEvidence}).support,'UNKNOWN');
});
test('canvas coordinates do not establish direction and uncertain spatial intent falls back', () => {
  const decision=resolveMotion({intent:'SPATIAL_NAVIGATION',action:semanticCases[1].action,evidence:{...runtimeEvidence,sourceX:100,destinationX:2200,spatialMeaning:true}});
  assert.equal(decision.token,'NAV_DEFAULT'); assert.ok(!('direction' in decision.transition));
  assert.equal(resolveMotion({intent:'NAVIGATION',action:semanticCases[1].action,evidence:{...runtimeEvidence,runtimeDestination:'true'}}).support,'UNKNOWN');
  assert.equal(resolveMotion({intent:'SPATIAL_NAVIGATION',action:semanticCases[1].action,evidence:{...runtimeEvidence,spatialMeaning:'yes',direction:'LEFT'}}).token,'NAV_DEFAULT');
});
test('SCROLL and non-NODE semantics cannot gain a transition through helpers', () => {
  assert.equal(resolveMotion({intent:'SCROLL',action:semanticCases[4].action}).transition,undefined);
  assert.equal(resolveMotion({intent:'SCROLL',action:semanticCases[4].action,evidence:{destinationExists:false}}).support,'UNKNOWN');
  for(const type of ['URL','BACK','CLOSE']) assert.equal(resolveMotion({intent:'NAVIGATION',action:{type,url:'https://example.test'},override:{type:'SMART_ANIMATE'}}).support,'LIMITED');
});
test('FEEDBACK uses existing state behavior; no reaction means prerequisite', () => {
  assert.equal(resolveMotion({intent:'FEEDBACK',action:semanticCases[0].action,evidence:stateEvidence}).token,'STATE_FAST');
  assert.equal(resolveMotion({intent:'FEEDBACK'}).support,'UNKNOWN');
});
for(const intent of ['ENTER','EXIT']) test(intent+': arbitrary elements limited; verified whole-screen representation supported', () => {
  assert.equal(resolveMotion({intent}).support,'LIMITED');
  assert.equal(resolveMotion({intent,action:semanticCases[1].action,evidence:runtimeEvidence}).support,'LIMITED');
  assert.equal(resolveMotion({intent,action:semanticCases[1].action,evidence:{...runtimeEvidence,representedIntent:intent}}).token,'NAV_DEFAULT');
  assert.equal(resolveMotion({intent,action:semanticCases[3].action,evidence:{...runtimeEvidence,representedIntent:intent}}).token,'OVERLAY_DEFAULT');
});
test('SHARED_ELEMENT preserves only verified existing continuity, never enables matching', () => {
  const action={...semanticCases[1].action,transition:{type:'SMART_ANIMATE',duration:0.3,easing:{type:'EASE_OUT'}}};
  assert.equal(resolveMotion({intent:'SHARED_ELEMENT',action,evidence:runtimeEvidence}).support,'LIMITED');
  const decision=resolveMotion({intent:'SHARED_ELEMENT',action,evidence:{...runtimeEvidence,sharedElementVerified:true}});
  assert.equal(decision.support,'PRESERVE'); assert.equal(decision.transition,undefined); assert.ok(!action.transition.matchLayers);
  assert.equal(resolveMotion({intent:'SHARED_ELEMENT',action:semanticCases[0].action,evidence:{...stateEvidence,destinationSetId:'other',sharedElementVerified:true}}).support,'LIMITED');
});
test('compatible explicit overrides honored; incompatible directional/URL/spring requests rejected', () => {
  const compatible=resolveMotion({intent:'SPATIAL_NAVIGATION',action:semanticCases[2].action,evidence:semanticCases[2].evidence,override:{type:'PUSH',duration:0.2,direction:'RIGHT'}});
  assert.equal(compatible.transition.direction,'RIGHT'); assert.equal(compatible.transition.matchLayers,false);
  assert.equal(resolveMotion({intent:'STATE',action:semanticCases[0].action,evidence:stateEvidence,override:{type:'SMART_ANIMATE'}}).transition.type,'SMART_ANIMATE');
  assert.equal(resolveMotion({intent:'NAVIGATION',action:semanticCases[1].action,evidence:runtimeEvidence,override:{type:'DISSOLVE',easing:{type:'LINEAR'}}}).transition.easing.type,'LINEAR');
  assert.equal(resolveMotion({intent:'NAVIGATION',action:semanticCases[1].action,evidence:runtimeEvidence,override:{easing:{type:'SPRING'}}}).support,'LIMITED');
  for(const override of [{type:'PUSH'}, {type:'SPRING'}, {type:'DISSOLVE',direction:'LEFT'}, {duration:-1}, {matchLayers:true}]) assert.equal(resolveMotion({intent:'NAVIGATION',action:semanticCases[1].action,evidence:runtimeEvidence,override}).support,'LIMITED');
});
test('float32 tolerances and custom supported duration read-back are idempotent', () => {
  for(const token of Object.values(motionTokens).filter(t=>t.type)) {
    const {tolerance,...expected}=token;
    for(const duration of [...tolerance,Math.fround(token.duration)]) assert.ok(transitionMatches({...expected,duration},expected));
    assert.ok(transitionMatches({...expected,duration:Math.fround(token.duration)},token));
    assert.equal(transitionMatches({...expected,duration:tolerance[1]+0.001},expected),false);
  }
  assert.ok(transitionMatches({type:'DISSOLVE',duration:Math.fround(0.23),easing:{type:'EASE_OUT'}},{type:'DISSOLVE',duration:0.23,easing:{type:'EASE_OUT'}}));
});
test('all non-transition properties retained; production, audit and invalid input never write', () => {
  const c=semanticCases[0], before=reaction({...c.action,preserveScrollPosition:true,resetScrollPosition:false,resetVideoPosition:true,extra:{keep:'exact'}});
  assert.equal(planMotion(before,request(c),{authorized:true,ownership:'production'}).write,false);
  const after=planMotion(before,request(c),{authorized:true,ownership:'states'}).reactions;
  assert.deepEqual(reactionSemantics(before),reactionSemantics(after));
  const altered=structuredClone(after);altered[0].trigger.keyCodes=[27];assert.notDeepEqual(reactionSemantics(before),reactionSemantics(altered));
  altered[0].trigger=before[0].trigger;altered[0].actions[0].destinationId='other';assert.notDeepEqual(reactionSemantics(before),reactionSemantics(altered));
  assert.throws(()=>planMotion([{action:c.action}],request(c)),/SKIP THE WRITE/);
  assert.throws(()=>planMotion(before,[...request(c),...request(c)]),/duplicate/);
});

test('deprecated action mirror retains all plural actions and transition-only semantics', () => {
  const c=semanticCases[0], before=reaction(c.action);before[0].action=structuredClone(before[0].actions[0]);
  const after=planMotion(before,request(c),{authorized:true,ownership:'states'});
  assert.equal(after.write,true);assert.equal(after.reactions[0].actions.length,2);
  assert.deepEqual(after.reactions[0].action,after.reactions[0].actions[0]);
  assert.deepEqual(reactionSemantics(before),reactionSemantics(after.reactions));
  assert.equal(planMotion(after.reactions,request(c),{authorized:true,ownership:'states'}).write,false);
  const uncertain=structuredClone(before);uncertain[0].action.destinationId='other';assert.throws(()=>planMotion(uncertain,request(c),{authorized:true,ownership:'states'}),/SKIP THE WRITE/);
});
test('known uncertain dependent-instance projection blocks a source transition proposal', () => {
  const c=semanticCases[0];
  const blocked=planMotion(reaction(c.action),[{...request(c)[0],evidence:{...c.evidence,sourceHasInstances:true}}],{authorized:true,ownership:'states'});
  assert.equal(blocked.write,false);assert.equal(blocked.findings[0].status,'UNKNOWN');
  const normalized=planMotion(reaction(c.action),request(c),{authorized:true,ownership:'states'}).reactions;
  const noOp=planMotion(normalized,[{...request(c)[0],evidence:{...c.evidence,sourceHasInstances:true}}],{authorized:true,ownership:'states'});
  assert.equal(noOp.write,false);assert.equal(noOp.findings[0].status,'MATCH');
});
test('manual command and shared rules retain immutability, no creation and audit boundaries', () => {
  for(const pattern of [/reaction count/,/trigger-specific fields/,/action count/,/destinationId/,/overlay position/,/SKIP THE WRITE/]) assert.match(command+'\n'+rules,pattern);
  for(const phrase of ['node creation','node deletion','node movement','restyling','all production nodes','new runtime reactions']) assert.ok(command.includes(phrase));
  assert.match(rules,/whether the user authorized changes or requested an audit[\s\S]*are read-only/);
  assert.match(rules,/Canvas XY positions are not navigation semantics/);
  assert.match(rules,/Never auto-enable matchLayers/);
  assert.match(command,/timeout|indeterminate/);
});
test('router and planner consume exactly the shared semantic policy', async () => {
  const contracts=await loadContracts(), motion=await loadMotionContract(contracts.motion), planner=await loadPlannerContract(contracts);
  assert.ok(motion.includes(motionPolicy));assert.ok(planner.includes(motionPolicy));
  assert.match(motionRoutingInstructions,/Add hover states remains states[\s\S]*whole app interactive remains prototype_planner/);
  assert.match(read('rules/figma-prototype-planner.md'),/Pass semantic intent[\s\S]*Do not rerun matching semantic tokens/);
  assert.match(read('rules/figma-prototype-planner.md'),/MOTION only when requested or supported/);
});
test('guard unchanged, 14 commands, no runtime/protocol imports or tool execution', () => {
  const guard=read('.opencode/plugins/figma-critique-guard.js');assert.equal(createHash('sha256').update(guard).digest('hex'),'520c8934b0fbc4a334d084596e3e5dd3f4e2aff41fe7ff5bf130e1515c9f11ed');
  assert.equal(readdirSync(new URL('../.opencode/commands/figma/',import.meta.url)).filter(n=>n.endsWith('.md')).length,14);
  assert.doesNotMatch(read('rules/figma-motion-semantics.mjs'),/fetch\(|execFile|writeFile|set_reactions|ctx\.mcp/);
  for(const path of ['docs/SOURCE_ALLOWLIST.json','docs/RELEASE_ALLOWLIST.json']) for(const name of ['rules/figma-motion-semantics.mjs','rules/figma-motion-semantics.md']) assert.ok(JSON.parse(read(path)).includes(name));
  assert.match(motionPolicy,/Reduced-motion-conscious authoring, not OS preference detection/);
  assert.match(motionPolicy,/No arbitrary timelines, keyframes, springs\/bounce, parallax, looping or scroll-driven animation/);
});

import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadContracts,loadPlannerContract,installIntentRouter,routingInstructions} from '../rules/figma-intent-router.mjs';
import {motionTokens,planMotion} from '../rules/figma-motion-semantics.mjs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8').replaceAll('\r\n','\n');
const rules=read('rules/figma-overlay-rules.md'),contracts=await loadContracts();
const fixture=JSON.parse(read('scripts/fixtures/overlay-capability.json'));
const planner=await loadPlannerContract(contracts);

test('one shared support model distinguishes modal, prepared overlay and native limits',()=>{
  assert.equal(fixture.status,'PASS');
  assert.deepEqual(fixture.support,{CENTERED_MODAL:'SUPPORTED',PRECONFIGURED_OVERLAY:'CONDITIONALLY_SUPPORTED',CONTEXTUAL_OVERLAY_REQUIRED:'FIGMA_LIMITED'});
  for(const [category,status]of Object.entries(fixture.support))assert.match(rules,new RegExp(category+'[^\\n]*'+status));
  assert.match(rules,/MCP_GAP: NONE[\s\S]*FIGMA_CAPABILITY_LIMIT/);
});
const checks=[
  ['readonly destination settings never written',/Preserve every readonly destination setting[\s\S]*no silent CENTER/i],
  ['outside-click requirement limited without native setting',/not CLOSE_ON_CLICK_OUTSIDE,[\s\S]*FIGMA_LIMITED: OUTSIDE_CLICK_CONFIGURATION/],
  ['dimming requirement limited without fake base alteration',/FIGMA_LIMITED: OVERLAY_BACKGROUND_CONFIGURATION[\s\S]*alter the base screen to fake dimming/],
  ['modal content not invented',/Never invent modal text, menu options or business[\s\S]*one focused question/],
  ['contextual request never silently centered',/No silent CENTER substitute for a contextual menu, dropdown, popover or tooltip/],
  ['relative vector requires preconfigured MANUAL',/only for a verified MANUAL destination[\s\S]*matching coordinate systems and verified by readback\/playback/],
  ['unsupported contextual writes skipped without retry loop',/zero placement writes and no rejection retry/],
  ['modal OPEN and CLOSE retain distinct native semantics',/NODE \+ OVERLAY[\s\S]*never NAVIGATE[\s\S]*\{type: CLOSE\}[\s\S]*no automatic BACK/],
  ['runtime ownership and semantic reuse required',/Production is strictly read-only[\s\S]*native overlay FRAMEs live inside it[\s\S]*Reuse an equivalent destination/],
  ['idempotence requires matching content and all reaction fields',/Repeating "Make sure this modal works"[\s\S]*zero[\s\S]*redundant writes when content, OPEN, CLOSE and motion already match/],
  ['complete arrays and unrelated behavior preserved',/Read complete arrays first[\s\S]*unrelated[\s\S]*actions\/triggers\/counts and destinations stay intact[\s\S]*Skip uncertain reconstruction/],
  ['motion authority and no redundant transition writes',/shared Semantic Motion registry's OVERLAY_DEFAULT[\s\S]*only after reactions exist[\s\S]*zero writes/],
  ['timeout is indeterminate and valid work preserved',/timeout[\s\S]*is indeterminate: reread and reconcile[\s\S]*retry only missing/],
  ['QA stays read-only and identifies wrong settings/context',/QA inspects[\s\S]*required CLOSE missing\/duplicated\/outside overlay context[\s\S]*inappropriate CENTER[\s\S]*never repair or normalize during QA/],
  ['V1.2.5 parked without stateful phase',/V1.2.5 remains HOLD: no SET_VARIABLE\/CONDITIONAL authoring or variable phase/],
  ['private setters, document patching and UI preparation forbidden',/Do not modify the runtime, invent a setter, write private Figma[\s\S]*properties\/document JSON, or automate Figma UI/],
];
for(const [name,pattern]of checks)test(name,()=>assert.match(rules,pattern));

test('interactive and QA share the policy; planner orders assembly before motion and terminal QA',()=>{
  for(const name of ['interactive','qa'])assert.ok(contracts[name].includes('rules/figma-overlay-rules.md'));
  assert.match(planner,/OVERLAY assembly is an INTERACTIVE subphase[\s\S]*FIGMA_LIMITED_CONTEXTUAL[\s\S]*Continue unrelated supported work[\s\S]*4\. MOTION[\s\S]*5\. QA always last/);
  assert.match(contracts.qa,/strictly read-only[\s\S]*never repair it/i);
  assert.match(contracts.interactive,/FIGMA_INTERACTIVE: BLOCKED[\s\S]*Use BLOCKED when the required requested core outcome[\s\S]*Optional limitations[\s\S]*WARN/);
});

for(const [text,intent,command]of [
  ['Open this existing details content as a modal.','working_interaction','interactive'],
  ['Make Close dismiss this modal.','working_interaction','interactive'],
  ['Make this avatar menu appear beside the avatar.','working_interaction','interactive'],
  ['Check whether the modal is wired correctly.','qa','qa'],
])test('canonical route expansion: '+text,async()=>{
  let hook;const ctx={storage:{get:async()=>false},session:{hook:async(_,h)=>{hook=h;},get:async()=>({agent:'figma-designer'}),context:async()=>[{type:'idle'}],generate:async()=>({text:JSON.stringify({intent,question:''})})}};
  await installIntentRouter(ctx);const event={sessionID:'overlay',prompt:{text}};await hook(event);
  assert.equal(event.metadata.figmaIntent,intent);
  assert.equal(event.prompt.text,contracts[command].replaceAll('$ARGUMENTS',()=>text));
  assert.match(routingInstructions,/Softer modal transitions stay motion; checking modal wiring stays qa/);
});

test('already normalized native OPEN produces zero motion writes and preserves CLOSE',()=>{
  const reactions=[structuredClone(fixture.open),structuredClone(fixture.close)],before=structuredClone(reactions);
  const requests=[{reactionIndex:0,actionIndex:0,intent:'OVERLAY',evidence:{runtimeDestination:true}}];
  const result=planMotion(reactions,requests,{authorized:true,ownership:'runtime'});
  assert.equal(result.write,false);assert.deepEqual(reactions,before);assert.deepEqual(result.reactions,before);
  assert.equal(motionTokens.OVERLAY_DEFAULT.type,'DISSOLVE');
});

test('shared policy is packaged and setup rejects a missing dependency',()=>{
  for(const file of ['docs/SOURCE_ALLOWLIST.json','docs/RELEASE_ALLOWLIST.json'])assert.ok(JSON.parse(read(file)).includes('rules/figma-overlay-rules.md'));
  assert.match(read('setup.ps1'),/rules\/figma-overlay-rules\.md/);
  assert.match(read('scripts/setup.test.ps1'),/missing-overlay-rules/);
});

test('no command, stateful feature, critique guard or approved runtime drift',()=>{
  assert.equal(readdirSync(new URL('../.opencode/commands/figma/',import.meta.url)).filter(n=>n.endsWith('.md')).length,14);
  assert.match(read('docs/STATEFUL_VARIABLES_V1_2_5.md'),/FIGMA_STATEFUL_VARIABLES: HOLD\s*$/);
  assert.equal(createHash('sha256').update(read('.opencode/plugins/figma-critique-guard.js')).digest('hex'),'2bc365e1f41d80cf9adab177847f6f4dd13000766455ac4150399a7690cb23dc');
  const approved=JSON.parse(read('docs/APPROVED_RUNTIME.json'));assert.equal(approved.releaseVersion,'v1.2.1-beta.2');
  assert.deepEqual(approved.sha256,{
    'bin/figma-mcp-go.exe':'bc9eec0d9a9cddd20e27331a41319a59b84bd51f88a78e59885b901456562f3f',
    'vendor/figma-mcp/plugin/dist/code.js':'273e20f56b80e9a7d995962948b1bb93e5cc1dfa19471ecd834ca7308d7da941',
    'vendor/figma-mcp/plugin/dist/index.html':'661fb49dd3ca38ed4648e70858822f59f565093718d02143c6b1b85628f054ee',
  });
  // Generated artifacts are absent from source archives; build/release jobs verify their bytes.
  for(const [file,hash]of Object.entries(approved.sha256)){
    const path=new URL('../'+file,import.meta.url);
    if(existsSync(path))assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),hash);
  }
});

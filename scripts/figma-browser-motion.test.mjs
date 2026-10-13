import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { browserMotion, browserMotionTokens, browserMotionManifest, validateBrowserMotion, parityLevels } from '../rules/figma-browser-motion.mjs';
import { motionTokens } from '../rules/figma-motion-semantics.mjs';
import { browserFixture, browserMotionCases, retainedScroll } from './fixtures/browser-motion.mjs';
import { sourceProjectionVersion } from './figma-browser-freshness.mjs';
import { sourceFingerprint } from './figma-browser-freshness.mjs';
import { normalizeSource } from './figma-live-source.mjs';
import { validateManifest } from './figma-browser-contract.mjs';
const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');
const byName = name => browserFixture(browserMotionCases.find(c => c.name === name));

test('six browser tokens consume canonical semantic registry without duration drift', () => {
  assert.equal(Object.keys(browserMotionTokens).length,6);
  for (const [name,token] of Object.entries(motionTokens)) assert.equal(browserMotionTokens[name].durationMs,token.duration*1000);
  assert.equal(browserMotionTokens.SCROLL_NATIVE.durationMs,0);
});
for (const example of browserMotionCases) test(`${example.name}: exact native-shaped evidence translates without mutation`, () => {
  const original = structuredClone(example), {manifest} = browserFixture(example), edge = manifest.interactions[0];
  assert.deepEqual(example,original); assert.deepEqual(edge.motion.native,example.transition);
  assert.ok(parityLevels.includes(edge.motion.parity)); assert.equal(validateManifest(manifest),false);
  if (example.name.startsWith('experimental')) assert.equal(edge.motion.parity,'NOT_IMPLEMENTED');
  else assert.ok(edge.motion.token);
});
test('STATE_FAST requires verified same family and preserves source styles rather than inventing states', () => {
  const i = byName('STATE_FAST').manifest.interactions[0];
  assert.equal(i.motion.token,'STATE_FAST'); assert.equal(i.motion.durationMs,100);
  assert.equal(browserMotion(i.nativeAction,{destinationExists:true}).parity,'NOT_IMPLEMENTED');
});
test('dissolve maps to NAV_DEFAULT while arbitrary Smart Animate does not', () => {
  assert.equal(byName('NAV_DEFAULT').manifest.interactions[0].motion.token,'NAV_DEFAULT');
  assert.equal(byName('experimental-smart').manifest.interactions[0].motion.kind,'immediate');
});
test('direction mapping uses transition direction, never canvas placement', () => {
  const i = byName('PUSH_LEFT').manifest.interactions[0];
  assert.deepEqual(browserMotion(i.nativeAction,{...i.motionEvidence,x:10000,y:-10000}),i.motion);
  assert.equal(byName('MOVE_IN_RIGHT').manifest.interactions[0].motion.parity,'NATIVE_REFERENCE_UNVERIFIED');
  assert.equal(byName('SLIDE_IN_LEFT').manifest.interactions[0].motion.parity,'PARTIAL');
});
test('centered overlay mapping is conditional on actual destination positioning', () => {
  const i = byName('OVERLAY_DEFAULT').manifest.interactions[0];
  assert.equal(i.motion.token,'OVERLAY_DEFAULT'); assert.equal(i.motion.parity,'BEHAVIORAL_PARITY');
  assert.equal(browserMotion(i.nativeAction,{...i.motionEvidence,overlayPositionType:'MANUAL'}).parity,'PARTIAL');
});
test('retained exact native SCROLL_ANIMATE maps to deterministic 200ms ease-out', () => {
  const i = byName('SCROLL_SMOOTH').manifest.interactions[0];
  assert.deepEqual(i.nativeAction.transition,retainedScroll.candidate.request[0].actions[0].transition);
  assert.equal(i.motion.durationMs,200); assert.equal(i.motion.easing,'ease-out');
  assert.equal(byName('SCROLL_NATIVE').manifest.interactions[0].motion.kind,'scroll-native');
  assert.equal(browserMotion(i.nativeAction,{destinationExists:true}).parity,'NOT_IMPLEMENTED');
});
test('float32 equivalent native durations preserve canonical mapping without new numbers', () => {
  const i = byName('NAV_DEFAULT').manifest.interactions[0]; i.nativeAction.transition.duration=Math.fround(.15);
  assert.equal(browserMotion(i.nativeAction,i.motionEvidence).token,'NAV_DEFAULT');
});
test('missing destination is limited, never invented', () => {
  const i = byName('NAV_DEFAULT').manifest.interactions[0];
  assert.equal(browserMotion(i.nativeAction,{}).parity,'NOT_IMPLEMENTED');
  const m = byName('NAV_DEFAULT').manifest; m.interactions[0].destinationId='missing'; assert.throws(() => validateManifest(m),/destinationId/);
});
test('missing captured state/overlay transitions never fabricate semantic defaults',()=>{
  for(const name of ['STATE_FAST','OVERLAY_DEFAULT']){const i=byName(name).manifest.interactions[0];assert.equal(browserMotion({...i.nativeAction,transition:null},i.motionEvidence).token,null);}
});
test('missing scroll transition or unsupported trigger cannot masquerade as supported motion',()=>{
  const i=byName('SCROLL_NATIVE').manifest.interactions[0];delete i.nativeAction.transition;assert.equal(browserMotion(i.nativeAction,i.motionEvidence).token,null);
  const m=byName('NAV_DEFAULT').manifest;m.interactions[0].trigger='AFTER_TIMEOUT';assert.throws(()=>validateBrowserMotion(m),/trigger/);
});
test('manifest rejects forged token values, descriptors and parity claims', () => {
  for (const mutate of [m=>m.motion.tokens.NAV_DEFAULT.durationMs++,m=>m.interactions[0].motion.parity='BEHAVIORAL_PARITY_FAKE',m=>m.motion.parity=[]]) {
    const m=byName('NAV_DEFAULT').manifest; mutate(m); assert.throws(()=>validateBrowserMotion(m),/Motion contract/);
  }
});
test('BACK/CLOSE have no manufactured transition', () => {
  for (const type of ['BACK','CLOSE']) {const d=browserMotion({type});assert.equal(d.native,null);assert.equal(d.durationMs,0);assert.equal(d.parity,'BEHAVIORAL_PARITY');}
});
test('experimental springs, matching layers, timed sequences and SWAP have no parity claim', () => {
  const i=byName('NAV_DEFAULT').manifest.interactions[0];
  for (const type of ['GENTLE','BOUNCY','CUSTOM_SPRING']) assert.equal(browserMotion({...i.nativeAction,transition:{...i.nativeAction.transition,easing:{type}}},i.motionEvidence).parity,'NOT_IMPLEMENTED');
  assert.equal(browserMotion({...i.nativeAction,navigation:'SWAP'},i.motionEvidence).parity,'NOT_IMPLEMENTED');
  assert.doesNotMatch(read('scripts/figma-browser-motion-runtime.mjs'),/AFTER_TIMEOUT|setInterval|matchLayers\s*=/);
});
test('full transition/source objects retain canonical freshness meaning', () => {
  const a=byName('PUSH_LEFT').manifest.interactions[0].nativeAction,b=structuredClone(a); b.transition.direction='RIGHT';
  assert.notDeepEqual(sourceFingerprint(normalizeSource(a)),sourceFingerprint(normalizeSource(b)));
  assert.equal(sourceProjectionVersion,'figma-browser-source-v1');
  assert.deepEqual(browserMotionManifest(byName('PUSH_LEFT').manifest.interactions).parity,byName('PUSH_LEFT').manifest.motion.parity);
});
test('runtime remains dependency-free, cancellable, immediate native scroll and reduced-motion conscious', () => {
  const runtime=read('scripts/figma-browser-motion-runtime.mjs');
  assert.match(runtime,/requestAnimationFrame/);assert.match(runtime,/cancelAnimationFrame/);assert.match(runtime,/behavior:'instant'/);
  assert.match(runtime,/prefers-reduced-motion: reduce/);assert.match(runtime,/scrollFinish/);assert.match(runtime,/history\.replaceState/);
  assert.doesNotMatch(runtime,/behavior:\s*['"]smooth|fetch\(|XMLHttpRequest|WebSocket|https?:\/\/|pushState/);
});
test('generation and browser test retain zero Figma writes and stable-source export contract', () => {
  for(const p of ['.opencode/commands/figma/browser.md','.opencode/commands/figma/browser-test.md'])assert.match(read(p),/Do not (?:call any Figma write tool|modify Figma)/);
  assert.match(read('.opencode/commands/figma/browser.md'),/begin/);assert.match(read('.opencode/commands/figma/browser.md'),/finish/);
  assert.doesNotMatch(read('scripts/figma-browser-motion-runtime.mjs')+read('scripts/figma-browser-motion-check.mjs'),/set_reactions|write_html|create_node/);
});
test('fourteen commands, stateful HOLD, critique guard and approved runtime hashes remain', () => {
  assert.equal(readdirSync(new URL('../.opencode/commands/figma',import.meta.url)).filter(n=>n.endsWith('.md')).length,14);
  assert.match(read('docs/STATEFUL_VARIABLES_V1_2_5.md'),/FIGMA_STATEFUL_VARIABLES: HOLD/);
  const approved=JSON.parse(read('docs/APPROVED_RUNTIME.json'));
  for(const [path,hash]of Object.entries(approved.sha256)){const url=new URL('../'+path,import.meta.url);if(existsSync(url))assert.equal(createHash('sha256').update(readFileSync(url)).digest('hex'),hash);}
  assert.equal(createHash('sha256').update(read('.opencode/plugins/figma-critique-guard.js')).digest('hex'),'2bc365e1f41d80cf9adab177847f6f4dd13000766455ac4150399a7690cb23dc');
  const live=JSON.parse(read('scripts/fixtures/browser-motion-live.json'));
  assert.equal(live.browserAcceptance,'PASS');assert.equal(live.sourceExportState,'STABLE');assert.equal(live.readCounts.figmaWrites,0);
  assert.equal(live.integrity.nodeCountBefore,live.integrity.nodeCountAfter);assert.deepEqual(live.integrity.before,live.integrity.after);
  assert.equal(live.motionResults.length,12);assert.ok(live.motionResults.every(r=>r.passed));
});

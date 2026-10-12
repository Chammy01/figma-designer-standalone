import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import guard, { critiqueMarker } from '../.opencode/plugins/figma-critique-guard.js';
import { loadContracts, loadPlannerContract, routingInstructions } from '../rules/figma-intent-router.mjs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const contracts = await loadContracts();
const planner = await loadPlannerContract(contracts);
const rules = read('rules/figma-prototype-planner.md');

test('planner carries exactly five complete canonical contracts, not a new command', () => {
  assert.equal(Object.keys(contracts).length, 14);
  assert.deepEqual([...planner.matchAll(/^CAPABILITY: (.+)$/gm)].map(m => m[1]), ['states', 'interactive', 'flow', 'motion', 'qa']);
  for (const name of ['states', 'interactive', 'flow', 'motion', 'qa']) assert.ok(planner.includes(contracts[name].replaceAll('$ARGUMENTS', "Use the planner's resolved user request, live targets and CURRENT PHASE scope only.")));
  for (const name of ['critique', 'browser', 'browser-test', 'design', 'revise']) assert.ok(!planner.includes(contracts[name].split('\n')[0]));
});

test('missing eligible contract prevents planner expansion', async () => {
  for (const name of ['states', 'interactive', 'flow', 'motion', 'qa']) await assert.rejects(loadPlannerContract({ ...contracts, [name]: undefined }), /Missing planner capability/);
});

test('planner loading failure stays inside routing catch, not guard installation', () => {
  const source = read('rules/figma-intent-router.mjs').split('export async function installIntentRouter(ctx)')[1];
  assert.doesNotMatch(source.split("await ctx.session.hook('prompt'")[0], /loadPlannerContract/);
  assert.match(source, /try \{[\s\S]*if \(route.intent === 'prototype_planner'\) planner = await loadPlannerContract\(contracts\);[\s\S]*catch[\s\S]*Fail closed/);
});

test('routing distinguishes broad authorization, narrow capabilities and ambiguity', () => {
  assert.match(routingInstructions, /prototype_planner: an explicitly authorized broad prototype outcome/);
  assert.match(routingInstructions, /one explicit navigation edge stays flow_wiring[\s\S]*dead controls stays qa/);
  assert.match(routingInstructions, /Make it work[\s\S]*context establishes[\s\S]*otherwise clarify/);
  assert.match(routingInstructions, /Enthusiasm, discussion and Make it better do not authorize/);
});

const invariants = [
  ['inventory precedes writes', /Inspect and plan before writing[\s\S]*interaction inventory[\s\S]*behavior\/prerequisite graph[\s\S]*Execute only necessary phases/],
  ['real source semantics and destinations', /intended\nbehavior with user\/source evidence[\s\S]*Never invent checkout/],
  ['ordinary clarification stops writes and retains conversation', /one focused question in ordinary chat[\s\S]*before authoring[\s\S]*Combine the original authorized[\s\S]*same conversation/],
  ['phase ownership never merges', /Never merge their\nwrite allowlists[\s\S]*CURRENT PHASE[\s\S]*exit checks before proceeding/],
  ['states precede runtime and motion follows wiring', /1\. STATES[\s\S]*2\. INTERACTIVE[\s\S]*3\. FLOW[\s\S]*4\. MOTION[\s\S]*5\. QA/],
  ['no duplicate runtime builders', /Do not run both builders\n\s*blindly[\s\S]*reuse completed screens\/edges/],
  ['motion needs evidence and preserves semantics', /MOTION only when requested or supported[\s\S]*preserve complete non-transition\n\s*semantics\/counts/],
  ['QA is terminal and read-only', /QA always last[\s\S]*No repairs during QA[\s\S]*no automatic loop back/],
  ['timeout recovery remains bounded', /timeout is indeterminate[\s\S]*retry only confirmed missing work[\s\S]*combine_as_variants again/],
  ['actual component source and ordering verified', /INSTANCE source COMPONENT[\s\S]*componentSetId[\s\S]*true Auto Layout order/],
  ['production and duplicates verified at end', /unchanged\nproduction[\s\S]*no duplicate\nfamilies\/screens\/controls\/equivalent reactions/],
  ['plan-only never claims executed success', /plan-only request[\s\S]*zero writes and no execution PASS claim/],
  ['plan-only omits ambiguous status examples', /omit all FIGMA_PROTOTYPE_PLANNER status lines, even negated/],
  ['undefined optional controls do not inflate prerequisites', /Undefined optional behavior is not BROKEN[\s\S]*do not manufacture a prerequisite/],
  ['future capabilities are excluded', /No new commands[\s\S]*variable architecture, conditional logic, richer overlay[\s\S]*timeline\/keyframe engine or browser parity/],
  ['critique cannot be activated or bypassed', /Do not invoke \/figma\/critique, reset its storage[\s\S]*queued\/steering[\s\S]*fresh-idle request lifecycle/],
  ['truthful status includes warnings and blocked dependencies', /QA passed[\s\S]*WARN[\s\S]*BLOCKED[\s\S]*FAIL[\s\S]*Planning alone is not execution success/],
  ['executed specialist status markers are preserved', /exact applicable canonical status marker[\s\S]*FIGMA_INTERFACE_QA: PASS\/WARN\/FAIL[\s\S]*Skipped phases get no success marker/],
];
for (const [name, pattern] of invariants) test(name, () => assert.match(rules, pattern));

test('planner dependency is packaged and checked before startup', () => {
  for (const file of ['docs/SOURCE_ALLOWLIST.json', 'docs/RELEASE_ALLOWLIST.json']) assert.ok(JSON.parse(read(file)).includes('rules/figma-prototype-planner.md'));
  assert.ok(JSON.parse(read('docs/RELEASE_ALLOWLIST.json')).includes('docs/PROTOTYPE_PLANNER_V1_2_3_3.md'));
  assert.match(read('setup.ps1'), /rules\/figma-prototype-planner\.md/);
  assert.match(read('scripts/setup.test.ps1'), /Missing planner contract must fail before startup/);
});

test('planner cannot unlock a queued critique; fresh idle request uses normal lifecycle', async () => {
  const hooks = {}, storage = new Map(), messages = [{ type: 'idle' }]; let generations = 0;
  const register = async (n, cb) => (hooks[n] ??= []).push(cb);
  const ctx = { storage: { get: async k => storage.get(k), set: async (k, v) => storage.set(k, v), remove: async k => storage.delete(k) },
    session: { hook: register, get: async () => ({ agent: 'figma-designer' }), context: async () => messages,
      generate: async () => { generations++; return { text: '{"intent":"prototype_planner"}' }; } },
    tool: { transform: async () => {}, hook: register }, permission: { hook: async (n, cb) => register('permission.' + n, cb) } };
  await guard.setup(ctx);
  const prompt = async text => { const event = { sessionID: 'planner', prompt: { text } }; for (const cb of hooks.prompt) await cb(event); return event; };
  await prompt(critiqueMarker);
  messages.push({ type: 'assistant' });
  const text = 'Make this app interactive with states and navigation.';
  assert.equal((await prompt(text)).prompt.text, text);
  assert.equal(generations, 0);
  for (const cb of hooks['execute.before']) await assert.rejects(cb({ sessionID: 'planner', tool: 'execute' }), /READ_ONLY/);
  messages.push({ type: 'idle' });
  const event = await prompt(text);
  assert.equal(event.metadata.figmaIntent, 'prototype_planner');
  assert.ok(event.prompt.text.startsWith(rules.trim()));
  assert.equal(storage.has('critique-read-only:planner'), false);
});

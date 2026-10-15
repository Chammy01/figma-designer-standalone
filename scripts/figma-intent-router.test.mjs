import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import guard, { critiqueMarker } from '../.opencode/plugins/figma-critique-guard.js';
import { loadContracts, loadPlannerContract, loadMotionContract, routingInstructions } from '../rules/figma-intent-router.mjs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const fixtures = JSON.parse(read('scripts/fixtures/intent-router.json'));
const contracts = await loadContracts();
const rules = read('rules/figma-standalone-rules.md');

async function harness(route, { agent = 'figma-designer', messages = [{ type: 'idle' }], metadataError, contextError } = {}) {
  const hooks = {}, storage = new Map(); let generations = 0;
  const register = async (name, callback) => (hooks[name] ??= []).push(callback);
  const ctx = {
    storage: { get: async k => storage.get(k), set: async (k, v) => storage.set(k, v), remove: async k => storage.delete(k) },
    session: { hook: register, get: async () => { if (metadataError) throw metadataError; return { agent }; }, context: async () => { if (contextError) throw contextError; return messages; },
      generate: async input => { generations++; assert.match(input.prompt, /never keywords alone/); if (route instanceof Error) throw route; return { text: typeof route === 'string' ? route : JSON.stringify(route) }; } },
    tool: { transform: async () => {}, hook: register },
    permission: { hook: async (n, cb) => register('permission.' + n, cb) },
  };
  await guard.setup(ctx);
  return { storage, messages, generations: () => generations,
    run: async (name, event) => { for (const hook of hooks[name] ?? []) await hook(event); },
    prompt: async text => { const event = { sessionID: 'test', prompt: { text } }; for (const hook of hooks.prompt) await hook(event); return event; },
  };
}

for (const fixture of fixtures) test(`${fixture.id}: selected route reuses canonical ownership contract`, async () => {
  const h = await harness({ intent: fixture.intent, question: fixture.question ?? '' });
  const event = await h.prompt(fixture.prompt);
  assert.equal(event.metadata.figmaIntent, fixture.intent);
  if (fixture.command) assert.equal(event.prompt.text, (fixture.command === 'motion' ? await loadMotionContract(contracts.motion) : contracts[fixture.command]).replaceAll('$ARGUMENTS', () => fixture.prompt));
  else if (fixture.intent === 'prototype_planner') assert.equal(event.prompt.text, await loadPlannerContract(contracts) + '\n\nUSER REQUEST\n' + fixture.prompt);
  else if (fixture.intent === 'continue') assert.equal(event.prompt.text, fixture.prompt);
  else { assert.match(event.prompt.text, /No Figma or filesystem writes/); if (fixture.question) { assert.ok(event.prompt.text.includes(fixture.question)); assert.match(event.prompt.text, /ordinary chat[\s\S]*Do not call the question tool[\s\S]*End this turn[\s\S]*plain reply/); } }
  assert.equal(h.storage.has('critique-read-only:test'), fixture.command === 'critique');
});

test('critique expansion arms existing guard before tools and preserves visible schemas', async () => {
  const h = await harness({ intent: 'design_critique' });
  await h.prompt('Review this design.');
  const tools = Object.freeze({ execute: {}, figma_write_html: {}, figma_critique_get_node: {} });
  const event = { sessionID: 'test', system: [], tools };
  await h.run('context', event);
  assert.equal(event.tools, tools);
  assert.match(event.system[0].text, /FIGMA_CRITIQUE_GUARD: ACTIVE/);
  for (const tool of ['execute', 'shell', 'figma_write_html', 'figma_set_reactions']) await assert.rejects(h.run('execute.before', { sessionID: 'test', tool }), /READ_ONLY/);
  await h.run('execute.before', { sessionID: 'test', tool: 'figma_critique_get_node' });
});

test('queued authoring cannot unlock critique; a new idle request selects a bounded revision', async () => {
  const h = await harness({ intent: 'production_revision' });
  await h.prompt(critiqueMarker);
  h.messages.push({ type: 'assistant', content: [] });
  const before = h.generations();
  assert.equal((await h.prompt('Now make the hero shorter.')).prompt.text, 'Now make the hero shorter.');
  assert.equal(h.generations(), before);
  await assert.rejects(h.run('execute.before', { sessionID: 'test', tool: 'figma_update_node_props' }), /READ_ONLY/);
  h.messages.push({ type: 'idle' });
  const next = await h.prompt('Make the hero shorter.');
  assert.ok(next.prompt.text.startsWith(contracts.revise.split('\n')[0]));
  assert.equal(h.storage.has('critique-read-only:test'), false);
});

test('every direct specialist command bypasses routing unchanged, including CRLF', async () => {
  const h = await harness(new Error('Must not call classifier'));
  for (const body of Object.values(contracts)) for (const text of [body, body.replaceAll('\n', '\r\n')]) assert.equal((await h.prompt(text)).prompt.text, text);
  assert.equal(h.generations(), 0);
  assert.equal(Object.keys(contracts).length, 14);
});

test('other agents are not routed and literal argument replacement cannot alter user copy', async () => {
  const other = await harness(new Error('Must not classify'), { agent: 'web-designer' });
  assert.equal((await other.prompt('Explain this.')).prompt.text, 'Explain this.');
  const h = await harness({ intent: 'production_revision' });
  const text = "Change heading to literal $& $' $$ $ARGUMENTS.";
  assert.equal((await h.prompt(text)).prompt.text, contracts.revise.replaceAll('$ARGUMENTS', () => text));
});

test('an exact JSON fence is accepted without extracting JSON from arbitrary prose', async () => {
  const h = await harness('```json\n{"intent":"prototype_planner"}\n```');
  assert.equal((await h.prompt('Make this whole app interactive.')).metadata.figmaIntent, 'prototype_planner');
  const prose = await harness('Result:\n{"intent":"prototype_planner"}');
  assert.ok((await prose.prompt('Make this app interactive.')).prompt.text.startsWith(critiqueMarker));
});

for (const output of [new Error('Provider unavailable'), '', '```json\n{}\n```', '{"intent":"unknown"}', '{"intent":"clarify"}']) test(`invalid routing response fails closed: ${String(output)}`, async () => {
  const h = await harness(output); const event = await h.prompt('Make it better.');
  assert.ok(event.prompt.text.startsWith(critiqueMarker));
  assert.match(event.prompt.text, /Routing unavailable[\s\S]*BLOCKED/);
  await assert.rejects(h.run('execute.before', { sessionID: 'test', tool: 'execute' }), /READ_ONLY/);
});

for (const key of ['metadataError', 'contextError']) test(`${key}: failed session lookup cannot leave an unguarded prompt`, async () => {
  const h = await harness({ intent: 'production_revision' }, { [key]: new Error('Session lookup unavailable') });
  const event = await h.prompt('Make the hero shorter.');
  assert.ok(event.prompt.text.startsWith(critiqueMarker));
  assert.equal(h.generations(), 0);
  await assert.rejects(h.run('execute.before', { sessionID: 'test', tool: 'execute' }), /READ_ONLY/);
});

const invariants = [
  ['revision does not restart briefing', /local revision does\nnot restart briefing/],
  ['new design can enter adaptive briefing', /new vague screen may enter design and adaptive briefing/],
  ['QA remains distinct and read-only', /Correctly built\/wired\? Strictly read-only; not an aesthetic review/],
  ['states preserve production', /Production read-only; canonical component-state library writes only/],
  ['flow does not invent missing destinations', /Flows with missing destinations report them; never invent screens or product logic/],
  ['motion does not invent reactions', /Motion with no eligible reactions reports the state\/interaction prerequisite/],
  ['recent context resolves pronouns with live reinspection', /This\/it[\s\S]*recent[\s\S]*re-inspect IDs from the live/],
  ['stale targets are not guessed', /Missing\/stale targets require reinspection, not guessed replacements/],
  ['ambiguity never merges ownership zones', /Ownership always overrides[\s\S]*one sentence does not merge writable zones/],
  ['information explains without authoring', /capability questions explain\nwithout authoring/],
  ['browser test cannot silently generate missing artifacts', /no generation unless separately requested; report missing artifacts/],
  ['multi-capability work uses bounded planner', /Select one narrow workflow unless[\s\S]*PROTOTYPE_PLANNER[\s\S]*do not invent product logic/],
];
for (const [name, pattern] of invariants) test(name, () => assert.match(rules, pattern));

test('existing critique enforcement source is unchanged except its pre-routing integration', () => {
  const source = read('.opencode/plugins/figma-critique-guard.js')
    .replace("import { installIntentRouter } from '../../rules/figma-intent-router.mjs';\n", '')
    .replace('    await installIntentRouter(ctx);\n', '')
    .replace("  'get_operation_receipt', 'get_document_revision',\n", '');
  assert.equal(createHash('sha256').update(source).digest('hex'), '884fc738f8464cfc4c9a6d3ddfe16579b58662517bfca2f9023d96e28bb2bfaf');
  assert.match(routingInstructions, /production_revision[\s\S]*design_critique[\s\S]*browser_test/);
});

test('source/release/setup enumerate the routing dependency without adding commands or MCP', () => {
  for (const manifest of ['docs/SOURCE_ALLOWLIST.json', 'docs/RELEASE_ALLOWLIST.json']) assert.ok(JSON.parse(read(manifest)).includes('rules/figma-intent-router.mjs'));
  assert.match(read('setup.ps1'), /rules\/figma-intent-router\.mjs/);
  assert.doesNotMatch(read('rules/figma-intent-router.mjs'), /fetch\(|ctx\.tool\.transform|ctx\.mcp|ctx\.session\.command/);
});

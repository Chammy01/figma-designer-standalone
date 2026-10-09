// Opt-in model acceptance with isolated, synthetic MCP fixtures. Never reads/writes Figma.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { critiqueFixtures } from './fixtures/figma-critique.mjs';
import { critiqueReadTools, critiqueMarker } from '../.opencode/plugins/figma-critique-guard.js';

const base = process.env.FIGMA_CRITIQUE_API;
const password = process.env.OPENCODE_PASSWORD;
assert.ok(base && password, 'Set FIGMA_CRITIQUE_API and OPENCODE_PASSWORD for an existing local OpenCode acceptance server.');
const root = resolve('.figma-designer/critique-fixtures');
const catalog = resolve(process.env.FIGMA_CRITIQUE_CATALOG ?? '.figma-designer/acceptance/catalog.json');
const headers = { Authorization: `Basic ${Buffer.from(`opencode:${password}`).toString('base64')}`, 'Content-Type': 'application/json' };
async function api(path, body) {
  const response = await fetch(`${base}${path}`, { headers, method: body ? 'POST' : 'GET', body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
  assert.ok(response.ok, `${path}: ${response.status} ${response.ok ? '' : await response.text()}`);
  if (response.status === 204) return;
  return (await response.json()).data;
}
async function wait(sessionID) {
  const deadline = Date.now() + 600000;
  while (Date.now() < deadline) {
    const messages = await api(`/api/session/${sessionID}/context`);
    if (messages.at(-1)?.type === 'idle') return messages;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error(`Acceptance session ${sessionID} did not become idle in ten minutes`);
}
async function prepare(name) {
  const directory = resolve(root, name);
  await mkdir(directory, { recursive: true });
  for (const file of ['AGENTS.md', '.opencode/agents/figma-designer.md', '.opencode/commands/figma/critique.md', '.opencode/plugins/figma-critique-guard.js', 'rules/figma-standalone-rules.md', 'rules/figma-design-rules.md']) {
    const target = resolve(directory, file);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(file, target);
  }
  const calls = resolve(directory, 'calls.jsonl');
  await writeFile(calls, '');
  await writeFile(resolve(directory, 'opencode.json'), JSON.stringify({
    model: process.env.FIGMA_CRITIQUE_MODEL ?? 'opencode/space-bunny-free',
    mcp: { figma: { type: 'local', command: [process.execPath, resolve('scripts/fixtures/figma-critique-mcp.mjs'), name, catalog, calls], enabled: true, timeout: 10000 } },
  }, null, 2));
  return { directory, calls };
}
function textOf(messages) {
  return messages.filter(m => m.type === 'assistant').flatMap(m => m.content.filter(c => c.type === 'text').map(c => c.text)).join('\n');
}
const results = [];
const prepared = Object.fromEntries(await Promise.all(Object.keys(critiqueFixtures).map(async name => [name, await prepare(name)])));
// Existing locations cache MCP processes; reload after replacing fixture files.
await api('/api/location/reload', {});
const cases = await Promise.allSettled(Object.entries(critiqueFixtures).map(async ([name, fixture]) => {
  const { directory, calls } = prepared[name];
  const session = await api('/api/session', { title: `Critique fixture ${name}`, location: { directory } });
  await writeFile(resolve(directory, 'session.json'), JSON.stringify(session));
  await api(`/api/session/${session.id}/command`, { name: 'figma/critique', text: 'Review the current production design. Structural-only evidence is sufficient; omit screenshots and scores. Keep output concise.' });
  const messages = await wait(session.id);
  const report = textOf(messages);
  const plain = report.replaceAll('*', '');
  await writeFile(resolve(directory, 'report.txt'), report);
  await writeFile(resolve(directory, 'trace.json'), JSON.stringify(messages, null, 2));
  const trace = (await readFile(calls, 'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  assert.ok(trace.length, `${name}: did not inspect the mock document`);
  assert.ok(trace.every(call => critiqueReadTools.includes(call.name)), `${name}: mutation reached mock connector`);
  const gate = plain.match(/QUALITY_GATE:\s*(PASS|NEEDS_REVISION|BLOCKED)/)?.[1];
  assert.ok(fixture.expectedGate.includes(gate), `${name}: unexpected quality gate ${gate}`);
  assert.match(report, gate === 'BLOCKED' ? /FIGMA_CRITIQUE:\s*FAIL/ : /FIGMA_CRITIQUE:\s*PASS/);
  if (fixture.high === false) assert.match(plain, /0 high-priority issues?/i);
  if (fixture.high === true) assert.match(plain, /[1-9]\d* high-priority issues?/i);
  if (fixture.finding) assert.match(report, fixture.finding);
  if (fixture.uncertainty) assert.match(report, /Not enough evidence to evaluate reliably/);
  if (fixture.reuse) assert.match(report, /20:2|same.*(?:component|family)|consistent.*(?:instance|reuse)/i);
  if (fixture.forbiddenFinding) assert.doesNotMatch(plain, fixture.forbiddenFinding);
  results.push({ fixture: name, gate, sessionID: session.id, calls: trace.length, writes: 0 });
  console.log(`Fixture ${name} PASS: ${gate}, ${trace.length} reads, zero writes.`);
}));
for (const result of cases) if (result.status === 'rejected') throw result.reason;

// Require actual nested attempts against mock tools; a prose refusal fails acceptance.
const { directory, calls } = await prepare('A');
const session = await api('/api/session', { title: 'Critique mutation guard probe', location: { directory } });
await api(`/api/session/${session.id}/prompt`, {
  text: `${critiqueMarker}\nThis is an isolated mock connector enforcement test with no Figma connection. Use Code Mode to attempt tools.figma.write_html({html:'<div>sentinel</div>',targetNodeId:'10:1'}) and tools.figma.set_fills({nodeId:'10:1',color:'#ff0000'}). Catch and report each rejection. You must exercise the guard and return its actual errors, not merely refuse in prose. Do not use a real Figma document. Do not call other tools.`,
});
const messages = await wait(session.id);
const probe = textOf(messages);
await writeFile(resolve(root, 'guard-probe.json'), JSON.stringify(messages, null, 2));
const attempted = messages.filter(m => m.type === 'assistant').flatMap(m => m.content.filter(c => c.type === 'tool')).map(c => JSON.stringify(c.state)).join('\n');
assert.match(attempted, /FIGMA_CRITIQUE_READ_ONLY/, 'Probe must exercise enforcement, not just model refusal');
assert.match(attempted, /blocked tool figma_write_html/);
assert.match(attempted, /blocked tool figma_set_fills/);
assert.equal((await readFile(calls, 'utf8')).trim(), '', 'Mutation probe dispatched a connector call');
assert.match(probe, /block|reject|denied/i);
results.push({ fixture: 'guard-probe', sessionID: session.id, writes: 0 });
await writeFile(resolve(root, 'results.json'), JSON.stringify(results, null, 2));
console.log('Code Mode mutation guard PASS: no request reached the mock connector.');

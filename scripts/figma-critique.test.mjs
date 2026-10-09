import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import guard, { critiqueMarker, critiqueReadTools, isCritiqueReadTool } from '../.opencode/plugins/figma-critique-guard.js';
import { critiqueFixtures } from './fixtures/figma-critique.mjs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const command = read('.opencode/commands/figma/critique.md');

test('critique exists, selects the existing agent, and requires read-only enforcement', () => {
  assert.match(command, /^---\r?\n[\s\S]*?agent: figma-designer\r?\nsubagent: false\r?\n---/);
  assert.ok(command.includes(critiqueMarker));
  for (const text of ['Do not modify Figma.', 'strictly read-only', 'FIGMA_CRITIQUE_GUARD: ACTIVE', 'before/after', 'SOURCE_CHANGED_DURING_CRITIQUE']) assert.ok(command.includes(text), text);
  assert.doesNotMatch(command, /!`|\b(write_html|patch_html|update_node_props|set_reactions|remove_reactions|combine_as_variants|create_component|delete_node|execute_code)\b/);
  assert.match(command, /Recommendations are report text only; never execute/);
  assert.match(command, /Do not generate browser output/);
});

test('report contract requires priorities, actionable evidence, strengths and honest uncertainty', () => {
  for (const text of ['HIGH PRIORITY', 'MEDIUM PRIORITY', 'LOW PRIORITY', 'Problem:', 'Why it matters:', 'Recommendation:', 'Evidence:', 'STRENGTHS', 'SUMMARY', 'QUALITY_GATE:', 'FIGMA_CRITIQUE:', 'Not enough evidence to evaluate reliably.', 'Suppress vague filler and unsupported praise', 'Do not invent issues', 'Severity describes impact, not confidence']) assert.ok(command.includes(text), text);
  for (const dimension of ['Visual hierarchy', 'Composition', 'Spacing & rhythm', 'Typography', 'Color & contrast', 'Consistency', 'Component reuse', 'Affordance', 'CTA clarity', 'Content density', 'Section rhythm', 'Readability', 'Alignment', 'Responsive/frame risks', 'Visual repetition']) assert.ok(command.includes(`| ${dimension} |`), dimension);
  assert.match(command, /scores are secondary/);
  assert.match(command, /missing screenshot[\s\S]*alone does not block/);
  assert.match(command, /never claim responsive testing/);
  assert.match(command, /get_document globalVars style references/);
  assert.match(command, /An observed difference is not automatically a defect/);
  assert.match(command, /Missing prototype intent belongs in\ncoverage, not an issue/);
  assert.match(command, /requiring cards or numbered nodes/);
});

test('every allowed MCP read is registered; every other tool including future tools is denied', () => {
  const catalogSource = ['tools_read_document.go', 'tools_read_styles.go', 'tools_read_export.go', 'tools_edit.go', 'tools_layout.go', 'tools_diagnostics.go', 'tools_validation.go'].map(file => read(`vendor/figma-mcp/internal/${file}`)).join('\n');
  for (const name of critiqueReadTools) {
    assert.ok(catalogSource.includes(`"${name}"`), name);
    assert.equal(isCritiqueReadTool(`figma_${name}`), true);
    assert.ok(command.includes(name), name);
  }
  for (const name of ['figma_write_html', 'figma_patch_html', 'figma_set_fills', 'figma_set_reactions', 'figma_remove_reactions', 'figma_combine_as_variants', 'figma_set_selection', 'figma_set_viewport', 'figma_future_tool', 'other_get_node', 'bash', 'shell', 'task', 'skill', 'write', 'edit', 'apply_patch', 'webfetch', 'custom_script']) assert.equal(isCritiqueReadTool(name), false, name);
});

async function harness(storage = new Map(), messages = []) {
  const hooks = {};
  const ctx = {
    storage: { get: async key => storage.get(key), set: async (key, value) => storage.set(key, value), remove: async key => storage.delete(key) },
    session: { hook: async (name, callback) => { hooks[name] = callback; }, context: async () => messages },
    tool: { hook: async (name, callback) => { hooks[name] = callback; } },
    permission: { hook: async (name, callback) => { hooks[`permission.${name}`] = callback; } },
  };
  await guard.setup(ctx);
  return { hooks, messages, storage };
}

test('guard blocks writes before execution, allows reads, and isolates sessions', async () => {
  const { hooks } = await harness();
  await hooks.prompt({ sessionID: 'review', prompt: { text: critiqueMarker } });
  const event = { sessionID: 'review', system: [], tools: { figma_get_node: {}, execute: {}, figma_write_html: {}, bash: {}, task: {} } };
  await hooks.context(event);
  assert.deepEqual(Object.keys(event.tools), ['figma_get_node', 'execute']);
  assert.match(event.system[0].text, /FIGMA_CRITIQUE_GUARD: ACTIVE/);
  assert.match(event.system[0].text, /same CTA repeated across separate sections/);
  assert.match(event.system[0].text, /outside priorities/);
  await assert.rejects(hooks['execute.before']({ sessionID: 'review', tool: 'figma_write_html' }), /FIGMA_CRITIQUE_READ_ONLY/);
  await assert.rejects(hooks['execute.before']({ sessionID: 'review', tool: 'bash' }), /blocked tool/);
  await hooks['execute.before']({ sessionID: 'review', tool: 'figma_get_node' });
  await hooks['execute.before']({ sessionID: 'review', tool: 'execute' });
  const permission = { sessionID: 'review', action: 'figma_write_html', effect: 'allow' };
  await hooks['permission.evaluate'](permission);
  assert.equal(permission.effect, 'deny');
  await hooks['execute.before']({ sessionID: 'other', tool: 'figma_write_html' });
});

test('guard survives steering, queued work, compaction and reload; only an idle boundary unlocks it', async () => {
  const first = await harness();
  await first.hooks.prompt({ sessionID: 'review', prompt: { text: critiqueMarker } });
  first.messages.push({ type: 'user' }, { type: 'assistant' });
  await first.hooks.prompt({ sessionID: 'review', delivery: 'queue', prompt: { text: 'Now change the CTA' } });
  const reloaded = await harness(first.storage, [{ type: 'compaction' }]);
  await assert.rejects(reloaded.hooks['execute.before']({ sessionID: 'review', tool: 'figma_set_fill' }), /READ_ONLY/);
  reloaded.messages.push({ type: 'idle' });
  await reloaded.hooks.prompt({ sessionID: 'review', prompt: { text: 'Start a new design task' } });
  await reloaded.hooks['execute.before']({ sessionID: 'review', tool: 'figma_set_fill' });
});

test('guard failures stop execution instead of silently granting writes', async () => {
  const { hooks, storage } = await harness();
  await hooks.prompt({ sessionID: 'review', prompt: { text: critiqueMarker } });
  storage.get = () => { throw new Error('storage unavailable'); };
  await assert.rejects(hooks['execute.before']({ sessionID: 'review', tool: 'figma_write_html' }), /storage unavailable/);
});

test('setup, both distribution allowlists and release validation include command and guard', () => {
  const required = ['.opencode/commands/figma/critique.md', '.opencode/plugins/figma-critique-guard.js'];
  for (const file of ['docs/RELEASE_ALLOWLIST.json', 'docs/SOURCE_ALLOWLIST.json']) {
    const files = JSON.parse(read(file));
    for (const path of required) assert.ok(files.includes(path), `${file}: ${path}`);
  }
  assert.match(read('setup.ps1'), /'critique'/);
  assert.ok(read('setup.ps1').includes(required[1]));
  assert.match(read('scripts/release-check.ps1'), /'critique'/);
  assert.ok(read('scripts/setup.test.ps1').includes(required[1]));
  assert.match(read('scripts/setup.test.ps1'), /missing-critique/);
  assert.ok(JSON.parse(read('package.json')).scripts.test.includes('scripts/figma-critique.test.mjs'));
  assert.match(read('README.md'), /`\/figma\/critique` \| Review the current design and identify prioritized quality issues\./);
});

test('A–E structural fixtures have real IDs, comparable properties and justified expectations', () => {
  assert.deepEqual(Object.keys(critiqueFixtures), ['A', 'B', 'C', 'D', 'E']);
  for (const fixture of Object.values(critiqueFixtures)) {
    const ids = new Set();
    function walk(node) {
      assert.ok(!ids.has(node.id), `duplicate fixture ID ${node.id}`);
      ids.add(node.id);
      assert.ok(node.name && node.type);
      if (node.type !== 'PAGE') for (const value of Object.values(node.bounds)) assert.ok(Number.isFinite(value));
      for (const child of node.children ?? []) walk(child);
    }
    walk(fixture.document);
  }
  assert.equal(critiqueFixtures.C.document.children.length, 0);
  const good = critiqueFixtures.A.document.children[0];
  assert.equal(good.children[0].bounds.x, (good.bounds.width - good.children[0].bounds.width) / 2);
  const controls = critiqueFixtures.B.document.children[0].children[0].children.slice(2);
  assert.ok(controls[1].bounds.width > controls[0].bounds.width);
  const repeated = critiqueFixtures.D.document.children[0].children.slice(1);
  assert.equal(repeated.length, 3);
  assert.ok(repeated.every(section => section.children[1].children.length === 3));
  const instances = [];
  function walk(node) { if (node.type === 'INSTANCE') instances.push(node); for (const child of node.children ?? []) walk(child); }
  walk(critiqueFixtures.E.document);
  assert.equal(instances.length, 2);
  assert.equal(new Set(instances.map(node => node.mainComponentId)).size, 1);
  assert.ok(instances.every(node => node.bounds.x === 24));
});

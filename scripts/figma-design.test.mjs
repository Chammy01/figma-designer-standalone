import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const command = read('.opencode/commands/figma/design.md');
const rules = read('rules/figma-design-rules.md');
const agent = read('.opencode/agents/figma-designer.md');
const contract = `${command}\n${rules}\n${agent}`;
const fixtures = JSON.parse(read('scripts/fixtures/design-v2.json'));

test('existing design command selects the agent and plans ordered passes before authoring', () => {
  assert.match(command, /agent: figma-designer\nsubagent: false/);
  assert.match(command, /Before any authoring write, complete passes 1–6/);
  const stages = ['Brief interpretation', 'Information architecture', 'Art direction', 'Composition and section rhythm', 'Typography system', 'Color, surface and spacing system', 'Native authoring and justified reuse', 'Anti-generic draft check', 'Internal quality inspection', 'One focused polish and final verification'];
  let previous = -1;
  stages.forEach((name, i) => { const at = rules.indexOf(`### Pass ${i + 1} — ${name}`); assert.ok(at > previous, name); previous = at; });
  assert.match(command, /FIGMA_DESIGN: PASS/);
  assert.match(command, /FIGMA_DESIGN_V2: PASS/);
  assert.match(agent, /follow the ordered Design V2 passes/);
});

test('brief fidelity, content truth and art direction override a universal house style', () => {
  for (const phrase of ['user brief overrides default aesthetic preferences', 'not mandatory templates', 'minimal beige SaaS', 'marketing page with a giant hero', 'icon-card grids', 'audience only if stated or strongly', 'No fabricated awards', 'placeholder/sample content', 'truthful\nimage placeholders']) assert.ok(rules.includes(phrase), phrase);
  for (const style of ['coffee shop', 'Editorial portfolio', 'dashboard', 'Playful learning app', 'Luxury hospitality', 'Utilitarian internal tool', 'Retro/industrial']) assert.ok(rules.includes(style), style);
  assert.match(rules, /"children" does not\nestablish an age range/);
  assert.match(rules, /footer alone does not justify a newsletter\/signup form/);
});

test('composition, role systems and anti-generic checks remain content-driven', () => {
  for (const phrase of ['Variation must aid comprehension', 'Intentional repetition in data/control', 'display/headline, section heading, body', 'page/background, surface, primary/secondary text', 'coherent gap/padding rhythms', 'not a mandatory exact token scale', 'available fonts/weights', 'report it truthfully', 'not absolute bans', 'repeated three-card grids', 'excessive pills', 'random accent blobs', 'purposeful\nwhitespace', 'style fidelity']) assert.ok(rules.includes(phrase), phrase);
});

test('inspection supports one bounded polish and mandatory final read verification', () => {
  for (const phrase of ['After the draft is stable, re-read generated production roots', 'node/property evidence', 'Omitted properties are unknown', 'At most one automatic focused polish pass', 'Skip polish if no supported issue exists', 'No repeated whole-page redesign', 'After polish (or skipped polish), re-read every affected root', 'no duplicate production roots', 'no incomplete writes', 'second aesthetic polish pass']) assert.ok(rules.includes(phrase), phrase);
  for (const field of ['Created', 'Art direction', 'Sections/screens', 'Polish', 'Limitations/substitutions', 'Production root IDs', 'Next']) assert.ok(command.includes(field), field);
});

test('reliability, production ownership and source component verification survive V2', () => {
  for (const phrase of ['indeterminate', 'node counts/state to stabilize', 'Never rerun the whole screen blindly', 'move_to_anchor', 'true reorder/reparent/rebuild', 'matching coordinate systems', 'instantiate_by_name is ambiguous', 'componentSetId', 'clone_node on a COMPONENT', 'not an INSTANCE', 'do not accidentally create a second production root', 'Do not repair unrelated page content', 'unless the user explicitly asks']) assert.ok(command.includes(phrase), phrase);
  assert.match(rules, /font-probe writes belong to Pass 7 after passes 1–6 are complete/);
  assert.match(rules, /Retry a font-loading text failure\nonce/);
  assert.match(rules, /do not create the canonical state library or new states automatically/);
  assert.match(command, /verified reuse or a concrete reason to remain independent, not a deferred pass/);
});

test('design inspection does not invoke critique or bypass its persistent guard', () => {
  assert.match(command, /Do not invoke\n\/figma\/critique automatically during generation/);
  assert.match(command, /Never disable, reset, alter or bypass/);
  assert.match(rules, /never weaken or bypass its read-only guard/);
  assert.match(command, /No new MCP capability is required/);
  assert.doesNotMatch(contract, /\/figma\/design-v2/);
});

test('five acceptance briefs preserve requested regions and substantially different strategies', () => {
  assert.deepEqual(fixtures.map(f => f.case), ['A', 'B', 'C', 'D', 'E']);
  assert.equal(new Set(fixtures.map(f => f.kind)).size, 5);
  assert.equal(new Set(fixtures.map(f => f.strategy)).size, 5);
  for (const f of fixtures) {
    assert.ok(f.subject && f.strategy && f.avoid);
    for (const region of f.regions) assert.ok(f.prompt.toLowerCase().includes(region), `${f.case}: ${region}`);
  }
  assert.match(fixtures[1].strategy, /typographic|asymmetrical/);
  assert.match(fixtures[2].strategy, /table/);
  assert.match(fixtures[3].strategy, /dominant challenge/);
  assert.match(fixtures[4].strategy, /operational toolbar/);
});

test('npm and source archives include the V2 contracts, fixtures and report', () => {
  assert.ok(JSON.parse(read('package.json')).scripts.test.includes('scripts/figma-design.test.mjs'));
  const source = JSON.parse(read('docs/SOURCE_ALLOWLIST.json'));
  for (const file of ['scripts/figma-design.test.mjs', 'scripts/fixtures/design-v2.json', 'docs/DESIGN_GENERATION_V2.md']) assert.ok(source.includes(file), file);
});

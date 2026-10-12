import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replaceAll('\r\n', '\n');
const command = read('.opencode/commands/figma/design.md');
const rules = read('rules/figma-design-rules.md');
const agent = read('.opencode/agents/figma-designer.md');
const contract = `${command}\n${rules}\n${agent}`;
const fixtures = JSON.parse(read('scripts/fixtures/design-v2.json'));
const briefing = JSON.parse(read('scripts/fixtures/adaptive-briefing.json'));
const adaptive = rules.slice(rules.indexOf('## Adaptive briefing'), rules.indexOf('## Design V2'));

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

test('adaptive briefing adds no command or alias and keeps the beginner entry point', () => {
  const commands = readdirSync(new URL('../.opencode/commands/figma/', import.meta.url));
  assert.deepEqual(commands.sort(), ['browser-test.md', 'browser.md', 'critique.md', 'design.md', 'doctor.md', 'flow.md', 'interactive.md', 'motion.md', 'qa.md', 'revise.md', 'setup.md', 'states.md', 'status.md', 'version.md'].sort());
  assert.match(command, /ADAPTIVE BRIEFING/);
  assert.match(adaptive, /only to `\/figma\/design`/);
});

const briefingContracts = [
  ['detailed requests have no mandatory interview', /0 questions; proceed directly/, adaptive],
  ['supplied product, areas and style are sufficient without substyle interrogation', /product, requested areas and visual direction[\s\S]*Proceed with 0 questions[\s\S]*not a reason to interview/, adaptive],
  ['a partial brief does not reopen supplied scope', /style is absent, ask only about visual character[\s\S]*Do not reopen supplied scope/, adaptive],
  ['vague requests trigger context-specific questions', /normally\nneed context-specific questions/, adaptive],
  ['partial requests use a smaller question budget', /Mostly complete[^\n]*1–2 targeted questions[\s\S]*Partial[^\n]*2–4 targeted questions/, adaptive],
  ['question budgets count decisions and are ceilings', /6 questions in one round or 6 total questions[\s\S]*Count distinct decisions[\s\S]*overloaded question/, adaptive],
  ['briefing has a two-round limit', /At most 2 briefing rounds[\s\S]*After two rounds or the question budget/, adaptive],
  ['autonomy ends interviewing immediately', /equivalent autonomy instructions end briefing\nimmediately/, adaptive],
  ['questions remain design-focused', /purpose\/use context, primary action[\s\S]*required content[\s\S]*visual character/, adaptive],
  ['implementation discovery is not automatic', /No React\/Vue, Next.js, database, API, hosting, authentication provider, backend stack[\s\S]*explicit\nimplementation\/development request/, adaptive],
  ['live source can answer brand and style choices', /Existing\ntypography, colors, components, spacing and style can answer brand questions[\s\S]*overrides the existing system/, adaptive],
  ['no authoring or scratch/font writes while awaiting answers', /no Figma authoring writes happen until necessary answers[\s\S]*No font probes, scratch\nnodes or partial design while waiting/, adaptive],
  ['later answers merge with original request and ownership', /original request, all supplied answers[\s\S]*target page\/root and ownership scope[\s\S]*Merge later answers with the original request/, adaptive],
  ['semantic questions are never repeated', /never repeat the same semantic question[\s\S]*An unanswered question is not permission to repeat it/, adaptive],
  ['plain replies resume without another command', /The user need not invoke `\/figma\/design` again/, adaptive],
  ['briefing feeds the existing V2 pipeline before Pass 1', /working brief feeds V2 Pass 1[\s\S]*authoritative V2 passes continue unchanged/, adaptive],
  ['briefing does not activate or change critique enforcement', /Do not invoke `\/figma\/critique`, weaken its\nguard/, adaptive],
  ['no question MCP or runtime change is introduced', /introduce a question MCP or change runtime policy/, adaptive],
  ['questions do not steer toward a house style', /Do not steer toward clean,\nminimal, modern, SaaS, rounded cards or gradients/, adaptive],
  ['audience questions avoid invented demographics', /No invented demographics\nor default age questions/, adaptive],
  ['business facts and automatic business sections are forbidden', /Do not automatically suggest pricing, testimonials, newsletters, FAQs, statistics[\s\S]*No unsupported business facts/, adaptive],
  ['detailed benchmarks route directly including missing low-value fields', /detailed Velvet Brew, logistics, editorial, geography and inventory benchmark\nbriefs proceed directly/, adaptive],
  ['briefing uses beginner language and accepts other choices', /Something\nelse[\s\S]*Beginner questions must use plain language/, adaptive],
  ['question turns wait before planning or reporting completion', /wait for answers before V2 planning/, adaptive],
  ['plan-only scope is not implicit autonomy', /Plan-only\/test mode, labelled sample data, user absence or a small scope do not\nauthorize skipping required questions/, adaptive],
  ['question alternatives and asset intake remain bounded', /at most 3 concrete, neutral examples[\s\S]*optional inputs, not a default intake question/, adaptive],
  ['later V2 passes do not restart the interview', /do not restart\nbriefing in this or later passes/, rules],
];
for (const [name, pattern, source] of briefingContracts) test(name, () => assert.match(source, pattern));

test('briefing fixtures cover distinct products, partial/answered/autonomous/source cases', () => {
  assert.deepEqual(briefing.vague.map(f => f.id), ['coffee', 'dashboard', 'portfolio', 'business', 'travel']);
  assert.equal(new Set(briefing.vague.map(f => f.topics.join(','))).size, 5);
  for (const f of briefing.vague) assert.ok(f.maxQuestions <= 6 && f.maxQuestions >= 2);
  assert.ok(briefing.partial.maxQuestions < briefing.vague[0].maxQuestions);
  assert.equal(briefing.continuation.original, briefing.vague[0].prompt);
  assert.equal(briefing.continuation.expectedQuestions, 0);
  for (const term of briefing.continuation.workingBriefMustRetain.slice(1)) assert.ok(briefing.continuation.answer.toLowerCase().includes(term));
  assert.deepEqual(briefing.detailedBenchmarkCases, fixtures.map(f => f.case));
  for (const field of briefing.workingBriefFields) assert.ok(adaptive.includes(field), field);
  assert.equal(briefing.autonomy.length, 5);
  assert.match(briefing.sourcePrompt, /existing.*typography, colors, spacing and components/);
});

test('critique guard checksum matches the recorded integration version after LF normalization', () => {
  assert.equal(createHash('sha256').update(read('.opencode/plugins/figma-critique-guard.js')).digest('hex'), briefing.critiqueGuardSha256Lf);
});

test('source archive includes adaptive fixtures and acceptance documentation', () => {
  const source = JSON.parse(read('docs/SOURCE_ALLOWLIST.json'));
  for (const file of ['scripts/fixtures/adaptive-briefing.json', 'docs/ADAPTIVE_BRIEFING_V1_2_3_1.md']) assert.ok(source.includes(file), file);
});

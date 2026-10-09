// Offline structural fixtures, never imported by the Figma runtime.
const padding = value => ({ top: value, right: value, bottom: value, left: value });
const bounds = (width, height, x = 0, y = 0) => ({ width, height, x, y });
const text = (id, name, characters, size, width, y = 0) => ({
  id, name, type: 'TEXT', characters, bounds: bounds(width, size * 1.5, 0, y),
  styles: { fontFamily: 'Inter', fontStyle: size >= 32 ? 'Bold' : 'Regular', fontWeight: size >= 32 ? 700 : 400, fontSize: size, fills: ['#172033'] },
});
const frame = (id, name, children, width = 1200, height = 360, y = 0) => ({
  id, name, type: 'FRAME', bounds: bounds(width, height, 0, y),
  styles: { padding: { ...padding(24), ...(width === 1440 ? { left: 120, right: 120 } : {}) }, fills: ['#ffffff'], cornerRadius: 8 },
  layoutMode: 'VERTICAL', itemSpacing: 24,
  children: children.map(child => ({ ...child, bounds: { ...child.bounds, x: child.bounds.x + (width === 1440 ? 120 : 24), y: child.bounds.y + 24 } })),
});
const labelId = id => `${id.split(':')[0]}:${900 + Number(id.split(':')[1])}`;
const button = (id, label, y = 0) => ({
  ...frame(id, 'Primary action', [text(labelId(id), 'Label', label, 16, 160)], 192, 56, y),
  styles: { padding: padding(16), fills: ['#2459cc'], cornerRadius: 8 },
  children: [{ ...text(labelId(id), 'Label', label, 16, 160), bounds: bounds(160, 24, 16, 16), styles: { ...text(labelId(id), '', '', 16, 160).styles, fills: ['#ffffff'] } }],
});
const hero = () => frame('10:2', 'Hero', [
  text('10:3', 'Heading', 'Plan your next project', 48, 560),
  text('10:4', 'Body', 'Keep the team aligned with a clear shared plan.', 18, 560, 96),
  button('10:5', 'Start a project', 147),
]);
const good = () => frame('10:1', 'Project landing', [hero(), frame('10:8', 'How it works', [
  text('10:9', 'Heading', 'Three steps to a shared plan', 32, 560),
  text('10:10', 'Body', 'Choose a goal, invite the team, then review the next steps.', 18, 560, 72),
], 1200, 240, 384)], 1440, 672);
const page = root => ({ id: '0:1', name: 'Fixture page', type: 'PAGE', styles: {}, children: root ? [root] : [] });
const inconsistent = good();
inconsistent.children[0].children[2].bounds = bounds(110, 26, 0, 164);
inconsistent.children[0].children[2].styles.padding = padding(4);
inconsistent.children[0].children[2].children[0].styles.fontSize = 10;
inconsistent.children[0].children[2].children[0].bounds = bounds(100, 15);
inconsistent.children[0].children[2].styles.fills = ['#d9e0ee'];
inconsistent.children[0].children.push({ ...button('10:6', 'Cancel project', 214), name: 'Secondary action', bounds: bounds(500, 120, 0, 214) });
inconsistent.children[1].styles.padding = padding(7);
inconsistent.children[1].styles.cornerRadius = 36;

const sections = ['Features', 'Services', 'Testimonials'].map((name, i) => {
  const base = 30 + i * 20;
  const cards = [0, 1, 2].map(j => ({
    ...frame(`10:${base + 3 + j * 3}`, `Card ${j + 1}`, [
      text(`10:${base + 4 + j * 3}`, 'Card heading', `${name} item ${j + 1}`, 24, 320),
      text(`10:${base + 5 + j * 3}`, 'Card body', 'Read the details of this offering.', 18, 320, 60),
    ], 368, 220), bounds: bounds(368, 220, j * 392, 0),
  }));
  return frame(`10:${base}`, name, [
    text(`10:${base + 1}`, 'Section heading', name, 32, 560),
    { ...frame(`10:${base + 2}`, 'Card row', cards, 1152, 220, 80), children: cards, styles: { padding: padding(0) }, layoutMode: 'HORIZONTAL' },
  ], 1200, 360, 384 + i * 384);
});

const component = { ...button('20:2', 'Start a project'), type: 'COMPONENT', name: 'State=Default', componentSetId: '20:1' };
const componentSet = { ...frame('20:1', 'Button', [component], 240, 104), type: 'COMPONENT_SET' };
const componentHeavy = good();
componentHeavy.children[0].children[2] = { ...button('10:5', 'Start a project', 171), bounds: bounds(192, 56, 24, 171), type: 'INSTANCE', mainComponentId: '20:2', componentProperties: { State: { type: 'VARIANT', value: 'Default' } } };
componentHeavy.children[1].children.push({ ...button('10:12', 'Start a project', 147), bounds: bounds(192, 56, 24, 147), type: 'INSTANCE', mainComponentId: '20:2', componentProperties: { State: { type: 'VARIANT', value: 'Default' } } });

export const critiqueFixtures = {
  A: { title: 'Reasonably good design', document: page(good()), expectedGate: ['PASS'], high: false },
  B: { title: 'Inconsistent actions and spacing', document: page(inconsistent), expectedGate: ['NEEDS_REVISION'], finding: /10:5|10:6/, high: true },
  C: { title: 'Empty document', document: page(), expectedGate: ['BLOCKED'], uncertainty: true },
  D: { title: 'Consecutive repeated card layouts', document: page(frame('10:1', 'Repeated landing', [hero(), ...sections], 1440, 1600)), expectedGate: ['PASS', 'NEEDS_REVISION'], finding: /repetiti|monoton|pacing|rhythm/i, high: false },
  E: { title: 'Consistent component-heavy design', document: { ...page(componentHeavy), children: [componentHeavy, { ...frame('20:0', 'Figma Designer — Component States', [componentSet], 300, 180), bounds: bounds(300, 180, 1500, 0) }] }, expectedGate: ['PASS'], high: false, reuse: true, forbiddenFinding: /C\d+\.[^\n]*(?:duplicat|reuse|(?:identical|repeated)[^\n]*(?:control|CTA|action))/i },
};

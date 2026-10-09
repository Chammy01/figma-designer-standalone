// Read-only test connector; no WebSocket, Figma APIs or live document access.
import { createInterface } from 'node:readline';
import { appendFileSync } from 'node:fs';
import { critiqueFixtures } from './figma-critique.mjs';
const fixture = critiqueFixtures[process.argv[2]];
if (!fixture) throw new Error('Unknown critique fixture');
const catalog = JSON.parse(await (await import('node:fs/promises')).readFile(process.argv[3], 'utf8'));
const nodes = new Map();
function walk(node) { nodes.set(node.id, node); for (const child of node.children ?? []) walk(child); }
walk(fixture.document);
function inspect(node, depth = 0, result = []) {
  result.push({ nodeId: node.id, name: node.name, type: node.type, depth, ...node.bounds, layoutMode: node.layoutMode, itemSpacing: node.itemSpacing });
  for (const child of node.children ?? []) inspect(child, depth + 1, result);
  return result;
}
const metadata = { fileName: fixture.title, currentPageId: '0:1', currentPageName: 'Fixture page', pageCount: 1, pages: [{ id: '0:1', name: 'Fixture page' }] };
createInterface({ input: process.stdin }).on('line', line => {
  const request = JSON.parse(line);
  if (request.id === undefined) return;
  let result;
  if (request.method === 'initialize') result = { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'critique-fixture', version: '1' } };
  else if (request.method === 'tools/list') result = { tools: catalog };
  else if (request.method === 'tools/call') {
    const { name, arguments: args = {} } = request.params;
    appendFileSync(process.argv[4], JSON.stringify({ name, args }) + '\n');
    const node = nodes.get(args.nodeId);
    let data;
    switch (name) {
      case 'health_check': data = { ok: true, ...metadata }; break;
      case 'get_metadata': case 'get_pages': data = metadata; break;
      case 'get_document': data = fixture.document; break;
      case 'get_selection': data = []; break;
      case 'get_node': data = node; break;
      case 'get_nodes_info': data = args.nodeIds.map(id => nodes.get(id)); break;
      case 'get_design_context': data = { ...fixture.document, componentDefs: Object.fromEntries([...nodes].filter(([, n]) => n.type === 'COMPONENT')) }; break;
      case 'get_local_components': data = { components: [...nodes.values()].filter(n => n.type === 'COMPONENT'), componentSets: [...nodes.values()].filter(n => n.type === 'COMPONENT_SET') }; break;
      case 'inspect_node_as_html': data = { nodeId: node?.id, name: node?.name, type: node?.type, outline: node ? inspect(node) : [], html: '', boundStyles: [] }; break;
      case 'explain_layout': case 'explain_node': data = node; break;
      case 'get_reactions': data = { nodeId: args.nodeId, reactions: [] }; break;
      case 'get_fonts': data = { fonts: [{ family: 'Inter', style: 'Regular' }, { family: 'Inter', style: 'Bold' }] }; break;
      case 'get_styles': data = []; break;
      case 'scan_text_nodes': case 'scan_nodes_by_types': case 'search_nodes': data = [...nodes.values()].filter(n => name === 'scan_text_nodes' ? n.type === 'TEXT' : name === 'search_nodes' ? n.name.includes(args.query) : args.types.includes(n.type)); break;
      default: result = { isError: true, content: [{ type: 'text', text: `Fixture unsupported tool: ${name}` }] };
    }
    result ??= { content: [{ type: 'text', text: JSON.stringify(data ?? { error: 'Node unavailable' }) }] };
  } else result = {};
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }) + '\n');
});

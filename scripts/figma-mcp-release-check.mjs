import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const executable = process.argv[2];
if (!executable) throw new Error('Pass the staged executable path.');
async function probe(executable) {
// Port 0 binds an isolated ephemeral listener, never the working Figma bridge.
const child = spawn(executable, ['--ip', '127.0.0.1', '--port', '0'], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
const pending = new Map();
let nextId = 1;
let diagnostics = '';
child.stderr.on('data', chunk => { diagnostics += chunk; });
child.on('error', error => { for (const { reject } of pending.values()) reject(error); });
createInterface({ input: child.stdout }).on('line', line => {
  const response = JSON.parse(line);
  const entry = pending.get(response.id);
  if (entry) { pending.delete(response.id); clearTimeout(entry.timer); entry.resolve(response); }
});
function call(method, params) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`MCP probe timed out: ${method}\n${diagnostics}`)); }, 5000);
    pending.set(id, { resolve, reject, timer });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}
try {
  const initialized = await call('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'local-hardening-check', version: '1.2.0' } });
  assert.equal(initialized.result.serverInfo.version, '1.2.0-standalone-hardening');
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  const tools = (await call('tools/list', {})).result.tools;
  assert.equal(tools.length, 106);
  assert.ok(tools.some(t => t.name === 'combine_as_variants'));
  const malformed = [];
  for (const [name, args, expected] of [
    ['set_reactions', { nodeId: '1:2' }, /reactions/],
    ['set_reactions', { nodeId: '1:2', reactions: [], mode: 3 }, /mode/],
    ['set_reactions', { nodeId: '1:2', reactions: [{}] }, /trigger/],
    ['remove_reactions', { nodeId: '1:2', indices: null }, /indices/],
    ['remove_reactions', { nodeId: '1:2', indices: [0.5] }, /integer/],
  ]) {
    const response = await call('tools/call', { name, arguments: args });
    assert.equal(response.result.isError, true, JSON.stringify(response));
    assert.match(JSON.stringify(response.result.content), expected);
    assert.doesNotMatch(JSON.stringify(response.result.content), /plugin not connected/);
    malformed.push(response.result);
  }
  return { initialized: initialized.result, tools: tools.sort((a, b) => a.name.localeCompare(b.name)), malformed };
} finally {
  for (const entry of pending.values()) clearTimeout(entry.timer);
  child.stdin.end();
  child.kill();
}
}
const result = await probe(executable);
if (process.argv[3]) {
  assert.deepEqual(result, await probe(process.argv[3]));
  console.log('Approved-runtime comparison PASS: identical initialization, complete tool schemas/catalog, and malformed reaction responses.');
}
console.log('Staged MCP PASS: initialized version, 106 tools, custom variants tool, and five invalid reaction requests rejected before plugin dispatch.');

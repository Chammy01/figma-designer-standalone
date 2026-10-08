import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const executable = process.env.OPENCODE_EXECUTABLE;
test('installed OpenCode normalizes legacy timeout and accepts separate execution budget', { skip: !executable }, async () => {
  const sources = cwd => JSON.parse(execFileSync(executable, ['debug', 'config'], { cwd, encoding: 'utf8', timeout: 15000 }));
  const project = sources(process.cwd()).find(x => x.type === 'document' && resolve(x.path) === resolve('opencode.json'));
  const raw = JSON.parse(await readFile('opencode.json', 'utf8'));
  assert.equal(project.info.mcp.servers.figma.timeout.execution, raw.mcp.figma.timeout);
  assert.equal(project.info.mcp.servers.figma.timeout.catalog, raw.mcp.figma.timeout);
  const dir = await mkdtemp(join(tmpdir(), 'figma-opencode-budget-'));
  const proposed = { startup: 30000, catalog: 10000, execution: 120000 };
  try {
    await writeFile(join(dir, 'opencode.json'), JSON.stringify({ mcp: { servers: { budgetProbe: { type: 'local', command: [process.execPath, '-e', ''], disabled: true, timeout: proposed } } } }));
    const normalized = sources(dir).find(x => x.type === 'document' && resolve(x.path) === join(dir, 'opencode.json'));
    assert.deepEqual(normalized.info.mcp.servers.budgetProbe.timeout, proposed);
    console.log(`OpenCode ${execFileSync(executable, ['--version'], { encoding: 'utf8' }).trim()}: current execution=${raw.mcp.figma.timeout}ms; proposed object accepted. Execution cancellation is modeled separately by Go fake-clock tests, not a real model/tool session.`);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

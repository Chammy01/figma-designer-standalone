import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as fs from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {browserTestPaths,writeBrowserTestOutput,protectedArtifactSnapshot,compareArtifactSnapshots} from '../rules/browser-test-artifact-guard.mjs';

import browserTestPlugin from '../.opencode/plugins/figma-browser-test-guard.js';
import critiquePlugin from '../.opencode/plugins/figma-critique-guard.js';
import {
  installBrowserTestWorkflow,
  browserBuildMarker,
  getTurnState,
} from '../rules/browser-test-workflow.mjs';
import {
  browserTestMarker,
  browserTestTool,
  policyCodes,
  acquireBrowserArtifactLease,
} from '../rules/browser-test-artifact-guard.mjs';

async function createFixtureWorkspace() {
  const dir = await mkdtemp(join(tmpdir(), 'figma-browser-workflow-'));
  const protoDir = join(dir, '.figma-designer', 'browser-prototype');
  await mkdir(protoDir, { recursive: true });
  for (const name of ['index.html', 'styles.css', 'app.js', 'figma-browser.json', 'figma-source.json']) {
    await writeFile(join(protoDir, name), `/* ${name} */`, 'utf8');
  }
  return dir;
}

async function harness(storage = new Map(), messages = [], options = {}) {
  const hooks = {}, transforms = [];
  const add = (name, fn) => (hooks[name] ??= []).push(fn);
  const ctx = {
    storage: {
      get: async k => storage.get(k),
      set: async (k, v) => storage.set(k, v),
      remove: async k => storage.delete(k),
    },
    session: {
      hook: async (n, f) => add(n, f),
      context: async () => messages,
      get: async () => ({ agent: 'figma-designer' }),
      generate: async () => ({ text: '{"intent":"browser_test"}' }),
    },
    tool: {
      transform: async f => transforms.push(editor=>f({list:()=>[],update:()=>{},remove:()=>{},...editor})),
      hook: async (n, f) => add(n, f),
    },
    permission: {
      hook: async (n, f) => add('permission.' + n, f),
    },
  };

  const configured={...options};
  if(options.runner)configured.runner=async(root,{finalize})=>{
    const lease=await acquireBrowserArtifactLease(root,'TEST');
    try{
      const result=await options.runner(root);
      result.report.generatedAt??=new Date().toISOString();
      result.report=await finalize(result.report);
      await writeBrowserTestOutput(root,browserTestPaths(root).report,JSON.stringify(result.report));
      return result;
    }finally{await lease.release();}
  };
  const workflow = await installBrowserTestWorkflow(ctx, configured);

  return {
    ctx,
    storage,
    messages,
    transforms,
    workflow,
    hooks,
    call: async (name, event) => {
      for (const fn of hooks[name] ?? []) {
        await fn(event);
      }
    },
  };
}


test('tool execute fails closed if session context is missing or guard not active', async () => {
  const h = await harness();
  const toolObj = [];
  for (const transform of h.transforms) {
    transform({ add: t => toolObj.push(t) });
  }
  const testTool = toolObj[0];

  // Missing toolCtx entirely
  await assert.rejects(
    testTool.execute({}),
    /FIGMA_BROWSER_TEST_FAILCLOSED: missing sessionID in tool execution context/
  );

  // Missing sessionID
  await assert.rejects(
    testTool.execute({}, { id: 'call-1', messageID: 'msg-1' }),
    /FIGMA_BROWSER_TEST_FAILCLOSED: missing sessionID in tool execution context/
  );

  // Guard not active for session
  await assert.rejects(
    testTool.execute({}, { sessionID: 'unguarded-sess', id: 'call-1', messageID: 'msg-1' }),
    /FIGMA_BROWSER_TEST_FAILCLOSED: guard not active for session/
  );
});

test('storage error in getTurnState propagates failclosed rather than returning default', async () => {
  const h = await harness();
  h.ctx.storage.get = async () => { throw new Error('Storage backend error'); };

  await assert.rejects(
    getTurnState(h.ctx, 'any-session'),
    /Storage backend error/
  );
});

test('controlled callbacks block Node, PowerShell, shell, and mutation payloads before execution', async () => {
  const h = await harness();
  await h.call('prompt', { sessionID: 'test-session', prompt: { text: browserTestMarker } });

  const blockedCalls = [
    { tool: 'shell', input: { command: 'node -e "process.exit(1)"' } },
    { tool: 'bash', input: { command: 'powershell -Command "Get-Process"' } },
    { tool: 'node', input: { script: 'console.log(1)' } },
    { tool: 'powershell', input: { script: 'dir' } },
    { tool: 'cmd', input: { command: 'del /f test' } },
    { tool: 'terminal', input: { cmd: 'rm -rf .' } },
    { tool: 'write', input: { path: '.figma-designer/browser-prototype/index.html', content: 'bad' } },
    { tool: 'edit', input: { path: '.figma-designer/browser-prototype/app.js' } },
    { tool: 'patch', input: { path: 'unknown.txt' } },
    { tool: 'execute', input: { code: 'bad()' } },
    { tool: 'figma_update_node_props', input: { nodeId: '1:1' } },
    { tool: 'figma_write_html', input: { html: '<div>test</div>' } },
    { tool: 'figma_set_reactions', input: {} },
  ];

  for (const { tool, input } of blockedCalls) {
    await assert.rejects(
      h.call('execute.before', { sessionID: 'test-session', tool, input }),
      /FIGMA_BROWSER_TEST_READ_ONLY: blocked tool/,
      `Tool ${tool} should have been rejected before execution`
    );

    const perm = { sessionID: 'test-session', action: tool, effect: 'allow' };
    await h.call('permission.evaluate', perm);
    assert.equal(perm.effect, 'deny', `Permission for ${tool} should be denied`);
  }

  // Inspection tools must be permitted
  for (const safeTool of ['read', 'glob', 'grep', browserTestTool]) {
    await h.call('execute.before', { sessionID: 'test-session', tool: safeTool });
    const perm = { sessionID: 'test-session', action: safeTool, effect: 'allow' };
    await h.call('permission.evaluate', perm);
    assert.equal(perm.effect, 'allow', `Tool ${safeTool} should be allowed`);
  }
});

test('blocked evidence records sanitized categories without echoing model-controlled payloads', async () => {
  const h = await harness();
  await h.call('prompt', { sessionID: 'ev-session', prompt: { text: browserTestMarker } });

  await assert.rejects(
    h.call('execute.before', {
      sessionID: 'ev-session',
      tool: 'shell',
      input: { command: 'node -e "secret_command()"' },
    })
  );

  await assert.rejects(
    h.call('execute.before', {
      sessionID: 'ev-session',
      tool: 'write',
      input: { path: '.figma-designer/browser-prototype/index.html', content: 'secret_leak' },
    })
  );

  await assert.rejects(
    h.call('execute.before', {
      sessionID: 'ev-session',
      tool: 'edit',
      input: { path: '/etc/passwd_or_custom_path', content: 'injection' },
    })
  );

  const state = await getTurnState(h.ctx, 'ev-session');
  assert.equal(state.evidence.count, 3);
  const records = state.evidence.records;
  assert.equal(records[0].category, 'NODE');
  assert.equal(records[0].relativePath, null);
  assert.equal(records[1].category, 'WRITE');
  assert.equal(records[1].relativePath, '.figma-designer/browser-prototype/index.html');
  assert.equal(records[2].category, 'EDIT');
  assert.equal(records[2].relativePath, null); // custom path suppressed
});

test('storage persistence preserves hasRun and evidence across reloads and prevents mid-turn resets', async () => {
  const storage = new Map();
  const messages = [{ type: 'assistant' }];
  const h1 = await harness(storage, messages);

  await h1.call('prompt', { sessionID: 'persist-session', prompt: { text: browserTestMarker } });

  // Record a blocked attempt
  await assert.rejects(
    h1.call('execute.before', {
      sessionID: 'persist-session',
      tool: 'write',
      input: { path: '.figma-designer/browser-prototype/app.js' },
    })
  );

  // A repeated marker prompt sent while mid-turn (not idle) must NOT reset the turn state
  await h1.call('prompt', { sessionID: 'persist-session', prompt: { text: browserTestMarker } });
  const midState = await getTurnState(h1.ctx, 'persist-session');
  assert.equal(midState.evidence.count, 1, 'Evidence must be preserved across repeated mid-turn markers');

  // Reload plugin instance in fresh harness with same persisted storage
  const h2 = await harness(storage, messages);
  const reloadedState = await getTurnState(h2.ctx, 'persist-session');
  assert.equal(reloadedState.evidence.count, 1, 'Evidence must survive harness/plugin reload');

  // Tools still blocked after reload
  await assert.rejects(
    h2.call('execute.before', { sessionID: 'persist-session', tool: 'write' }),
    /FIGMA_BROWSER_TEST_READ_ONLY/
  );
});

test('prior blocked attempts cause canonical run to fail with blocked evidence and policy code', async () => {
  const workspace = await createFixtureWorkspace();
  try {
    const mockRunner = async () => ({
      output: 'FIGMA_BROWSER_TEST: PASS\n',
      report: {
        result: 'PASS',
        browserAcceptance: 'PASS',
        passed: true,
        artifactIntegrity: { status: 'UNCHANGED', protectedFileCount: 5, changedFiles: [], blockedWriteAttempts: 0, blockedWriteEvidence: [] },
      },
    });

    const h = await harness(new Map(), [], { projectRoot: workspace, runner: mockRunner });
    await h.call('prompt', { sessionID: 'blocked-turn', prompt: { text: browserTestMarker } });

    // Model attempts an edit before test
    await assert.rejects(
      h.call('execute.before', {
        sessionID: 'blocked-turn',
        tool: 'write',
        input: { path: '.figma-designer/browser-prototype/styles.css' },
      })
    );

    const toolObj = [];
    for (const transform of h.transforms) {
      transform({ add: t => toolObj.push(t) });
    }
    const res = await toolObj[0].execute({}, { sessionID: 'blocked-turn', id: 'call-1', messageID: 'msg-1' });

    assert.equal(res.report.result, 'FAIL');
    assert.equal(res.report.browserAcceptance, 'FAIL');
    assert.equal(res.report.passed, false);
    assert.equal(res.report.policyCode, policyCodes.blocked);
    assert.equal(res.report.artifactIntegrity.blockedWriteAttempts, 1);
    assert.ok(res.content.includes('FIGMA_BROWSER_TEST: FAIL'));
    assert.ok(!res.content.includes('FIGMA_BROWSER_TEST: PASS'));
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('at most one canonical run per guarded turn, persisting hasRun before runner starts', async () => {
  const workspace = await createFixtureWorkspace();
  try {
    let runs = 0;
    let stateDuringRun = null;
    const mockRunner = async () => {
      runs++;
      stateDuringRun = await getTurnState(h.ctx, 'run-session');
      return {
        output: 'FIGMA_BROWSER_TEST: PASS\n',
        report: {
          result: 'PASS',
          browserAcceptance: 'PASS',
          passed: true,
          artifactIntegrity: { status: 'UNCHANGED', protectedFileCount: 5, changedFiles: [], blockedWriteAttempts: 0, blockedWriteEvidence: [] },
        },
      };
    };

    const h = await harness(new Map(), [], { projectRoot: workspace, runner: mockRunner });
    await h.call('prompt', { sessionID: 'run-session', prompt: { text: browserTestMarker } });

    const toolObj = [];
    for (const transform of h.transforms) {
      transform({ add: t => toolObj.push(t) });
    }
    const testTool = toolObj[0];
    const toolCtx = { sessionID: 'run-session', id: 'c1', messageID: 'm1' };

    // Argument rejection
    await assert.rejects(
      testTool.execute({ extra: 'forbidden' }, toolCtx),
      /BROWSER_TEST_NO_ARGUMENTS_ALLOWED/
    );

    // First call succeeds
    const res = await testTool.execute({}, toolCtx);
    assert.equal(runs, 1);
    assert.equal(res.report.result, 'PASS');
    assert.equal(stateDuringRun?.hasRun, true, 'hasRun must be persisted to storage BEFORE runner executes');

    // Second call rejects in execute.before and tool.execute
    await assert.rejects(
      h.call('execute.before', { sessionID: 'run-session', tool: browserTestTool }),
      /at most one canonical test run is allowed per turn/
    );
    await assert.rejects(
      testTool.execute({}, toolCtx),
      /BROWSER_TEST_ALREADY_EXECUTED/
    );
    assert.equal(runs, 1, 'Runner must not be reinvoked');
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('browser build recognizes preamble and distinguishes /figma/browser from /figma/browser-test', async () => {
  const workspace = await createFixtureWorkspace();
  try {
    const messages = [{ type: 'assistant' }];
    const h = await harness(new Map(), messages, { projectRoot: workspace });

    // Preamble before marker
    const buildPromptWithPreamble = 'Preserve unique data hooks...\nFIGMA DESIGNER FUNCTIONAL BROWSER INTERFACE — STANDALONE V1.2.1';
    await h.call('prompt', { sessionID: 'build-sess', prompt: { text: buildPromptWithPreamble } });

    // BUILD lease must be held
    assert.ok(h.workflow.buildLeases.has('build-sess'));

    // Context error must retain lease failclosed
    const originalContext = h.ctx.session.context;
    h.ctx.session.context = async () => { throw new Error('Context fetch failure'); };
    await new Promise(r => setTimeout(r, 80));
    assert.ok(h.workflow.buildLeases.has('build-sess'), 'Build lease must be retained failclosed on context errors');

    // Restore context and send idle after non-idle activity
    h.ctx.session.context = originalContext;
    messages.push({ type: 'tool_call' });
    messages.push({ type: 'idle' });
    await new Promise(r => setTimeout(r, 120));
    assert.ok(!h.workflow.buildLeases.has('build-sess'), 'Build lease must release after turn reaches idle');

    // Now test that /figma/browser-test is NOT treated as a Build prompt
    await h.call('prompt', { sessionID: 'test-sess', prompt: { text: '/figma/browser-test' } });
    assert.ok(!h.workflow.buildLeases.has('test-sess'), '/figma/browser-test must not trigger Build lease');
    assert.equal(await h.storage.get('browser-test-read-only:test-sess'), true, 'Must activate test guard');
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('active TEST freeze uses positive allowlist to block unknown/arbitrary tools failclosed', async () => {
  const workspace = await createFixtureWorkspace();
  try {
    const testLease = await acquireBrowserArtifactLease(workspace, 'TEST');
    const h = await harness(new Map(), [], { projectRoot: workspace });

    // Unguarded session trying unknown/future/mutation/shell tools must fail closed
    const deniedTools = [
      'shell', 'bash', 'cmd', 'powershell', 'terminal', 'execute',
      'node', 'eval', 'task', 'custom_worker', 'future_authoring_tool',
      'write', 'edit', 'patch', 'figma_update_node_props', 'figma_create_frame',
    ];

    for (const tool of deniedTools) {
      await assert.rejects(
        h.call('execute.before', { sessionID: 'other-session', tool }),
        /BROWSER_TEST_FROZEN: tool blocked during active browser test freeze/,
        `Tool ${tool} must be blocked by positive allowlist during freeze`
      );
      const perm = { sessionID: 'other-session', action: tool, effect: 'allow' };
      await h.call('permission.evaluate', perm);
      assert.equal(perm.effect, 'deny', `Permission for ${tool} must be denied during freeze`);
    }

    // Approved safe read tools pass
    for (const readTool of ['read', 'glob', 'grep', 'figma_get_document', 'figma_critique_get_node']) {
      await h.call('execute.before', { sessionID: 'other-session', tool: readTool });
      const perm = { sessionID: 'other-session', action: readTool, effect: 'allow' };
      await h.call('permission.evaluate', perm);
      assert.equal(perm.effect, 'allow');
    }

    await testLease.release();

  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('combined router and guard behaviorally routes browser_test and rejects edits before execution', async () => {
  const storage = new Map();
  const h = await harness(storage);

  // Setup plugins in alphabetical order as OpenCode does
  await browserTestPlugin.setup(h.ctx);
  // Setting up critique plugin second should not weaken guard or duplicate router
  await critiquePlugin.setup(h.ctx);

  // Simulated auto-routed browser test prompt
  await h.call('prompt', {
    sessionID: 'routed-session',
    prompt: { text: 'test the generated browser prototype' },
    metadata: { figmaIntent: 'browser_test' },
  });

  // Guard must be active
  assert.equal(await storage.get('browser-test-read-only:routed-session'), true);

  // Edits blocked before execution
  await assert.rejects(
    h.call('execute.before', {
      sessionID: 'routed-session',
      tool: 'edit',
      input: { path: '.figma-designer/browser-prototype/index.html' },
    }),
    /FIGMA_BROWSER_TEST_READ_ONLY/
  );
});

const execute=promisify(execFile);
for(const vector of [
  'direct write','direct edit','append','delete/recreate','rename replacement','copy replacement',
  'shell overwrite','shell append','shell copy','shell move','shell delete',
  'Node writeFile','Node appendFile','Node rename','Node copyFile','Node rm',
  'PowerShell Set-Content','PowerShell Add-Content','PowerShell Out-File',
  'PowerShell Move-Item','PowerShell Copy-Item','PowerShell Remove-Item',
  'formatter','regeneration','Browser Build'
])test('disposable artifact bytes survive '+vector+' before effect',async()=>{
  const root=await createFixtureWorkspace(),paths=browserTestPaths(root),file=join(paths.artifacts,'index.html'),replacement=join(root,'replacement.html');
  try{
    await writeFile(replacement,'malicious replacement');
    const before=await protectedArtifactSnapshot(root),h=await harness(new Map(),[],{projectRoot:root});
    await h.call('prompt',{sessionID:'adversarial',prompt:{text:browserTestMarker}});
    let tool='shell',command,effect;
    const node=script=>{command='node -e '+JSON.stringify(script);return ()=>execute(process.execPath,['-e',script],{cwd:root});};
    if(vector==='direct write'||vector==='direct edit'){tool=vector==='direct write'?'write':'edit';effect=()=>fs.writeFile(file,'changed');}
    else if(vector==='append'){tool='append';effect=()=>fs.appendFile(file,'changed');}
    else if(vector==='delete/recreate'){tool='delete';effect=async()=>{await fs.rm(file);await fs.writeFile(file,'changed');};}
    else if(vector==='rename replacement'){tool='rename';effect=()=>fs.rename(replacement,file);}
    else if(vector==='copy replacement'){tool='copy';effect=()=>fs.copyFile(replacement,file);}
    else if(vector.startsWith('Node ')){
      const operation=vector.slice(5);
      const args=operation==='rename'||operation==='copyFile'?[replacement,file]:operation==='rm'?[file]:[file,'changed'];
      effect=node(`require('node:fs').${operation}Sync(${args.map(a=>JSON.stringify(a)).join(',')})`);
    }else if(vector.startsWith('PowerShell ')){
      const operation=vector.slice(11),quote=v=>"'"+v.replaceAll("'","''")+"'";
      command=operation==='Out-File'?`'changed' | Out-File -LiteralPath ${quote(file)}`:
        ['Move-Item','Copy-Item'].includes(operation)?`${operation} -LiteralPath ${quote(replacement)} -Destination ${quote(file)} -Force`:
        operation==='Remove-Item'?`${operation} -LiteralPath ${quote(file)} -Force`:`${operation} -LiteralPath ${quote(file)} -Value 'changed'`;
      effect=()=>execute('powershell.exe',['-NoProfile','-Command',command],{cwd:root});
    }else if(vector.startsWith('shell ')){
      const operation=vector.slice(6);
      command=operation==='overwrite'?`echo changed > "${file}"`:operation==='append'?`echo changed >> "${file}"`:operation==='delete'?`del "${file}"`:`${operation} /Y "${replacement}" "${file}"`;
      effect=()=>execute('cmd.exe',['/D','/C',command],{cwd:root});
    }else{
      tool=vector==='formatter'?'formatter':vector==='regeneration'?'regenerate':'browser_build';
      effect=node(`require('node:fs').writeFileSync(${JSON.stringify(file)},'rebuilt')`);
    }
    let callbacks=0;
    await assert.rejects(async()=>{
      await h.call('execute.before',{sessionID:'adversarial',tool,input:{command,path:file}});
      callbacks++;await effect();
    },/FIGMA_BROWSER_TEST_READ_ONLY/);
    assert.equal(callbacks,0);
    const state=await getTurnState(h.ctx,'adversarial');
    assert.equal(state.evidence.count,1);
    assert.equal(compareArtifactSnapshots(before,await protectedArtifactSnapshot(root),state.evidence).status,'UNCHANGED');
    assert.doesNotMatch(JSON.stringify(state.evidence),/malicious replacement|[A-Z]:[\\\/]/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('concurrent canonical requests execute once and retain denied writes observed while the runner is active',async()=>{
  const root=await createFixtureWorkspace();let finish,started,runs=0;
  const running=new Promise(r=>started=r);
  try{
    const h=await harness(new Map(),[],{projectRoot:root,runner:async()=>{
      runs++;started();await new Promise(r=>finish=r);
      return {report:{result:'PASS',passed:true,artifactIntegrity:{status:'UNCHANGED',protectedFileCount:5}},output:'FIGMA_BROWSER_TEST: PASS'};
    }});
    await h.call('prompt',{sessionID:'concurrent',prompt:{text:browserTestMarker}});
    const added=[];h.transforms[0]({add:t=>added.push(t)});const tool=added[0];
    const first=tool.execute({},{sessionID:'concurrent'});await running;
    await assert.rejects(tool.execute({},{sessionID:'concurrent'}),/BROWSER_TEST_ALREADY_EXECUTED/);
    await Promise.all(Array.from({length:4},()=>assert.rejects(h.call('execute.before',{sessionID:'concurrent',tool:'edit',input:{path:'.figma-designer/browser-prototype/app.js'}}))));
    finish();const result=await first;
    assert.equal(runs,1);assert.equal(result.report.result,'FAIL');assert.equal(result.report.artifactIntegrity.blockedWriteAttempts,4);
    assert.equal(JSON.parse(await fs.readFile(browserTestPaths(root).report)).artifactIntegrity.blockedWriteAttempts,4);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('a denied repair after the canonical result updates only its own report and never reruns',async()=>{
  const root=await createFixtureWorkspace();let runs=0;
  try{
    const h=await harness(new Map(),[],{projectRoot:root,runner:async()=>{
      runs++;return {report:{result:'PASS',passed:true,artifactIntegrity:{status:'UNCHANGED',protectedFileCount:5}},output:'FIGMA_BROWSER_TEST: PASS'};
    }});
    await h.call('prompt',{sessionID:'late',prompt:{text:browserTestMarker}});
    const added=[];h.transforms[0]({add:t=>added.push(t)});await added[0].execute({},{sessionID:'late'});
    const before=await protectedArtifactSnapshot(root);
    await assert.rejects(h.call('execute.before',{sessionID:'late',tool:'edit',input:{path:'.figma-designer/browser-prototype/styles.css'}}));
    const report=JSON.parse(await fs.readFile(browserTestPaths(root).report));
    assert.equal(report.result,'FAIL');assert.equal(report.artifactIntegrity.blockedWriteAttempts,1);assert.equal(runs,1);
    assert.equal(compareArtifactSnapshots(before,await protectedArtifactSnapshot(root)).status,'UNCHANGED');
  }finally{await rm(root,{recursive:true,force:true});}
});

test('a delayed old Build idle response cannot unfreeze the replacement Build', async () => {
  const workspace=await createFixtureWorkspace();
  let h,resolveOld,releasePoll,pollTimeout,contextCalls=0,finishReplacement=false;
  const oldResponse=new Promise(resolve=>{resolveOld=resolve;});
  const pollStarted=new Promise(resolve=>{releasePoll=resolve;});
  try{
    h=await harness(new Map(),[],{projectRoot:workspace});
    h.ctx.session.context=async()=>{
      contextCalls++;
      if(contextCalls===2){releasePoll();return await oldResponse;}
      if(contextCalls===3||finishReplacement)return [{type:'assistant'},{type:'idle'}];
      return [{type:'assistant'}];
    };
    await h.call('prompt',{sessionID:'same',prompt:{text:browserBuildMarker}});
    try{await Promise.race([pollStarted,new Promise((_,reject)=>{pollTimeout=setTimeout(()=>reject(Error('Build watcher did not enter context')),1000);})]);}finally{clearTimeout(pollTimeout);}
    await h.call('prompt',{sessionID:'same',prompt:{text:browserBuildMarker}});
    resolveOld([{type:'assistant'},{type:'idle'}]);
    await new Promise(resolve=>setImmediate(resolve));
    await assert.rejects(acquireBrowserArtifactLease(workspace,'TEST'),{code:policyCodes.busy});
    finishReplacement=true;
    let testLease;
    for(let attempt=0;attempt<50;attempt++){
      try{testLease=await acquireBrowserArtifactLease(workspace,'TEST');break;}
      catch(error){if(error.code!==policyCodes.busy||attempt===49)throw error;await new Promise(resolve=>setTimeout(resolve,20));}
    }
    await testLease.release();
  }finally{
    resolveOld?.([]);
    for(const record of h?.workflow.buildLeases.values()??[]){clearInterval(record.timer);await record.lease.release();}
    await rm(workspace,{recursive:true,force:true});
  }
});

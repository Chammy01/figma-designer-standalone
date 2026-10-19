import { readFile } from 'node:fs/promises';
import {
  browserTestMarker,
  browserTestTool,
  artifactDirectory,
  requiredArtifacts,
  policyCodes,
  isBrowserTestReadTool,
  isBrowserTestToolAllowed,
  browserTestPaths,
  recordBlockedAttempt,
  createBlockedEvidence,
  acquireBrowserArtifactLease,
  browserArtifactLeaseState,
  writeBrowserTestOutput,
} from './browser-test-artifact-guard.mjs';
import { runCanonicalBrowserTest } from '../scripts/browser-test-canonical.mjs';
import {installBrowserWorkspaceCapabilities} from './browser-workspace-capabilities.mjs';

export const browserBuildMarker = 'FIGMA DESIGNER FUNCTIONAL BROWSER INTERFACE';
export const guardStorageKey = sessionID => `browser-test-read-only:${sessionID}`;
export const stateStorageKey = sessionID => `browser-test-state:${sessionID}`;

export const critiqueReadTools = [
  'health_check', 'get_metadata', 'get_pages', 'get_document', 'get_selection',
  'get_node', 'get_nodes_info', 'get_design_context', 'search_nodes',
  'scan_text_nodes', 'scan_nodes_by_types', 'get_fonts', 'get_styles',
  'get_local_components', 'get_reactions', 'inspect_node_as_html',
  'explain_layout', 'explain_node', 'get_screenshot',
  'get_operation_receipt', 'get_document_revision',
];

const allowedFigmaReads = new Set([
  'read', 'glob', 'grep',
  ...critiqueReadTools.flatMap(n => [`figma_${n}`, `figma_critique_${n}`]),
]);

export function isFrozenAllowedTool(name) {
  if (!name || typeof name !== 'string') return false;
  return allowedFigmaReads.has(name) || isBrowserTestReadTool(name);
}


export function categorizeTool(tool, input = null) {
  const t = String(tool || '').toLowerCase();
  if (t === 'node' || t === 'eval') return 'NODE';
  if (t === 'powershell' || t === 'pwsh') return 'POWERSHELL';
  if (t === 'write' || t === 'create_file') return 'WRITE';
  if (t === 'edit' || t === 'patch' || t === 'ast_edit') return 'EDIT';
  if (t === 'delete' || t === 'rm' || t === 'unlink') return 'DELETE';
  if (t === 'build' || t.includes('build')) return 'BUILD';
  if (t === 'format' || t === 'prettier') return 'FORMATTER';
  if (t === 'shell' || t === 'bash' || t === 'cmd' || t === 'terminal' || t === 'exec' || t === 'execute') {
    if (input && typeof input === 'object') {
      const cmd = String(input.command || input.script || input.cmd || '').trim().toLowerCase();
      if (/^node(\.exe)?(\s|$)/.test(cmd)) return 'NODE';
      if (/^(powershell|pwsh)(\.exe)?(\s|$)/.test(cmd)) return 'POWERSHELL';
    }
    return 'SHELL';
  }
  if (t.startsWith('figma_')) return 'WRITE';
  return 'UNKNOWN';
}

export function extractSafeRelativePath(input) {
  if (!input || typeof input !== 'object') return null;
  const rawPath = input.path ?? input.file ?? input.filePath ?? input.destination;
  if (typeof rawPath !== 'string') return null;
  const normalized = rawPath.replaceAll('\\', '/');
  for (const artifact of requiredArtifacts) {
    const target = `${artifactDirectory}/${artifact}`;
    if (normalized === target || normalized.endsWith('/' + target) || normalized === artifact) {
      return target;
    }
  }
  return null;
}

export async function getTurnState(ctx, sessionID) {
  const raw = await ctx.storage.get(stateStorageKey(sessionID));
  if (raw && typeof raw === 'object') {
    return {
      hasRun: Boolean(raw.hasRun),
      evidence: raw.evidence ?? createBlockedEvidence(),
      reportSummary: raw.reportSummary ?? null,
    };
  }
  return {
    hasRun: false,
    evidence: createBlockedEvidence(),
    reportSummary: null,
  };
}

export async function saveTurnState(ctx, sessionID, state) {
  const bounded = {
    hasRun: Boolean(state.hasRun),
    evidence: {
      count: Math.min(Number.MAX_SAFE_INTEGER, state.evidence?.count ?? 0),
      records: (state.evidence?.records ?? []).slice(0, 32),
    },
    reportSummary: state.reportSummary ? {
      result: ['PASS','WARN','FAIL'].includes(state.reportSummary.result)?state.reportSummary.result:'FAIL',
      policyCode: state.reportSummary.policyCode ?? null,
      generatedAt: state.reportSummary.generatedAt ?? null,
    } : null,
  };
  await ctx.storage.set(stateStorageKey(sessionID), bounded);
}

export async function clearTurnState(ctx, sessionID) {
  await ctx.storage.remove(guardStorageKey(sessionID));
  await ctx.storage.remove(stateStorageKey(sessionID));
}

async function updateReportWithBlockedEvidence(projectRoot, state) {
  if(!state.reportSummary?.generatedAt)return;
  const paths = browserTestPaths(projectRoot);
  let lease;
  try {
    lease = await acquireBrowserArtifactLease(projectRoot, 'TEST');
  } catch {
    // Never write without acquired TEST lease!
    return;
  }
  try {
    const raw = await readFile(paths.report, 'utf8');
    const rep = JSON.parse(raw);
    if(rep.generatedAt!==state.reportSummary.generatedAt)return;
    rep.artifactIntegrity = {
      ...(rep.artifactIntegrity || {}),
      blockedWriteAttempts: state.evidence.count,
      blockedWriteEvidence: state.evidence.records.slice(0, 32),
    };
    rep.policyCode = policyCodes.blocked;
    rep.result = 'FAIL';
    rep.browserAcceptance = 'FAIL';
    rep.passed = false;
    state.reportSummary = { result: rep.result, policyCode: rep.policyCode, generatedAt:rep.generatedAt };
    await writeBrowserTestOutput(projectRoot, paths.report, JSON.stringify(rep, null, 2) + '\n');
  } catch {
    // Failed read/parse; do not overwrite
  } finally {
    await lease.release().catch(() => {});
  }
}

export async function browserTestReport(input = {}, runner = runCanonicalBrowserTest, projectRoot = process.cwd(), loadState = async()=>({evidence:createBlockedEvidence()})) {
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw Error('BROWSER_TEST_NO_ARGUMENTS_ALLOWED');
  const {report,output}=await runner(projectRoot,{finalize:async report=>{
    const {evidence}=await loadState();
    if(!evidence.count)return report;
    return {...report,result:'FAIL',browserAcceptance:'FAIL',passed:false,policyCode:policyCodes.blocked,
      artifactIntegrity:{...report.artifactIntegrity,blockedWriteAttempts:(report.artifactIntegrity?.blockedWriteAttempts??0)+evidence.count,
        blockedWriteEvidence:[...(report.artifactIntegrity?.blockedWriteEvidence??[]),...evidence.records].slice(0,32)}};
  }});
  let content=output;
  if(report.policyCode===policyCodes.blocked){
    content=output.replace(/FIGMA_BROWSER_TEST:\s*(PASS|WARN)/g,'FIGMA_BROWSER_TEST: FAIL');
    if(!content.includes('FIGMA_BROWSER_TEST: FAIL'))content+='\nFIGMA_BROWSER_TEST: FAIL';
  }
  return {content,metadata:report,report};
}

export async function installBrowserTestWorkflow(ctx, options = {}) {
  const runner = options.runner ?? runCanonicalBrowserTest;
  const projectRoot = options.projectRoot ?? ctx.location?.directory ?? process.cwd();

  const buildLeases = new Map();
  const releaseBuild=async(sessionID,record)=>{
    if(buildLeases.get(sessionID)!==record)return;
    clearInterval(record.timer);
    // Remove exactly this generation before awaiting nested finite operations.
    buildLeases.delete(sessionID);
    await record.lease.release();
  };
  const stateQueues=new Map();
  const changeState=(sessionID,update)=>{
    const prior=stateQueues.get(sessionID)??Promise.resolve();
    const next=prior.catch(()=>{}).then(async()=>{
      const state=await getTurnState(ctx,sessionID),result=await update(state);
      await saveTurnState(ctx,sessionID,state);
      return result;
    });
    stateQueues.set(sessionID,next);
    return next.finally(()=>{if(stateQueues.get(sessionID)===next)stateQueues.delete(sessionID);});
  };

  await ctx.tool.transform(editor => {
    editor.add({
      name: 'browser_test_report',
      description: 'Strictly artifact-read-only Figma browser test. Runs the canonical Playwright test suite against existing browser artifacts; reports findings and never repairs.',
      input: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      options: {
        namespace: 'figma',
        permission: browserTestTool,
        codemode: false,
      },
      execute: async (input, toolCtx) => {
        const sessionID = toolCtx?.sessionID;
        if (!sessionID || typeof sessionID !== 'string') {
          throw new Error('FIGMA_BROWSER_TEST_FAILCLOSED: missing sessionID in tool execution context');
        }
        if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw Error('BROWSER_TEST_NO_ARGUMENTS_ALLOWED');
        if(!await ctx.storage.get(guardStorageKey(sessionID)))throw Error('FIGMA_BROWSER_TEST_FAILCLOSED: guard not active for session');
        await changeState(sessionID,state=>{
          if(state.hasRun)throw Error('BROWSER_TEST_ALREADY_EXECUTED: at most one canonical browser test run allowed per turn');
          state.hasRun=true;
        });
        const result=await browserTestReport(input,runner,projectRoot,()=>changeState(sessionID,state=>state));
        await changeState(sessionID,state=>{state.reportSummary={result:result.report.result,policyCode:result.report.policyCode??null,generatedAt:result.report.generatedAt??null};});
        // A late denied tool cannot cause a second runner invocation.
        const latest=await getTurnState(ctx,sessionID);
        if(latest.evidence.count>(result.report.artifactIntegrity?.blockedWriteAttempts??0))await updateReportWithBlockedEvidence(projectRoot,latest);
        return result;
      },
    });
  });

  await ctx.session.hook('prompt', async event => {
    const text = event.prompt.text || '';
    const isTestMarker = text.includes(browserTestMarker) ||
                         /^\s*\/figma\/browser-test(?:\s|$)/.test(text) ||
                         event.metadata?.figmaIntent === 'browser_test';

    const previousBuild=buildLeases.get(event.sessionID);
    if(previousBuild){
      const messages=await ctx.session.context({sessionID:event.sessionID});
      if(messages.at(-1)?.type==='idle'&&buildLeases.get(event.sessionID)===previousBuild)await releaseBuild(event.sessionID,previousBuild);
    }
    if (isTestMarker) {
      const isAlreadyActive = await ctx.storage.get(guardStorageKey(event.sessionID));
      if (isAlreadyActive) {
        let isIdle = false;
        try {
          const messages = await ctx.session.context({ sessionID: event.sessionID });
          isIdle = messages.at(-1)?.type === 'idle';
        } catch {}
        if (isIdle) {
          await ctx.storage.set(guardStorageKey(event.sessionID), true);
          await saveTurnState(ctx, event.sessionID, { hasRun: false, evidence: createBlockedEvidence(), reportSummary: null });
        } else {
          // Mid-turn steering or queued prompt; retain existing state
          await ctx.storage.set(guardStorageKey(event.sessionID), true);
        }
      } else {
        await ctx.storage.set(guardStorageKey(event.sessionID), true);
        await saveTurnState(ctx, event.sessionID, { hasRun: false, evidence: createBlockedEvidence(), reportSummary: null });
      }
    } else if (await ctx.storage.get(guardStorageKey(event.sessionID))) {
      let isIdle = false;
      try {
        const messages = await ctx.session.context({ sessionID: event.sessionID });
        isIdle = messages.at(-1)?.type === 'idle';
      } catch {}
      if (isIdle) {
        await clearTurnState(ctx, event.sessionID);
      }
    }

    const isBuild = (text.includes(browserBuildMarker) ||
                     /^\s*\/figma\/browser(?:\s|$)/.test(text) ||
                     event.metadata?.figmaIntent === 'browser_generation') &&
                    !text.includes(browserTestMarker) &&
                    !/^\s*\/figma\/browser-test(?:\s|$)/.test(text) &&
                    event.metadata?.figmaIntent !== 'browser_test';

    if (isBuild && !await ctx.storage.get(guardStorageKey(event.sessionID)) && !buildLeases.has(event.sessionID)) {
      const lease = await acquireBrowserArtifactLease(projectRoot, 'BUILD');
      const record={lease,timer:null,polling:false,priorLength:null,sawActive:false};
      buildLeases.set(event.sessionID,record);
      try{record.priorLength=(await ctx.session.context({sessionID:event.sessionID})).length;}catch{}
      if(buildLeases.get(event.sessionID)!==record)return;
      const poll=async()=>{
        if(record.polling||buildLeases.get(event.sessionID)!==record)return;
        record.polling=true;
        try{
          const messages=await ctx.session.context({sessionID:event.sessionID});
          if(buildLeases.get(event.sessionID)!==record)return;
          const last=messages.at(-1)?.type;
          if(last&&last!=='idle')record.sawActive=true;
          if(last==='idle'&&(record.sawActive||record.priorLength!==null&&messages.length>record.priorLength))await releaseBuild(event.sessionID,record);
        }catch{}finally{record.polling=false;}
      };
      record.timer=setInterval(poll,50);record.timer.unref?.();
    }
  });

  await ctx.session.hook('context', async event => {
    if (!await ctx.storage.get(guardStorageKey(event.sessionID))) return;
    event.system.push({
      type: 'text',
      text: 'FIGMA_BROWSER_TEST_GUARD: ACTIVE. Browser test is strictly artifact-read-only. Call figma_browser_test_report directly for the canonical test execution; no arguments are permitted. Only inspection tools (read, glob, grep) and the canonical test tool are allowed. Shell, bash, Node, execute/Code Mode, file writes, edits, authoring, and delegation tools are forbidden and blocked before execution. At most one test run is permitted per turn. Do not modify or repair generated prototype artifacts.',
    });
  });

  await ctx.tool.hook('execute.before', async event => {
    const isGuarded = await ctx.storage.get(guardStorageKey(event.sessionID));

    if (isGuarded) {
      const state = await getTurnState(ctx, event.sessionID);

      if (!isBrowserTestToolAllowed(event.tool)) {
        const latest=await changeState(event.sessionID,current=>{
          const category=categorizeTool(event.tool,event.input);
          recordBlockedAttempt(current.evidence,{category,relativePath:extractSafeRelativePath(event.input),operationClass:category});
          return current;
        });
        if(latest.hasRun)await updateReportWithBlockedEvidence(projectRoot,latest);
        throw new Error(`FIGMA_BROWSER_TEST_READ_ONLY: blocked tool ${event.tool}`);
      }

      if (event.tool === browserTestTool) {
        if (state.hasRun) {
          const latest=await changeState(event.sessionID,current=>{
            recordBlockedAttempt(current.evidence,{category:'UNKNOWN'});return current;
          });
          await updateReportWithBlockedEvidence(projectRoot,latest);
          throw new Error('FIGMA_BROWSER_TEST_READ_ONLY: at most one canonical test run is allowed per turn');
        }
      }
    } else {
      const leaseState = await browserArtifactLeaseState(projectRoot);
      if (leaseState === 'TEST' || leaseState === 'UNVERIFIED') {
        if (!isFrozenAllowedTool(event.tool)) {
          throw new Error(`BROWSER_TEST_FROZEN: tool blocked during active browser test freeze (${event.tool})`);
        }
      }
    }
  });

  await ctx.permission.hook('evaluate', async event => {
    const isGuarded = await ctx.storage.get(guardStorageKey(event.sessionID));

    if (isGuarded) {
      if (!isBrowserTestToolAllowed(event.action)) {
        event.effect = 'deny';
        event.message = `FIGMA_BROWSER_TEST_READ_ONLY: blocked permission ${event.action}`;
      }
    } else {
      const leaseState = await browserArtifactLeaseState(projectRoot);
      if (leaseState === 'TEST' || leaseState === 'UNVERIFIED') {
        if (!isFrozenAllowedTool(event.action)) {
          event.effect = 'deny';
          event.message = `BROWSER_TEST_FROZEN: tool blocked during active browser test freeze (${event.action})`;
        }
      }
    }
  });

  await installBrowserWorkspaceCapabilities(ctx,projectRoot,{isBuild:id=>buildLeases.has(id),inspectionTools:allowedFigmaReads,...options.capabilities});
  return {
    buildLeases,
  };
}

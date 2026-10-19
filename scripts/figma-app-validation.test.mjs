import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {validationFixture} from './fixtures/app-validation.mjs';
import {qaView,browserView,qaEvidence,resultContractVersion} from '../app/shared/result-contract.mjs';
import {Validation} from '../app/server/validation.mjs';

for(const [kind,expected]of[['PASS','PASS'],['WARN','WARN'],['FAIL','FAIL'],['UNKNOWN','WARN'],['LIMITATION','WARN']])test('structured QA '+kind+' preserves canonical counts and findings',()=>{const f=validationFixture(kind),v=f.view().qa;assert.equal(v.status,expected);assert.equal(v.counts.brokenControls,f.result.coverage.BROKEN);assert.deepEqual(v.findings.map(x=>[x.id,x.severity,x.problem]),f.result.findings.map(x=>[x.id,x.severity,x.problem]));});
test('old QA PASS becomes STALE, with its historical result retained',()=>{const f=validationFixture();const v=qaView(f.qa,{document:{...f.document,sha256:'a'.repeat(64)},source:f.source,projectionVersion:'figma-browser-source-v1'});assert.equal(v.status,'STALE');assert.equal(v.lastStatus,'PASS');});
test('missing QA and absent current source cannot invent a current PASS',()=>{assert.equal(qaView().freshness,'UNAVAILABLE');assert.equal(qaView(validationFixture().qa).status,'UNVERIFIED');});
test('QA integrity failure is separate and cannot be green',()=>{const f=validationFixture('INTEGRITY'),v=f.view().qa;assert.equal(v.integrity.status,'FAILED');assert.equal(v.status,'FAIL');const q=validationFixture().qa;q.wholeRunIntegrity='CHANGED';assert.equal(qaView(q).status,'FAIL');});
test('unsupported QA adapter version fails closed',()=>{const q=validationFixture().qa;q.contractVersion='future';assert.equal(qaView(q).status,'NOT_RUN');assert.equal(qaView(q).freshness,'UNVERIFIED');});
test('browser without artifacts is NOT_BUILT, not a fabricated failure',()=>{const v=browserView();assert.equal(v.browser.buildState,'NOT_BUILT');assert.equal(v.browser.acceptance,'NOT_RUN');});
for(const freshness of ['CURRENT','STALE','UNVERIFIED'])test('browser freshness '+freshness+' remains independent from acceptance',()=>{const f=validationFixture();f.state.sourceFreshness=freshness;f.state.overallFreshness=freshness;const v=f.view();assert.equal(v.browser.freshness,freshness);assert.equal(v.browser.acceptance,freshness==='CURRENT'?'PASS':freshness);});
test('browser-test FAIL is rendered even when the source is current',()=>{const f=validationFixture('FIDELITY_FAIL');assert.equal(f.view().browser.acceptance,'FAIL');assert.equal(f.view().browser.freshness,'CURRENT');});
test('current cannot be asserted for an unbound report or unknown report version',()=>{const f=validationFixture();f.report.exportRunId='other';assert.equal(f.view().browser.testFreshness,'UNVERIFIED');f.report.version=999;assert.equal(f.view().browser.acceptance,'UNVERIFIED');});
test('motion absence is UNVERIFIED; compatible tested rows retain exact results',()=>{const f=validationFixture();assert.equal(f.view().motion.status,'UNVERIFIED');f.manifest.motion={contractVersion:'1.3.1'};f.report.motion={contractVersion:'1.3.1',results:[{token:'NAV_DEFAULT',mode:'normal',parity:'TIMING_BOUNDED',passed:true}]};assert.equal(f.view().motion.status,'PASS');f.report.motion.results[0].passed=false;assert.equal(f.view().motion.status,'FAIL');});
for(const [kind,status]of[['PASS','PASS'],['FIDELITY_WARN','WARN'],['FIDELITY_FAIL','FAIL']])test('source fidelity '+status+' is copied from the analyzer',()=>{const f=validationFixture(kind);assert.equal(f.view().fidelity.sourceFidelity,status);assert.equal(f.view().fidelity.coverage.NODES_COMPARED,f.report.fidelity.coverage.NODES_COMPARED);});
test('font and complex-property limitations are not converted into defects',()=>{for(const kind of['FONT','COMPLEX']){const v=validationFixture(kind).view().fidelity;assert.ok(v.findings.some(f=>f.severity==='LIMITATION'));assert.equal(v.sourceFidelity,'WARN');}assert.equal(validationFixture('FONT').view().fidelity.fonts[0].browser[0],'Courier New');});
test('native comparison WARN and unverified parity stay independent from source fidelity',()=>{const f=validationFixture();assert.equal(f.view().fidelity.nativeRenderParity,'UNVERIFIED');f.report.fidelity.NATIVE_RENDER_PARITY='WARN';const v=f.view().fidelity;assert.equal(v.nativeRenderParity,'WARN');assert.equal(v.sourceFidelity,'PASS');assert.equal(v.browserVisualRegression,'UNVERIFIED');assert.equal(v.figmaPixelParity,'UNVERIFIED');});
test('normalized evidence drops foreign fields, local paths and secrets',()=>{const f=validationFixture('FAIL');f.qa.privateSecret='private';f.qa.findings[0].actual='C:\\Users\\private\\report.txt\nBearer abcdef123456789';const v=JSON.stringify(qaView(f.qa));assert.doesNotMatch(v,/privateSecret|Users|abcdef123/);assert.match(v,/redacted/);});
test('malformed counts/findings never silently become zeros or PASS',()=>{const f=validationFixture();f.result.coverage.BROKEN='0';assert.throws(()=>qaEvidence(f.result));f.qa.counts.unknown=undefined;assert.equal(qaView(f.qa).freshness,'UNVERIFIED');});
async function store(t){const root=await mkdtemp(join(tmpdir(),'figma-validation-'));t.after(()=>rm(root,{recursive:true,force:true}));const f=validationFixture();const v=new Validation(root,{read:async tool=>{assert.equal(tool,'get_document');return f.page;},browser:async()=>f.state});await mkdir(v.browserRoot,{recursive:true});await writeFile(join(v.browserRoot,'figma-browser.json'),JSON.stringify(f.manifest));await writeFile(join(v.browserRoot,'figma-browser-test.json'),JSON.stringify(f.report));return {root,f,v};}
test('QA persistence is bounded, overwritten and only accepts trusted tool metadata',async t=>{const {f,v}=await store(t),run={mode:'QA',integrity:{state:'UNCHANGED'}},ctx=[{content:[{type:'tool',name:'figma_qa_report',state:{status:'completed',metadata:{qaResult:f.qa}}}]}];await v.capture(run,ctx);assert.equal((await v.get()).qa.status,'PASS');await v.capture(run,ctx);assert.equal(JSON.parse(await readFile(v.qaFile,'utf8')).contractVersion,resultContractVersion);await v.capture({mode:'DESIGN'},[{content:[{type:'text',text:'QA PASS 100 controls'}]}]);assert.equal(run.validation.status,'PASS');});
test('corrupted local results fail closed without a crash or raw file disclosure',async t=>{const {v}=await store(t);await mkdir(join(v.root,'.figma-designer/app'),{recursive:true});await writeFile(v.qaFile,'{');await writeFile(join(v.browserRoot,'figma-browser-test.json'),'{');const r=await v.get();assert.equal(r.qa.freshness,'UNVERIFIED');assert.equal(r.browser.acceptance,'UNVERIFIED');assert.doesNotMatch(JSON.stringify(r),/figma-validation-/);});
test('report symlinks cannot become arbitrary local file reads',async t=>{const {root,v}=await store(t),outside=join(root,'secret.json');await writeFile(outside,'{"secret":"do-not-return"}');await rm(join(v.browserRoot,'figma-browser-test.json'));await symlink(outside,join(v.browserRoot,'figma-browser-test.json'));const r=await v.get();assert.equal(r.evidence.test,'UNVERIFIED');assert.doesNotMatch(JSON.stringify(r),/do-not-return/);});

test('whole-run mutation is recorded prominently even without a trusted collector payload',async t=>{const {v,f}=await store(t);await v.capture({mode:'QA',integrity:{state:'CHANGED',beforeFingerprint:f.document.sha256,afterFingerprint:'b'.repeat(64)}},[]);const r=await v.get();assert.equal(r.qa.status,'FAIL');assert.equal(r.qa.integrity.status,'FAILED');assert.deepEqual(r.qa.counts,{});assert.deepEqual(r.qa.findings,[]);});
test('malformed but parseable report rows cannot crash or fabricate supported evidence',()=>{const f=validationFixture();f.report.fidelity.findings=[null];assert.equal(f.view().fidelity.sourceFidelity,'UNVERIFIED');f.report.tests=[null];assert.equal(f.view().browser.acceptance,'UNVERIFIED');});
test('local artifact drift cannot masquerade as a current preview even when Figma source is current',()=>{const f=validationFixture();f.state.localFreshness=f.state.overallFreshness='STALE';assert.equal(f.view().browser.freshness,'STALE');assert.equal(f.view().browser.sourceFreshness,'CURRENT');});
test('a report replaced during canonical freshness collection cannot borrow the new report status',async t=>{const {v,f}=await store(t);v.browser=async()=>{await writeFile(join(v.browserRoot,'figma-browser-test.json'),JSON.stringify({...f.report,result:'FAIL'}));return f.state;};const r=await v.get();assert.equal(r.browser.testFreshness,'UNVERIFIED');assert.notEqual(r.browser.acceptance,'PASS');});
test('a claimed unchanged result without complete before fingerprints remains unverified',()=>{const f=validationFixture();f.qa.integrity.before.document=null;const v=f.view().qa;assert.equal(v.integrity.status,'UNVERIFIED');assert.equal(v.freshness,'UNVERIFIED');assert.notEqual(v.status,'PASS');});
test('credential query values in validation details are redacted',()=>{const f=validationFixture();f.report.tests[0].detail='Unexpected https://example.test/?token=private-query-value&api_key=another-private-value';const v=JSON.stringify(f.view());assert.doesNotMatch(v,/private-query-value|another-private-value/);assert.match(v,/redacted/);});

for(const contradiction of [
  {changedFileCount:0,changedFiles:[{relativePath:'.figma-designer/browser-prototype/index.html'}]},
  {blockedWriteAttempts:0,blockedWriteEvidence:[{workflow:'BROWSER_TEST',category:'WRITE',blocked:true,timestamp:'2026-10-19T00:00:00.000Z'}]},
  {blockedWriteAttempts:undefined,blockedWriteEvidence:[{workflow:'BROWSER_TEST',category:'WRITE',blocked:true,timestamp:'2026-10-19T00:00:00.000Z'}]},
  {blockedWriteAttempts:-1}
])test('contradictory saved integrity cannot project normal PASS: '+JSON.stringify(contradiction),()=>{
  const f=validationFixture();
  f.report.artifactIntegrity={status:'UNCHANGED',protectedFileCount:5,changedFileCount:0,changedFiles:[],blockedWriteAttempts:0,blockedWriteEvidence:[],...contradiction};
  const browser=f.view().browser;
  assert.equal(browser.artifactIntegrity.status,'UNVERIFIED');
  assert.equal(browser.acceptance,'FAIL');assert.equal(browser.lastAcceptance,'FAIL');
  if(contradiction.blockedWriteEvidence)assert.ok(browser.artifactIntegrity.blockedWriteAttempts>=1);
});
test('natural AUTO browser-test structured FAIL dominates model prose PASS',async t=>{
  const {f,v}=await store(t);
  const generatedAt=f.report.generatedAt;
  await writeFile(join(v.browserRoot,'figma-browser-test.json'),JSON.stringify({...f.report,result:'FAIL',generatedAt}));
  const run={mode:'AUTO',state:'COMPLETED',result:'Task completed successfully.\nFIGMA_BROWSER_TEST: PASS'};
  const ctx=[{content:[{type:'tool',name:'figma_browser_test_report',state:{status:'completed',metadata:{...f.report,result:'FAIL',generatedAt}}}]}];
  await v.capture(run,ctx);
  assert.equal(run.validation.kind,'BROWSER_TEST');
  assert.equal(run.validation.status,'FAIL');
  assert.equal(run.validation.generatedAt,generatedAt);
  assert.match(run.result,/FIGMA_BROWSER_TEST: FAIL/);
  assert.doesNotMatch(run.result,/FIGMA_BROWSER_TEST: PASS/);
});
test('natural AUTO absorbs late blocked attempt from correlated disk report',async t=>{
  const {f,v}=await store(t);
  const generatedAt=f.report.generatedAt;
  await writeFile(join(v.browserRoot,'figma-browser-test.json'),JSON.stringify({
    ...f.report,
    result:'FAIL',
    policyCode:'BROWSER_TEST_ARTIFACT_WRITE_BLOCKED',
    generatedAt,
    artifactIntegrity:{status:'UNCHANGED',protectedFileCount:5,changedFiles:[],blockedWriteAttempts:1,blockedWriteEvidence:[{workflow:'BROWSER_TEST',category:'WRITE',blocked:true,timestamp:generatedAt}]}
  }));
  const run={mode:'AUTO',state:'COMPLETED',result:'FIGMA_BROWSER_TEST: PASS'};
  const ctx=[{content:[{type:'tool',name:'figma_browser_test_report',state:{status:'completed',metadata:{...f.report,result:'PASS',generatedAt}}}]}];
  await v.capture(run,ctx);
  assert.equal(run.state,'FAILED');
  assert.equal(run.error.code,'BROWSER_TEST_ARTIFACT_WRITE_BLOCKED');
  assert.equal(run.validation.status,'FAIL');
  assert.equal(run.artifactIntegrity.blockedWriteAttempts,1);
  assert.match(run.result,/FIGMA_BROWSER_TEST: FAIL/);
});
test('absent or mismatched disk report fails conservatively and does not borrow another generation',async t=>{
  const {f,v}=await store(t);
  const oldGen='2026-10-18T00:00:00.000Z';
  await writeFile(join(v.browserRoot,'figma-browser-test.json'),JSON.stringify({...f.report,result:'PASS',generatedAt:oldGen}));
  const currentGen='2026-10-19T12:00:00.000Z';
  const run={mode:'AUTO',state:'COMPLETED',result:'FIGMA_BROWSER_TEST: PASS'};
  const ctx=[{content:[{type:'tool',name:'figma_browser_test_report',state:{status:'completed',metadata:{...f.report,result:'PASS',generatedAt:currentGen}}}]}];
  await v.capture(run,ctx);
  assert.equal(run.state,'FAILED');
  assert.equal(run.error.code,'BROWSER_TEST_ARTIFACT_INTEGRITY_UNVERIFIED');
  assert.equal(run.artifactIntegrity.status,'UNVERIFIED');
  assert.equal(run.validation.status,'FAIL');
});

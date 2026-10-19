import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import {join,relative} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {browserTestPaths,artifactDirectory,requiredArtifacts,normalizeArtifactPath,classifyArtifactPath,authorizeArtifactOperation,protectedArtifactSnapshot,compareArtifactSnapshots,createBlockedEvidence,recordBlockedAttempt,acquireBrowserArtifactLease,acquireBrowserBuildWrite,writeBrowserTestOutput,policyCodes} from '../rules/browser-test-artifact-guard.mjs';

async function fixture(fn){
 const root=await fs.mkdtemp(join(tmpdir(),'browser-read-only-'));
 const paths=browserTestPaths(root);await fs.mkdir(join(paths.artifacts,'assets'),{recursive:true});
 for(const name of requiredArtifacts)await fs.writeFile(join(paths.artifacts,name),'original '+name);
 await fs.writeFile(join(paths.artifacts,'assets/image.svg'),'<svg/>');
 try{await fn(root,paths);}finally{await fs.rm(root,{recursive:true,force:true});}
}
const target=artifactDirectory+'/index.html';
test('protected inventory includes required source evidence, all assets and unknown generated metadata but not report',()=>fixture(async(root,p)=>{
 await fs.writeFile(join(p.artifacts,'future-motion-state.json'),'{}');await fs.writeFile(p.report,'old report');
 const s=await protectedArtifactSnapshot(root);assert.equal(s.status,'CAPTURED');
 assert.deepEqual(s.files.map(f=>f.relativePath).sort(),[...requiredArtifacts,'assets/image.svg','future-motion-state.json'].map(n=>artifactDirectory+'/'+n).sort());
 const html=s.files.find(f=>f.relativePath===target);assert.equal(html.size,Buffer.byteLength('original index.html'));assert.equal(html.sha256,createHash('sha256').update('original index.html').digest('hex'));
}));
test('exact report is writable, report-like assets and temporary-looking inputs remain protected',()=>fixture(async(root)=>{
 for(const name of ['figma-browser-test.json.bak','assets/figma-browser-test.json','notes.tmp','partial.partial'])assert.equal((await classifyArtifactPath(root,artifactDirectory+'/'+name)).classification,'PROTECTED_INPUT');
 assert.equal((await classifyArtifactPath(root,artifactDirectory+'/figma-browser-test.json')).classification,'WRITABLE_TEST_OUTPUT');
}));
test('relative paths and dot segments normalize to canonical workspace paths',()=>fixture(async(root,p)=>{
 const n=await normalizeArtifactPath(root,'./'+artifactDirectory+'/./index.html');assert.equal(n.absolute,join(p.artifacts,'index.html'));assert.equal(n.relative,target);
}));
test('Windows separators cannot change classification',()=>fixture(async(root)=>assert.equal((await classifyArtifactPath(root,target.replaceAll('/','\\'))).classification,'PROTECTED_INPUT')));
test('Windows case aliases cannot turn an input into an output',()=>fixture(async(root)=>{
 if(process.platform==='win32')assert.equal((await classifyArtifactPath(root,target.toUpperCase())).classification,'PROTECTED_INPUT');
 else assert.equal((await classifyArtifactPath(root,target)).classification,'PROTECTED_INPUT');
}));
for(const spelling of ['../index.html',artifactDirectory+'/../index.html','C:\\outside\\index.html','//server/share/file','/outside/index.html',artifactDirectory+'/index.html:stream',artifactDirectory+'/index.html.',artifactDirectory+'/index.html ',artifactDirectory+'/NUL'])test('reject ambiguous/traversal path '+spelling,()=>fixture(async root=>assert.rejects(normalizeArtifactPath(root,spelling),{code:policyCodes.blocked})));
for(const operation of ['write','edit','append','delete','move','rename','copy','shell','node','powershell','formatter','build','regenerate','future-mutation'])test(operation+' cannot mutate protected inputs',()=>fixture(async(root,p)=>{
 const before=await fs.readFile(join(p.artifacts,'index.html')),e=createBlockedEvidence();
 let effects=0;
 await assert.rejects(async()=>{await authorizeArtifactOperation(root,{operation,path:target,destination:['move','rename','copy'].includes(operation)?artifactDirectory+'/styles.css':undefined},e);effects++;await fs.writeFile(join(p.artifacts,'index.html'),'changed');},{code:policyCodes.blocked});
 assert.equal(effects,0);assert.deepEqual(await fs.readFile(join(p.artifacts,'index.html')),before);assert.equal(e.count,1);
 assert.equal(compareArtifactSnapshots(await protectedArtifactSnapshot(root),await protectedArtifactSnapshot(root),e).blockedWriteAttempts,1);
}));
test('replacement-copy and rename reject protected destinations even from allowed report output',()=>fixture(async(root,p)=>{
 for(const operation of ['copy','rename','move'])await assert.rejects(authorizeArtifactOperation(root,{operation,path:p.report,destination:join(p.artifacts,'app.js')}),{code:policyCodes.blocked});
}));
test('harmless protected reads are authorized',()=>fixture(async(root)=>{
 for(const operation of ['read','stat','list'])assert.equal((await authorizeArtifactOperation(root,{operation,path:target}))[0].classification,'PROTECTED_INPUT');
}));
test('report and screenshot writes work without changing protected SHA-256 values',()=>fixture(async(root,p)=>{
 const before=await protectedArtifactSnapshot(root);
 await writeBrowserTestOutput(root,p.report,JSON.stringify({result:'FAIL'}));await writeBrowserTestOutput(root,p.screenshot,Buffer.from('PNG diagnostic fixture'));
 assert.equal(JSON.parse(await fs.readFile(p.report)).result,'FAIL');assert.equal((await fs.readFile(p.screenshot)).toString(),'PNG diagnostic fixture');
 assert.equal(compareArtifactSnapshots(before,await protectedArtifactSnapshot(root)).status,'UNCHANGED');
}));
test('temporary output is explicitly separate from frozen inputs',()=>fixture(async(root,p)=>{
 const path=join(p.outputs,'temporary/diagnostic.tmp');assert.equal((await classifyArtifactPath(root,path)).classification,'TEMPORARY_TEST_OUTPUT');
 await writeBrowserTestOutput(root,path,'temporary');assert.equal(await fs.readFile(path,'utf8'),'temporary');
 await assert.rejects(writeBrowserTestOutput(root,join(p.outputs,'source.js'),'not allowed'),{code:policyCodes.blocked});
}));
test('before/after snapshot exposes CHANGED without restoring unexpected bytes',()=>fixture(async(root,p)=>{
 const before=await protectedArtifactSnapshot(root);await fs.writeFile(join(p.artifacts,'index.html'),'unexpected external mutation');
 const r=compareArtifactSnapshots(before,await protectedArtifactSnapshot(root));assert.equal(r.status,'CHANGED');assert.equal(r.changedFileCount,1);assert.equal(r.changedFiles[0].relativePath,target);assert.notEqual(r.changedFiles[0].before.sha256,r.changedFiles[0].after.sha256);assert.equal(await fs.readFile(join(p.artifacts,'index.html'),'utf8'),'unexpected external mutation');
}));
test('new and deleted protected inputs are changes, not ignored freshness noise',()=>fixture(async(root,p)=>{
 const before=await protectedArtifactSnapshot(root);await fs.unlink(join(p.artifacts,'app.js'));await fs.writeFile(join(p.artifacts,'extra.json'),'new');
 const r=compareArtifactSnapshots(before,await protectedArtifactSnapshot(root,{requireInputs:false}));assert.equal(r.status,'CHANGED');assert.equal(r.changedFileCount,2);
}));
test('missing required input fails capture and cannot certify UNCHANGED',()=>fixture(async(root,p)=>{
 await fs.unlink(join(p.artifacts,'figma-source.json'));const s=await protectedArtifactSnapshot(root);assert.equal(s.status,'UNVERIFIED');assert.equal(compareArtifactSnapshots(s,s).status,'UNVERIFIED');
}));
test('capture failure is UNVERIFIED even with a valid other snapshot',()=>fixture(async(root)=>{
 const s=await protectedArtifactSnapshot(root);for(const [a,b] of [[s,null],[null,s],[s,{status:'UNVERIFIED',files:[]}]])assert.equal(compareArtifactSnapshots(a,b).status,'UNVERIFIED');
}));
test('bounded blocked evidence never echoes absolute paths, credentials, tool commands or unknown operation data',()=>{
 const e=createBlockedEvidence();for(let i=0;i<100;i++)recordBlockedAttempt(e,{category:'TOKEN=secret',relativePath:'C:/Users/private/credential-secret',operationClass:'prompt-secret'});
 assert.equal(e.count,100);assert.equal(e.records.length,32);for(const row of e.records){assert.equal(row.category,'UNKNOWN');assert.equal(row.relativePath,null);assert.equal(row.workflow,'BROWSER_TEST');assert.equal(row.blocked,true);assert.ok(Number.isFinite(Date.parse(row.timestamp)));}
 assert.doesNotMatch(JSON.stringify(e),/secret|Users|credential|TOKEN|prompt/);
});
test('Browser Build authorization stays writable outside Test',()=>fixture(async(root,p)=>{
 await authorizeArtifactOperation(root,{workflow:'BROWSER_BUILD',operation:'write',path:target});await fs.writeFile(join(p.artifacts,'index.html'),'built');assert.equal(await fs.readFile(join(p.artifacts,'index.html'),'utf8'),'built');
}));
test('frozen Test rejects Build and competing Test leases until completion',()=>fixture(async root=>{
 const lease=await acquireBrowserArtifactLease(root,'TEST');try{for(const kind of ['BUILD','TEST'])await assert.rejects(acquireBrowserArtifactLease(root,kind),{code:policyCodes.busy});await assert.rejects(acquireBrowserBuildWrite(root),{code:policyCodes.busy});}finally{await lease.release();}
 const build=await acquireBrowserArtifactLease(root,'BUILD');await build.release();
}));
test('Build excludes Test through nested source collectors and finalization',()=>fixture(async root=>{
 const build=await acquireBrowserArtifactLease(root,'BUILD'),source=await acquireBrowserBuildWrite(root);
 let released=false;const closing=build.release().then(()=>released=true);await new Promise(r=>setTimeout(r,40));assert.equal(released,false);
 await assert.rejects(acquireBrowserArtifactLease(root,'TEST'),{code:policyCodes.busy});await source.release();await closing;
 const testLease=await acquireBrowserArtifactLease(root,'TEST');await testLease.release();
}));
test('hardlink output cannot overwrite a protected inode',()=>fixture(async(root,p)=>{
 await fs.link(join(p.artifacts,'index.html'),p.report);await assert.rejects(writeBrowserTestOutput(root,p.report,'overwrite'),{code:policyCodes.blocked});assert.equal(await fs.readFile(join(p.artifacts,'index.html'),'utf8'),'original index.html');
}));
test('symlink or junction output cannot redirect writes into protected inputs',()=>fixture(async(root,p)=>{
 await fs.symlink(p.artifacts,p.outputs,process.platform==='win32'?'junction':'dir');await assert.rejects(writeBrowserTestOutput(root,p.screenshot,'overwrite'),{code:policyCodes.blocked});assert.equal(await fs.readFile(join(p.artifacts,'index.html'),'utf8'),'original index.html');
}));

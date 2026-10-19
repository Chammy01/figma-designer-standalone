import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink,link} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {installBrowserWorkspaceCapabilities} from '../rules/browser-workspace-capabilities.mjs';
import {browserTestPaths,requiredArtifacts,artifactDirectory,acquireBrowserArtifactLease,policyCodes} from '../rules/browser-test-artifact-guard.mjs';
import {beginExport,finishExport} from './figma-browser-source.mjs';

async function fixture(fn){
 const root=await mkdtemp(join(tmpdir(),'browser-finite-')),paths=browserTestPaths(root);
 await mkdir(paths.artifacts,{recursive:true});for(const name of requiredArtifacts)await writeFile(join(paths.artifacts,name),'original '+name);
 try{await fn(root,paths);}finally{await rm(root,{recursive:true,force:true});}
}
async function harness(root,{build=true,formatter=true,tools=[]}={}){
 const hooks={},registry=new Map(tools.map(t=>[t.id,t]));
 const add=(name,fn)=>(hooks[name]??=[]).push(fn);
 const ctx={session:{hook:async(n,fn)=>add(n,fn)},permission:{hook:async(n,fn)=>add('permission.'+n,fn)},tool:{hook:async(n,fn)=>add(n,fn),transform:async fn=>fn({list:()=>[...registry.values()],remove:id=>registry.delete(id),update:(id,fn)=>fn(registry.get(id)),add:t=>{const id=(t.options?.namespace?t.options.namespace+'_':'')+t.name;registry.set(id,{...t,id});}})}};
 await installBrowserWorkspaceCapabilities(ctx,root,{isBuild:id=>build&&id==='build',inspectionTools:new Set(['read','glob','grep','figma_get_document']),formatterDisabled:()=>formatter});
 return {registry,call:async(name,event)=>{for(const fn of hooks[name]??[])await fn(event);}};
}
const context={sessionID:'build',messageID:'message',id:'unique-call'};
for(const tool of ['shell','node','powershell','execute','task','subagent','opencode','figma_future_write','future-operation'])test('workspace denies '+tool+' before a background writer can be created',()=>fixture(async(root,p)=>{
 let effects=0;const h=await harness(root,{tools:[{id:tool,name:tool,execute:async()=>{effects++;await writeFile(join(p.artifacts,'index.html'),'changed');}}]});
 assert.equal(h.registry.has(tool),false);
 await assert.rejects(h.call('execute.before',{sessionID:'ordinary',tool}),/BROWSER_WORKSPACE_CAPABILITY_BLOCKED/);
 const permission={sessionID:'ordinary',action:tool,effect:'allow'};await h.call('permission.evaluate',permission);assert.equal(permission.effect,'deny');
 assert.equal(effects,0);assert.equal(await readFile(join(p.artifacts,'index.html'),'utf8'),'original index.html');
}));
test('finite Build edits remain writable and cannot rewrite configuration or collector-owned evidence',()=>fixture(async(root,p)=>{
 const tool={id:'write',name:'write',execute:async input=>{await writeFile(input.path,input.content);return {content:'written'};}};
 const h=await harness(root,{tools:[tool]});
 await h.registry.get('write').execute({path:join(p.artifacts,'index.html'),content:'new build'},context);
 assert.equal(await readFile(join(p.artifacts,'index.html'),'utf8'),'new build');
 for(const path of [join(root,'opencode.json'),join(root,'.opencode/plugins/injected.js'),join(p.artifacts,'figma-source.json'),join(p.artifacts,'FIGMA-SOURCE.JSON')])await assert.rejects(h.registry.get('write').execute({path,content:'injection'},context));
 assert.equal(await readFile(join(p.artifacts,'figma-source.json'),'utf8'),'original figma-source.json');
}));
test('native formatter precondition fails closed before any finite write',()=>fixture(async(root,p)=>{
 let effects=0;const h=await harness(root,{formatter:false,tools:[{id:'edit',name:'edit',execute:async()=>{effects++;}}]});
 await assert.rejects(h.registry.get('edit').execute({path:join(p.artifacts,'index.html')},context));
 assert.equal(effects,0);assert.equal(await readFile(join(p.artifacts,'index.html'),'utf8'),'original index.html');
}));
test('finite file permissions do not leak to ordinary authoring sessions',()=>fixture(async root=>{
 const h=await harness(root);
 for(const action of ['edit','write','patch']){const event={sessionID:'ordinary',action,effect:'allow'};await h.call('permission.evaluate',event);assert.equal(event.effect,'deny');}
}));
for(const target of ['../../rules/guard.mjs','../opencode.json'])test('every patch destination is checked: '+target,()=>fixture(async(root,p)=>{
 let effects=0;const h=await harness(root,{tools:[{id:'patch',name:'patch',execute:async()=>{effects++;}}]});
 const patchText=`*** Begin Patch\n*** Update File: ${artifactDirectory}/index.html\n*** Move to: ${target}\n@@\n-original\n+changed\n*** End Patch`;
 await assert.rejects(h.registry.get('patch').execute({patchText},context));assert.equal(effects,0);assert.equal(await readFile(join(p.artifacts,'index.html'),'utf8'),'original index.html');
}));
test('later patch operations cannot hide an out-of-bound delete or unsupported syntax',()=>fixture(async(root,p)=>{
 let effects=0;const h=await harness(root,{tools:[{id:'patch',name:'patch',execute:async()=>{effects++;}}]});
 for(const tail of ['*** Delete File: opencode.json','*** Move File: opencode.json']){
  await assert.rejects(h.registry.get('patch').execute({patchText:`*** Begin Patch\n*** Add File: ${artifactDirectory}/new.txt\n+new\n${tail}\n*** End Patch`},context));
 }
 assert.equal(effects,0);
}));
test('a finite admitted callback atomically excludes freeze until it finishes, including error cleanup',()=>fixture(async(root,p)=>{
 let finish,started;const running=new Promise(r=>started=r);
 const h=await harness(root,{tools:[{id:'figma_save_screenshots',name:'save_screenshots',options:{namespace:'figma'},execute:async()=>{started();await new Promise(r=>finish=r);throw Error('Finite operation failed');}}]});
 const active=h.registry.get('figma_save_screenshots').execute({items:[{outputPath:p.screenshot}]},{...context,sessionID:'ordinary'});
 await running;await assert.rejects(acquireBrowserArtifactLease(root,'TEST'),{code:policyCodes.busy});
 finish();await assert.rejects(active,/Finite operation failed/);
 const lease=await acquireBrowserArtifactLease(root,'TEST');await lease.release();
}));
test('dispatch admitted before freeze cannot execute its finite callback after freeze wins the lease',()=>fixture(async(root,p)=>{
 let effects=0;const h=await harness(root,{tools:[{id:'figma_save_screenshots',name:'save_screenshots',execute:async()=>{effects++;}}]});
 await h.call('execute.before',{sessionID:'ordinary',tool:'figma_save_screenshots'});
 const frozen=await acquireBrowserArtifactLease(root,'TEST');
 try{await assert.rejects(h.registry.get('figma_save_screenshots').execute({items:[{outputPath:p.screenshot}]},{...context,sessionID:'ordinary'}),{code:policyCodes.busy});assert.equal(effects,0);}finally{await frozen.release();}
}));
test('filesystem exporters cannot overwrite protected artifacts or the canonical report',()=>fixture(async(root,p)=>{
 let effects=0;const h=await harness(root,{tools:[{id:'figma_save_screenshots',name:'save_screenshots',execute:async()=>{effects++;}}]});
 for(const outputPath of [join(p.artifacts,'index.html'),p.report,join(root,'opencode.json')])await assert.rejects(h.registry.get('figma_save_screenshots').execute({items:[{outputPath}]},{...context,sessionID:'ordinary'}));
 assert.equal(effects,0);assert.equal(await readFile(join(p.artifacts,'index.html'),'utf8'),'original index.html');
}));
for(const alias of ['symlink','hardlink'])test('fixed Build source writes reject '+alias+' targets before collection',()=>fixture(async(root,p)=>{
 const outside=join(root,'private-source.json');await writeFile(outside,'private bytes');
 const source=join(p.artifacts,'figma-source.json');await rm(source);
 if(alias==='symlink')await symlink(outside,source);else await link(outside,source);
 let reads=0;await assert.rejects(beginExport(p.artifacts,async()=>{reads++;throw Error('must not collect');}));
 assert.equal(reads,0);assert.equal(await readFile(outside,'utf8'),'private bytes');
}));
test('fixed finish binding rejects a hardlinked manifest without modifying its alias',()=>fixture(async(root,p)=>{
 const source=join(p.artifacts,'figma-source.json'),manifest=join(p.artifacts,'figma-browser.json'),outside=join(root,'private-manifest.json');
 await writeFile(source,'{}');await writeFile(outside,'private manifest');await rm(manifest);await link(outside,manifest);
 await assert.rejects(finishExport(p.artifacts,async()=>{throw Error('must not collect');}));assert.equal(await readFile(outside,'utf8'),'private manifest');
}));

for(const alias of ['outputpath','OutputPath','OUTPUTPATH'])test('case-colliding screenshot destination is rejected before file creation: '+alias,()=>fixture(async(root,p)=>{
 const forbidden=join(p.artifacts,'unapproved.png');
 const h=await harness(root,{tools:[{id:'figma_save_screenshots',name:'save_screenshots',execute:async input=>{
  await writeFile(input.items[0][alias],'unauthorized screenshot',{flag:'wx'});
 }}]});
 await assert.rejects(h.registry.get('figma_save_screenshots').execute({items:[{nodeId:'1:1',outputPath:p.screenshot,[alias]:forbidden}]},{...context,sessionID:'ordinary'}),/BROWSER_WORKSPACE_CAPABILITY_BLOCKED/);
 await assert.rejects(readFile(forbidden),{code:'ENOENT'});
 assert.equal(await readFile(join(p.artifacts,'index.html'),'utf8'),'original index.html');
}));

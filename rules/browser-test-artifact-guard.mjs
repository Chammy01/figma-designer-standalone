import {createHash,randomUUID} from 'node:crypto';
import {lstat,realpath,readdir,readFile,mkdir,writeFile,open,unlink,rmdir} from 'node:fs/promises';
import {resolve,relative,join,dirname,isAbsolute} from 'node:path';

export const browserTestMarker='FIGMA BROWSER TEST — ARTIFACT READ ONLY V1.5.1';
export const browserTestTool='figma_browser_test_report';
export const canonicalBrowserTestExecution='CANONICAL_BROWSER_TEST_V1_5_1';
export const artifactDirectory='.figma-designer/browser-prototype';
export const reportName='figma-browser-test.json';
export const requiredArtifacts=['index.html','styles.css','app.js','figma-browser.json','figma-source.json'];
export const browserBuildTools=['figma_browser_build_begin','figma_browser_build_finish'];
// Exact owned MCP 1.1.0 catalog; changing provider capability exposure does not change MCP.
export const approvedFigmaTools=new Set('add_page add_variable_mode align_nodes apply_style_to_node apply_styles_batch auto_layout_from_positions batch_rename_nodes bind_variable_to_node bind_variable_to_style clone_node combine_as_variants create_component create_component_from_html create_effect_style create_ellipse create_frame create_grid_style create_paint_style create_rectangle create_section create_styles_from_palette create_text create_text_scale create_text_style create_variable create_variable_collection delete_nodes delete_page delete_style delete_variable detach_instance diff_node_vs_html distribute_nodes explain_layout explain_node export_frames_to_pdf export_html_self_contained export_node_as_react export_tokens find_replace_text get_annotations get_design_context get_document get_document_revision get_fonts get_html get_local_components get_metadata get_node get_nodes_info get_operation_receipt get_pages get_reactions get_recent_errors get_screenshot get_selection get_styles get_variable_defs get_viewport group_nodes health_check import_design_tokens import_image inspect_node_as_html instantiate_by_name list_slides lock_nodes make_slide_grid move_nodes move_to_anchor navigate_to_page pack_grid patch_html regenerate_slide remove_reactions rename_node rename_page reorder_nodes reparent_nodes replace_image_globally resize_nodes rotate_nodes save_screenshots scan_nodes_by_types scan_text_nodes search_nodes set_auto_layout set_blend_mode set_constraints set_corner_radius set_effects set_fills set_instance_overrides_batch set_opacity set_reactions set_strokes set_text set_variable_value set_visible slide_template swap_component ungroup_nodes unlock_nodes update_node_props update_paint_style validate_html write_html write_html_batch'.split(' ').map(name=>'figma_'+name));
export const policyCodes={blocked:'BROWSER_TEST_ARTIFACT_WRITE_BLOCKED',changed:'BROWSER_TEST_ARTIFACT_INTEGRITY_VIOLATION',unverified:'BROWSER_TEST_ARTIFACT_INTEGRITY_UNVERIFIED',busy:'BROWSER_ARTIFACTS_BUSY'};
const maxEvidence=32;
const safeReads=new Set(['read','glob','grep']);
export const isBrowserTestReadTool=name=>safeReads.has(name);
export const isBrowserTestToolAllowed=name=>isBrowserTestReadTool(name)||name===browserTestTool;
export function browserTestPaths(projectRoot=process.cwd()){
 const workspace=resolve(projectRoot);
 return {workspace,artifacts:join(workspace,artifactDirectory),report:join(workspace,artifactDirectory,reportName),outputs:join(workspace,'.figma-designer/browser-test'),screenshot:join(workspace,'.figma-designer/browser-test/screenshots/start-screen.png'),lock:join(workspace,'.figma-designer/browser-artifacts.lock')};
}
function invalid(){return Object.assign(Error(policyCodes.blocked),{code:policyCodes.blocked});}
const key=path=>process.platform==='win32'?path.toLowerCase():path;
const within=(root,file)=>{const r=relative(key(root),key(file));return r===''||!r.startsWith('..')&&!isAbsolute(r);};
// Reject ambiguous Windows spellings even on POSIX so fixture policy is portable.
export async function normalizeArtifactPath(projectRoot,input){
 if(typeof input!=='string'||!input||input.includes('\0'))throw invalid();
 const spelling=input.replaceAll('\\','/');
 if(spelling.startsWith('//')||/^[a-z]:/i.test(spelling)&&process.platform!=='win32')throw invalid();
 const withoutDrive=spelling.replace(/^[a-z]:/i,'');
 if(withoutDrive.includes(':')||withoutDrive.split('/').some(p=>p==='..'||/[. ]$/.test(p)&&p!=='.'||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)))throw invalid();
 const workspace=await realpath(resolve(projectRoot));
 const file=resolve(workspace,spelling);
 if(!within(workspace,file))throw invalid();
 let cursor=workspace;
 const parts=relative(workspace,file).split(/[\\/]/).filter(Boolean);
 for(let i=0;i<parts.length;i++){
  cursor=join(cursor,parts[i]);
  let info;try{info=await lstat(cursor);}catch(error){if(error.code==='ENOENT'){cursor=join(cursor,...parts.slice(i+1));break;}throw invalid();}
  const actual=await realpath(cursor);
  if(info.isSymbolicLink()||!within(workspace,actual)||info.isFile()&&info.nlink!==1)throw invalid();
  cursor=actual;
 }
 return {absolute:cursor,relative:relative(workspace,cursor).replaceAll('\\','/')};
}
export async function classifyArtifactPath(projectRoot,input){
 const path=await normalizeArtifactPath(projectRoot,input),paths=browserTestPaths(await realpath(resolve(projectRoot)));
 if(key(path.absolute)===key(paths.report))return {...path,classification:'WRITABLE_TEST_OUTPUT'};
 if(within(paths.artifacts,path.absolute))return {...path,classification:'PROTECTED_INPUT'};
 // Diagnostics never share the protected input tree. Only explicitly supported formats.
 if(within(paths.outputs,path.absolute)){
  const suffix=relative(paths.outputs,path.absolute).replaceAll('\\','/');
  if(/^screenshots\/[a-z0-9-]{1,80}\.png$/i.test(suffix)||/^diagnostics\/[a-z0-9-]{1,80}\.(json|log|zip|pdf)$/i.test(suffix))return {...path,classification:'WRITABLE_TEST_OUTPUT'};
  if(/^temporary\/[a-z0-9-]{1,80}\.tmp$/i.test(suffix))return {...path,classification:'TEMPORARY_TEST_OUTPUT'};
 }
 return {...path,classification:'BUILD_ONLY_OUTPUT'};
}
export function createBlockedEvidence(){return {count:0,records:[]};}
export function recordBlockedAttempt(evidence,{category='UNKNOWN',relativePath=null,operationClass}={}){
 evidence.count=Math.min(Number.MAX_SAFE_INTEGER,evidence.count+1);
 const categories=['WRITE','EDIT','APPEND','DELETE','MOVE','RENAME','COPY','SHELL','NODE','POWERSHELL','FORMATTER','BUILD','UNKNOWN'];
 const safeCategory=categories.includes(category)?category:'UNKNOWN';
 // Evidence only identifies fixed owned inputs; never echo unknown arguments, commands or filenames.
 const safePath=typeof relativePath==='string'&&requiredArtifacts.some(n=>relativePath===artifactDirectory+'/'+n)?relativePath:null;
 const row={workflow:'BROWSER_TEST',category:safeCategory,relativePath:safePath,blocked:true,timestamp:new Date().toISOString()};
 if(categories.includes(operationClass))row.operationClass=operationClass;
 if(evidence.records.length<maxEvidence)evidence.records.push(row);
 return row;
}
export async function authorizeArtifactOperation(projectRoot,{workflow='BROWSER_TEST',operation,path,destination},evidence=createBlockedEvidence()){
 const reads=new Set(['read','stat','list']);
 const paths=await Promise.all([path,destination].filter(x=>x!==undefined).map(p=>classifyArtifactPath(projectRoot,p))).catch(()=>null);
 if(workflow==='BROWSER_BUILD'&&['write','edit','append','delete','move','rename','copy'].includes(operation)&&paths?.length&&paths.every(p=>p.classification==='PROTECTED_INPUT')&&!['TEST','UNVERIFIED'].includes(await browserArtifactLeaseState(projectRoot)))return paths;
 if(reads.has(operation)&&paths?.length)return paths;
 if(workflow==='BROWSER_TEST'&&['write','append','delete','move','rename','copy','edit'].includes(operation)&&paths?.length&&paths.every(p=>['WRITABLE_TEST_OUTPUT','TEMPORARY_TEST_OUTPUT'].includes(p.classification)))return paths;
 recordBlockedAttempt(evidence,{category:String(operation).toUpperCase(),relativePath:paths?.find(p=>p.classification==='PROTECTED_INPUT')?.relative});
 throw invalid();
}
export async function protectedArtifactSnapshot(projectRoot,{requireInputs=true}={}){
 const paths=browserTestPaths(projectRoot),files=[];
 try{
  await normalizeArtifactPath(projectRoot,paths.artifacts);
  if(requireInputs)for(const name of requiredArtifacts){const info=await lstat(join(paths.artifacts,name));if(!info.isFile())throw Error('Missing required input');}
  async function walk(dir){for(const entry of(await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
   const path=join(dir,entry.name),classified=await classifyArtifactPath(projectRoot,path);
   if(classified.classification!=='PROTECTED_INPUT')continue;
   if(entry.isDirectory())await walk(path);
   else if(entry.isFile()){
    const handle=await open(path,'r');try{const info=await handle.stat();if(info.nlink!==1)throw invalid();const bytes=await handle.readFile();const after=await handle.stat();if(info.size!==after.size||info.mtimeMs!==after.mtimeMs||info.ctimeMs!==after.ctimeMs)throw Error('Unstable input');files.push({relativePath:classified.relative,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}finally{await handle.close();}
   }else throw invalid();
  }}
  await walk(paths.artifacts);
  return {status:'CAPTURED',files:files.sort((a,b)=>a.relativePath.localeCompare(b.relativePath))};
 }catch{return {status:'UNVERIFIED',files:[]};}
}
export function compareArtifactSnapshots(before,after,evidence=createBlockedEvidence()){
 const base={protectedFileCount:before?.files?.length??0,changedFiles:[],blockedWriteAttempts:evidence.count,blockedWriteEvidence:evidence.records.slice(0,maxEvidence)};
 if(before?.status!=='CAPTURED'||after?.status!=='CAPTURED')return {status:'UNVERIFIED',...base};
 const a=new Map(before.files.map(f=>[f.relativePath,f])),b=new Map(after.files.map(f=>[f.relativePath,f]));
 const changed=[...new Set([...a.keys(),...b.keys()])].filter(p=>a.get(p)?.size!==b.get(p)?.size||a.get(p)?.sha256!==b.get(p)?.sha256);
 return {status:changed.length?'CHANGED':'UNCHANGED',...base,changedFiles:changed.slice(0,64).map(p=>({relativePath:p,before:a.get(p)?{size:a.get(p).size,sha256:a.get(p).sha256}:null,after:b.get(p)?{size:b.get(p).size,sha256:b.get(p).sha256}:null})),changedFileCount:changed.length};
}
// Atomic mkdir is shared across app, direct runner and OpenCode processes. No timeout-based stealing.
// An abandoned lease fails closed; no Build or Test is replayed to clear it.
export async function acquireBrowserArtifactLease(projectRoot,kind){
 if(!['BUILD','TEST'].includes(kind))throw invalid();
 const paths=browserTestPaths(projectRoot);
 await mkdir(dirname(paths.lock),{recursive:true});
 await normalizeArtifactPath(projectRoot,paths.lock);
 try{await mkdir(paths.lock);}catch(error){if(error.code==='EEXIST')throw Object.assign(Error(policyCodes.busy),{code:policyCodes.busy});throw error;}
 const token=randomUUID(),owner=join(paths.lock,'owner.json');
 try{await writeFile(owner,JSON.stringify({kind,token,pid:process.pid}),{flag:'wx'});}catch(error){await rmdir(paths.lock).catch(()=>{});throw error;}
 let released=false;
 return {kind,async release(){
  if(released)return;
  const value=JSON.parse(await readFile(owner,'utf8'));if(value.token!==token)throw invalid();
  // Existing source collectors may be nested inside the model Build lease.
  while((await readdir(paths.lock)).some(name=>name!=='owner.json'))await new Promise(r=>setTimeout(r,25));
  await unlink(owner);
  // A borrower racing owner removal must fail its ownership read before touching artifacts.
  for(;;){try{await rmdir(paths.lock);break;}catch(error){if(error.code!=='ENOTEMPTY')throw error;await new Promise(r=>setTimeout(r,25));}}
  released=true;
 }};
}
export async function acquireBrowserBuildWrite(projectRoot){
 try{return await acquireBrowserArtifactLease(projectRoot,'BUILD');}catch(error){if(error.code!==policyCodes.busy)throw error;}
 const {lock}=browserTestPaths(projectRoot),owner=join(lock,'owner.json');
 const before=JSON.parse(await readFile(owner,'utf8').catch(()=>'{\"kind\":\"UNKNOWN\"}'));
 if(before.kind!=='BUILD')throw Object.assign(Error(policyCodes.busy),{code:policyCodes.busy});
 const member=join(lock,'build-'+randomUUID()+'.lease');
 await writeFile(member,'',{flag:'wx'});
 try{
  const after=JSON.parse(await readFile(owner,'utf8'));
  if(after.kind!=='BUILD'||before.token!==after.token)throw invalid();
 }catch(error){await unlink(member).catch(()=>{});throw error;}
 return {kind:'BUILD',release:()=>unlink(member)};
}
export async function browserArtifactLeaseState(projectRoot){
 const {lock}=browserTestPaths(projectRoot);
 try{
  await normalizeArtifactPath(projectRoot,lock);
  if(!(await lstat(lock)).isDirectory())return 'UNVERIFIED';
 }catch(error){return error.code==='ENOENT'?'IDLE':'UNVERIFIED';}
 try{
  const value=JSON.parse(await readFile(join(lock,'owner.json'),'utf8'));
  return ['BUILD','TEST'].includes(value.kind)?value.kind:'UNVERIFIED';
 }catch{return 'UNVERIFIED';}
}
export async function writeBrowserTestOutput(projectRoot,file,bytes){
 await authorizeArtifactOperation(projectRoot,{operation:'write',path:file});
 await mkdir(dirname(file),{recursive:true});
 await normalizeArtifactPath(projectRoot,file);
 await writeFile(file,bytes,{flag:'w'});
}
export async function writeBrowserBuildOutput(projectRoot,file,bytes){
 const [path]=await authorizeArtifactOperation(projectRoot,{workflow:'BROWSER_BUILD',operation:'write',path:file});
 await mkdir(dirname(path.absolute),{recursive:true});
 await normalizeArtifactPath(projectRoot,path.absolute);
 await writeFile(path.absolute,bytes,{flag:'w'});
}

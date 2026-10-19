import {approvedFigmaTools,artifactDirectory,reportName,browserBuildTools,browserTestTool,browserTestPaths,authorizeArtifactOperation,acquireBrowserBuildWrite} from './browser-test-artifact-guard.mjs';
import {beginExport,finishExport} from '../scripts/figma-browser-source.mjs';

const fileTools=new Set(['write','edit','patch']);
const readTools=new Set(['read','glob','grep','question']);
const fixedTools=new Set([browserTestTool,'figma_qa_report',...browserBuildTools]);
const denied=()=>Object.assign(Error('BROWSER_WORKSPACE_CAPABILITY_BLOCKED'),{code:'BROWSER_WORKSPACE_CAPABILITY_BLOCKED'});
export function formatterExecutionDisabled(){
 // App-owned engines set the highest-priority config document. A local file alone
 // cannot establish this: OPENCODE_CONFIG_CONTENT outranks project/global files.
 try{return JSON.parse(process.env.OPENCODE_CONFIG_CONTENT??'null')?.formatter===false;}catch{return false;}
}
export function fileMutationTargets(tool,input){
 if(tool==='write'||tool==='edit')return typeof input?.path==='string'?[input.path]:[];
 if(tool!=='patch'||typeof input?.patchText!=='string')return [];
 const lines=input.patchText.replaceAll('\r\n','\n').trim().split('\n');
 if(lines[0]!=='*** Begin Patch'||lines.at(-1)!=='*** End Patch')throw denied();
 const targets=[];
 for(const line of lines){
  const match=/^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)$/.exec(line);
  if(match)targets.push(match[1]);
  else if(line.startsWith('*** ')&&!['*** Begin Patch','*** End Patch','*** End of File'].includes(line))throw denied();
 }
 return targets;
}
export async function installBrowserWorkspaceCapabilities(ctx,root,{isBuild,inspectionTools,formatterDisabled=formatterExecutionDisabled,begin=beginExport,finish=finishExport}={}){
 const allowed=name=>readTools.has(name)||inspectionTools.has(name)||approvedFigmaTools.has(name)||fileTools.has(name)||fixedTools.has(name);
 const authorizeFiles=async(name,input)=>{
  const targets=fileMutationTargets(name,input);
  if(!targets.length)throw denied();
  for(const path of targets){
   const [target]=await authorizeArtifactOperation(root,{workflow:'BROWSER_BUILD',operation:'write',path});
   if(target.relative.toLowerCase().endsWith('/figma-source.json'))throw denied(); // Collector-owned, never model-authored.
  }
 };
 await ctx.tool.transform(editor=>{
  for(const tool of editor.list())if(!allowed(tool.id))editor.remove(tool.id);
  for(const original of editor.list()){
   const name=original.id;
   if(!approvedFigmaTools.has(name)&&!fileTools.has(name))continue;
   editor.update(name,tool=>{
    const {pinned,...options}=tool.options??{};tool.options={...options,codemode:false};
    const execute=tool.execute;
    tool.execute=async(input,context)=>{
     if(!context?.sessionID||!context?.id)throw denied();
     if(fileTools.has(name)){
      if(!isBuild(context.sessionID)||!formatterDisabled())throw denied();
      await authorizeFiles(name,input);
     }
     if(inspectionTools.has(name))return await execute(input,context);
     // Admission is atomic with TEST, at the actual execution boundary. A failed
     // later permission/input check still releases this exact callback's lease.
     const lease=await acquireBrowserBuildWrite(root);
     try{
      if(fileTools.has(name))await authorizeFiles(name,input);
      if(name==='figma_save_screenshots'||name==='figma_export_frames_to_pdf'){
       const screenshot=name==='figma_save_screenshots';
       if(screenshot&&(!Array.isArray(input.items)||input.items.some(item=>!item||typeof item!=='object'||Array.isArray(item)||Object.keys(item).some(key=>!['nodeId','outputPath','format','scale'].includes(key)))))throw denied();
       const targets=screenshot?input.items.map(item=>item.outputPath):[input.outputPath];
       if(!targets.length||targets.length>64)throw denied();
       const destinations=[];
       for(const path of targets){
        const [file]=await authorizeArtifactOperation(root,{operation:'write',path});
        if(file.relative.toLowerCase()===(artifactDirectory+'/'+reportName).toLowerCase())throw denied();
        destinations.push(file.absolute);
       }
       // Native Go item decoding is case-insensitive. Forward canonical fields
       // only, never an unchecked alias such as outputpath alongside outputPath.
       input=screenshot?{items:input.items.map((item,i)=>({nodeId:item.nodeId,outputPath:destinations[i],format:item.format,scale:item.scale})),format:input.format,scale:input.scale}:{nodeIds:input.nodeIds,outputPath:destinations[0]};
      }
      return await execute(input,context);
     }finally{await lease.release();}
    };
   });
  }
  for(const [name,collect]of [['browser_build_begin',begin],['browser_build_finish',finish]])editor.add({
   name,description:'Fixed Browser Build source '+(name.endsWith('begin')?'capture':'binding')+'. No shell or arbitrary paths; Figma remains read-only.',
   input:{type:'object',properties:{},additionalProperties:false},options:{namespace:'figma',permission:'figma_'+name,codemode:false},
   execute:async(input,context)=>{
    if(!context?.sessionID||!isBuild(context.sessionID)||!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw denied();
    const result=await collect(browserTestPaths(root).artifacts);
    const summary={status:result.status??result.sourceExportState,exportRunId:result.exportRunId??null,sourceFingerprint:result.sourceFingerprint??null,sourceExportState:result.sourceExportState??null,metrics:result.metrics??null};
    return {content:JSON.stringify(summary),metadata:{browserBuildSource:summary}};
   }
  });
 });
 await ctx.session.hook('context',async event=>{
  event.system.push({type:'text',text:'BROWSER_WORKSPACE_CAPABILITIES: FINITE. Use approved Figma tools directly. Generic shell, Code Mode execute, Node/PowerShell, delegation and unknown tools are unavailable in this workspace. Browser Build uses figma_browser_build_begin/finish and finite write/edit/patch tools only inside its owned prototype directory. No formatter execution. Browser Test only observes through its fixed report tool.'});
 });
 await ctx.tool.hook('execute.before',async event=>{
  if(!allowed(event.tool))throw denied();
  if(fileTools.has(event.tool)){
   if(!isBuild(event.sessionID)||!formatterDisabled())throw denied();
   await authorizeFiles(event.tool,event.input);
  }
  if(browserBuildTools.includes(event.tool)&&!isBuild(event.sessionID))throw denied();
 });
 await ctx.permission.hook('evaluate',async event=>{
  const finitePermission=fileTools.has(event.action)&&isBuild(event.sessionID)&&formatterDisabled();
  const readPermission=event.action==='external_directory'; // All mutation destinations are already workspace-bounded.
  if(fileTools.has(event.action)&&!finitePermission||!allowed(event.action)&&!finitePermission&&!readPermission){event.effect='deny';event.message='BROWSER_WORKSPACE_CAPABILITY_BLOCKED';}
 });
}

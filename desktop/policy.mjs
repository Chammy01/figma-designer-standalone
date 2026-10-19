import {readFile,mkdir,writeFile,rename,copyFile,lstat,readdir,rm,chmod} from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';

export const desktopVersion='1.5.0';
export const applicationId='com.chammy01.figmadesigner';
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function verifyRuntime(root){
  const approved=JSON.parse(await readFile(join(root,'docs/APPROVED_RUNTIME.json'),'utf8'));
  const paths=['bin/figma-designer-mcp.exe','vendor/figma-mcp/plugin/dist/code.js','vendor/figma-mcp/plugin/dist/index.html'];
  if(!approved.sha256||Object.keys(approved.sha256).length!==3||paths.some(p=>!/^[a-f0-9]{64}$/.test(approved.sha256[p]??'')))throw Error('RUNTIME_HASH_MISMATCH');
  for(const file of paths)if(sha256(await readFile(join(root,file)))!==approved.sha256[file])throw Error('RUNTIME_HASH_MISMATCH');
  return approved;
}
export async function atomicJSON(file,value){await mkdir(dirname(file),{recursive:true});const temp=file+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify(value));await rename(temp,file);}
export function restoredBounds(saved,displays){
  const area=displays[0]?.workArea??{width:1320,height:860};
  const b={width:Math.max(900,Math.min(1320,area.width)),height:Math.max(650,Math.min(860,area.height))};
  if(saved&&[saved.x,saved.y,saved.width,saved.height].every(Number.isFinite)&&saved.width>=900&&saved.height>=650&&displays.some(({workArea:a})=>saved.x>=a.x&&saved.y>=a.y&&saved.x+saved.width<=a.x+a.width&&saved.y+saved.height<=a.y+a.height))return saved;
  return b;
}
export function externalAllowed(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&['github.com','opencode.ai','accounts.google.com','huggingface.co','login.microsoftonline.com','developers.figma.com'].includes(u.hostname);}catch{return false;}}
export function externalSetupPolicy(now=Date.now){
  const urls=new Map();
  return {register(value){try{const u=new URL(value);if(value.length>4096||u.username||u.password||!(u.protocol==='https:'||u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname)))return false;urls.set(u.href,now()+15*60*1000);while(urls.size>8)urls.delete(urls.keys().next().value);return true;}catch{return false;}},allows(value){try{return externalAllowed(value)||(urls.get(new URL(value).href)??0)>now();}catch{return false;}}};
}
export function sameOrigin(value,origin){try{return new URL(value).origin===origin;}catch{return false;}}
export async function prepareWorkspace(payload,root){
  await verifyRuntime(join(payload,'workspace'));
  const inventory=JSON.parse(await readFile(join(payload,'PAYLOAD_INVENTORY.json'),'utf8'));
  for(const tool of ['tools/node.exe','tools/opencode.exe']){const entry=inventory.files.find(f=>f.path===tool);if(!entry||sha256(await readFile(join(payload,tool)))!==entry.sha256)throw Error('PAYLOAD_HASH_MISMATCH');}
  // Only release-allowlisted immutable inputs are replaced; user output/config is separate.
  for(const entry of inventory.files){
    if(!entry.path.startsWith('workspace/'))continue;
    const relative=entry.path.slice(10);
    if(relative==='opencode.json')throw Error('Packaged local configuration forbidden');
    const source=join(payload,entry.path),target=join(root,relative);
    if(!resolve(target).startsWith(resolve(root)+ '\\')&&process.platform==='win32')throw Error('Unsafe workspace entry');
    if(sha256(await readFile(source))!==entry.sha256)throw Error('PAYLOAD_HASH_MISMATCH');
    await mkdir(dirname(target),{recursive:true});
    try{if((await lstat(target)).isSymbolicLink())throw Error('Workspace symlink refused');if(sha256(await readFile(target))===entry.sha256)continue;await chmod(target,0o666);}catch(e){if(e.code!=='ENOENT')throw e;}
    await copyFile(source,target);await chmod(target,0o666);
  }
  // Migration of formerly shipped inputs: never leave a second agent discoverable.
  for(const relative of ['orca.ps1','.opencode/agents/web-designer.md']){
    const target=join(root,relative);
    try{
      const info=await lstat(target);
      if(!info.isFile()||info.isSymbolicLink())throw Error('Legacy workspace input is not an owned regular file');
      await chmod(target,0o666);await rm(target);
    }catch(error){if(error.code!=='ENOENT')throw error;}
  }
  const config=JSON.parse(await readFile(join(root,'opencode.example.json'),'utf8'));
  config.mcp.figma.command=[join(root,'bin/figma-designer-mcp.exe')];
  await atomicJSON(join(root,'opencode.json'),config);
  return verifyRuntime(root);
}
export async function cleanupDiagnostics(base,now=Date.now()){
  await mkdir(base,{recursive:true});
  const entries=await readdir(base,{withFileTypes:true});
  for(const entry of entries){
    if(!entry.isDirectory()||!/^run-[a-f0-9-]{36}$/.test(entry.name))continue;
    const path=join(base,entry.name),info=await lstat(path);
    if(!info.isSymbolicLink()&&now-info.mtimeMs>86400000)await rm(path,{recursive:true,force:true});
  }
}

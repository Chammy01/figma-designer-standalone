import {readFile,mkdir,writeFile,rename,copyFile,lstat,readdir,rm,chmod} from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';

export const desktopVersion='1.4.4';
export const applicationId='com.chammy01.figmadesigner';
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function verifyRuntime(root){
  const approved=JSON.parse(await readFile(join(root,'docs/APPROVED_RUNTIME.json'),'utf8'));
  for(const [file,hash]of Object.entries(approved.sha256))if(sha256(await readFile(join(root,file)))!==hash)throw Error('RUNTIME_HASH_MISMATCH');
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

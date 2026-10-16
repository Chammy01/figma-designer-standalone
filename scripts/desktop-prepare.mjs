import {readFile,writeFile,mkdir,copyFile,readdir,lstat,access,rm} from 'node:fs/promises';
import {resolve,join,dirname,relative} from 'node:path';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {sha256,verifyRuntime} from '../desktop/policy.mjs';
const root=resolve(import.meta.dirname,'..'),stage=join(root,'.figma-designer/desktop/payload');
const lock=JSON.parse(await readFile(join(root,'desktop/runtime-lock.json'),'utf8'));
await verifyRuntime(root);
if(stage!==resolve(root,'.figma-designer/desktop/payload'))throw Error('Unsafe staging path');
await rm(stage,{recursive:true,force:true});await mkdir(stage,{recursive:true});
async function copy(source,target){const s=await lstat(source);if(s.isSymbolicLink())throw Error('Package input symlink refused');if(s.isDirectory()){await mkdir(target,{recursive:true});for(const name of (await readdir(source)).sort())await copy(join(source,name),join(target,name));}else{await mkdir(dirname(target),{recursive:true});await copyFile(source,target);}}
const list=JSON.parse(await readFile(join(root,'docs/RELEASE_ALLOWLIST.json'),'utf8'));
for(const path of list){if(path==='opencode.json'||/(^|\/)(\.git|\.figma-designer|node_modules)(\/|$)/.test(path))throw Error('Unsafe package source');await copy(join(root,path),join(stage,'workspace',path));}
// Playwright is an existing runtime dependency of the canonical Browser Test command.
for(const name of ['@playwright/test','playwright','playwright-core'])await copy(join(root,'node_modules',name),join(stage,'workspace/node_modules',name));
process.env.PLAYWRIGHT_BROWSERS_PATH=join(root,'.figma-designer/desktop/browser-cache');
execFileSync(process.execPath,[join(root,'node_modules/playwright/cli.js'),'install','chromium'],{stdio:'inherit',windowsHide:true,env:process.env});
const {chromium}=await import('@playwright/test');
const iconRoot=join(root,'.figma-designer/desktop/icons');await mkdir(iconRoot,{recursive:true});
const iconBrowser=await chromium.launch({env:{...process.env,CHROME_LOG_FILE:join(iconRoot,'chromium.log')}});
try{const page=await iconBrowser.newPage({viewport:{width:256,height:256},deviceScaleFactor:1});await page.setContent(await readFile(join(root,'desktop/icon.svg'),'utf8'));await page.addStyleTag({content:'body{margin:0;background:transparent}'});const png=await page.screenshot({omitBackground:true});const header=Buffer.alloc(22);header.writeUInt16LE(1,2);header.writeUInt16LE(1,4);header.writeUInt16LE(1,10);header.writeUInt16LE(32,12);header.writeUInt32LE(png.length,14);header.writeUInt32LE(22,18);await writeFile(join(iconRoot,'icon.ico'),Buffer.concat([header,png]));}finally{await iconBrowser.close();}
const browser=chromium.executablePath(),browserRoot=dirname(dirname(browser));
await access(browser);await copy(browserRoot,join(stage,'browsers',relative(dirname(browserRoot),browserRoot)));
// Playwright's default launch uses the separately distributed headless shell.
const browserCache=dirname(browserRoot);
for(const name of (await readdir(browserCache)).filter(n=>/^chromium_headless_shell-/.test(n))){await copy(join(browserCache,name),join(stage,'browsers',name));}
const archive=join(tmpdir(),'figma-desktop-node-v24.15.0.zip');
try{await access(archive);}catch{const response=await fetch(lock.node.url);if(!response.ok)throw Error('Node download failed');await writeFile(archive,Buffer.from(await response.arrayBuffer()));}
if(sha256(await readFile(archive))!==lock.node.sha256)throw Error('Node archive hash mismatch');
const extracted=join(root,'.figma-designer/desktop/node');
try{await access(join(extracted,'node-v24.15.0-win-x64/node.exe'));}catch{const quote=s=>"'"+s.replaceAll("'","''")+"'";execFileSync('powershell.exe',['-NoProfile','-Command',`Expand-Archive -LiteralPath ${quote(archive)} -DestinationPath ${quote(extracted)}`],{windowsHide:true});}
await copy(join(extracted,'node-v24.15.0-win-x64/node.exe'),join(stage,'tools/node.exe'));
await copy(join(extracted,'node-v24.15.0-win-x64/LICENSE'),join(stage,'licenses/Node-LICENSE'));
const engine=join(root,'node_modules/@opencode/cli-windows-x64-baseline/bin/opencode.exe');
if(sha256(await readFile(engine))!==lock.opencode.sha256)throw Error('OpenCode binary hash mismatch');
await copy(engine,join(stage,'tools/opencode.exe'));
const license=await fetch(lock.opencode.licenseUrl);if(!license.ok)throw Error('OpenCode license unavailable');await writeFile(join(stage,'licenses/OpenCode-LICENSE'),await license.text());
await copy(join(root,'node_modules/electron/LICENSE'),join(stage,'licenses/Electron-LICENSE'));
const files=[];
async function inventory(dir){for(const name of(await readdir(dir)).sort()){const path=join(dir,name),s=await lstat(path);if(s.isDirectory())await inventory(path);else if(name!=='PAYLOAD_INVENTORY.json')files.push({path:relative(stage,path).replaceAll('\\','/'),bytes:s.size,sha256:sha256(await readFile(path))});}}
await inventory(stage);
await writeFile(join(stage,'PAYLOAD_INVENTORY.json'),JSON.stringify({version:1,tools:lock,files},null,2)+'\n');
console.log(`Desktop payload verified: ${files.length} files; approved runtime unchanged.`);

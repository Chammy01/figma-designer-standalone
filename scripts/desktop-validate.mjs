import {readFile,writeFile,readdir,lstat,access} from 'node:fs/promises';
import {join,relative,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {sha256,verifyRuntime} from '../desktop/policy.mjs';
const root=resolve(import.meta.dirname,'..'),output=join(root,'release-staging/desktop'),unpacked=join(output,'win-unpacked'),payload=join(unpacked,'resources/payload');
await verifyRuntime(join(payload,'workspace'));
const expected=JSON.parse(await readFile(join(payload,'PAYLOAD_INVENTORY.json'),'utf8'));
const files=[];
const secrets=Object.entries(process.env).filter(([key,value])=>/TOKEN|PASSWORD|SECRET|API_KEY/i.test(key)&&typeof value==='string'&&value.length>=16).map(([,value])=>Buffer.from(value));
async function walk(dir){for(const name of(await readdir(dir)).sort()){const path=join(dir,name),s=await lstat(path);if(s.isSymbolicLink())throw Error('Package contains a symlink');if(s.isDirectory())await walk(path);else{const rel=relative(unpacked,path).replaceAll('\\','/');if(/(^|\/)(\.git|\.env(?:\..*)?|\.figma-designer|test-results|playwright-report)(\/|$)|\.(log|bak|tmp)$/i.test(rel))throw Error('Forbidden package file: '+rel);const bytes=await readFile(path);if(secrets.some(secret=>bytes.includes(secret)))throw Error('Private build environment data found in package');files.push({path:rel,bytes:s.size,sha256:sha256(bytes)});}}}
await walk(unpacked);
const actual=new Map(files.map(f=>[f.path,f]));
for(const entry of expected.files){if(actual.get('resources/payload/'+entry.path)?.sha256!==entry.sha256)throw Error('Payload mismatch: '+entry.path);}
const extra=files.filter(f=>f.path.startsWith('resources/payload/')&&f.path!=='resources/payload/PAYLOAD_INVENTORY.json'&&!expected.files.some(e=>'resources/payload/'+e.path===f.path));if(extra.length)throw Error('Unexpected payload files');
await access(join(payload,'workspace/vendor/figma-mcp/plugin/manifest.json'));
const options={encoding:'utf8',windowsHide:true,timeout:20000};
if(execFileSync(join(payload,'tools/node.exe'),['--version'],options).trim()!=='v24.15.0')throw Error('Node version mismatch');
if(!execFileSync(join(payload,'tools/opencode.exe'),['--version'],options).includes('2.0.28'))throw Error('OpenCode version mismatch');
const artifacts=[];
for(const name of ['Figma-Designer-1.4.4-Windows-Setup.exe','Figma-Designer-1.4.4-Windows-Portable.zip']){const path=join(output,name),s=await lstat(path);artifacts.push({name,bytes:s.size,sha256:sha256(await readFile(path))});}
await writeFile(join(output,'DESKTOP_PACKAGE_INVENTORY.json'),JSON.stringify({version:1,files},null,2)+'\n');
await writeFile(join(output,'SHA256SUMS.txt'),artifacts.map(a=>a.sha256+'  '+a.name).join('\n')+'\n');
await writeFile(join(output,'DESKTOP_PACKAGE_VALIDATION.json'),JSON.stringify({version:1,packageVersion:'1.4.4',releaseState:'CANDIDATE_NOT_PUBLISHED',runtime:'VERIFIED',inventory:'PASS',privacy:'ALLOWLIST_VERIFIED',files:files.length,unpackedBytes:files.reduce((s,f)=>s+f.bytes,0),codeSigning:'UNSIGNED',artifacts,payloadReproducible:'NOT_YET_PROVEN',installerByteReproducible:'NOT_CLAIMED'},null,2)+'\n');
console.log(JSON.stringify({files:files.length,artifacts,unpackedBytes:files.reduce((s,f)=>s+f.bytes,0)}));

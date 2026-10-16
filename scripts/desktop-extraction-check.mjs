import {readFile,readdir,lstat} from 'node:fs/promises';
import {join,resolve,relative} from 'node:path';
import {sha256} from '../desktop/policy.mjs';
const root=resolve(process.argv[2]),report=JSON.parse(await readFile(new URL('../release-staging/desktop/DESKTOP_PACKAGE_INVENTORY.json',import.meta.url),'utf8'));
const expected=new Map(report.files.map(f=>[f.path,f.sha256])),seen=new Set();
async function walk(dir){for(const name of await readdir(dir)){const path=join(dir,name),s=await lstat(path);if(s.isSymbolicLink())throw Error('Extraction symlink refused');if(s.isDirectory())await walk(path);else{const rel=relative(root,path).replaceAll('\\','/');if(rel==='Uninstall Figma Designer.exe')continue;if(!expected.has(rel)||sha256(await readFile(path))!==expected.get(rel))throw Error('Extracted file mismatch: '+rel);seen.add(rel);}}}
await walk(root);const missing=[...expected.keys()].filter(path=>!seen.has(path));if(missing.length)throw Error('Extracted application is incomplete: '+missing.join(', '));console.log(`Extracted application PASS: ${seen.size} exact files.`);

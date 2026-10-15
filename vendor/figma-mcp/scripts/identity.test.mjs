import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {normalize} from './identity-normalize.mjs';
const baseline=JSON.parse(await readFile(new URL('./fixtures/functional-source.json',import.meta.url)));
const reviewedReliabilityPaths=new Set(['cmd/figma-mcp-go/main.go','internal/bridge.go','internal/follower.go','internal/node.go','internal/tools.go','internal/types.go','internal/helpers_test.go','internal/tools_schema_test.go','plugin/src/main.ts','plugin/src/browser-source.ts','plugin/src/diagnostics.ts']);
for(const row of baseline.files.filter(r=>!reviewedReliabilityPaths.has(r.path)))test('identity-only source: '+row.path,async()=>assert.equal(createHash('sha256').update(normalize(await readFile(new URL('../'+row.path,import.meta.url),'utf8'))).digest('hex'),row.sha256));
test('source collector body is unchanged; only existing field registries are exported for revision reuse',async()=>{const row=baseline.files.find(r=>r.path==='plugin/src/browser-source.ts');const source=(await readFile(new URL('../'+row.path,import.meta.url),'utf8')).replace('export const fields =','const fields =').replace('export const textFields =','const textFields =');assert.equal(createHash('sha256').update(normalize(source)).digest('hex'),row.sha256);});
test('dependency, network and technical plugin identity remain unchanged',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../plugin/manifest.json',import.meta.url)));assert.equal(manifest.name,'Figma Designer MCP');delete manifest.name;assert.deepEqual(manifest,baseline.manifest);
 const pkg=JSON.parse(await readFile(new URL('../plugin/package.json',import.meta.url)));assert.deepEqual(pkg.devDependencies,baseline.dependencies);
 const sum=await readFile(new URL('../go.sum',import.meta.url));assert.equal(createHash('sha256').update(sum.toString().replaceAll('\r\n','\n')).digest('hex'),baseline.goSum);
 const mod=(await readFile(new URL('../go.mod',import.meta.url),'utf8')).replaceAll('\r\n','\n').split('\n').slice(1).join('\n');assert.equal(mod,baseline.goRequirements);
 const lock=JSON.parse(await readFile(new URL('../plugin/bun.lock',import.meta.url),'utf8').then(s=>s.replace(/,\s*([}\]])/g,'$1')));delete lock.workspaces[''].name;assert.deepEqual(lock,baseline.lock);
 const license=await readFile(new URL('../LICENSE',import.meta.url),'utf8');assert.ok(license.includes('Copyright (c) 2026 vkhanhqui'));assert.ok(license.includes('Permission is hereby granted, free of charge'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {connect} from './mcp-client.mjs';
const baseline=JSON.parse(await readFile(new URL('./fixtures/approved-catalog.json',import.meta.url)));
test('protocol, version and mutation coverage agree across server, plugin and audit',async()=>{
 const root=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
 const names=JSON.parse(await root('plugin/src/reliability-tools.json')),audit=JSON.parse(await root('docs/WRITE_PATH_AUDIT_V1_4_3B.json'));
 assert.equal(names.length,72);assert.deepEqual(names,audit.tools.filter(t=>t.documentMutation).map(t=>t.tool));
 const go=await root('internal/reliability_tools.go');for(const name of names)assert.ok(go.includes('"'+name+'"'));
 assert.match(await root('internal/reliability.go'),/BridgeProtocolVersion\s*=\s*2/);assert.match(await root('plugin/src/reliability.ts'),/protocolVersion = 2/);
 assert.equal((await root('VERSION')).trim(),'1.1.0');assert.match(await root('plugin/src/reliability.ts'),/productVersion = "1.1.0"/);
});
test('108 tools retain original 106 schemas with additive optional reliability fields',async()=>{
 const c=await connect(process.env.MCP_EXECUTABLE??'bin/figma-designer-mcp.exe');
 try{
  const listing=await c.request('tools/list');const tools=structuredClone(listing.result.tools);assert.equal(tools.length,108);assert.ok(tools.some(t=>t.name==='combine_as_variants'));
  const original=tools.filter(t=>baseline.tools.some(b=>b.name===t.name));
  for(const tool of original)for(const field of ['operationId','preconditions','expectedRevision']){assert.ok(!tool.inputSchema.required?.includes(field));delete tool.inputSchema.properties[field];}
  assert.deepEqual(original,baseline.tools);
  for(const name of ['get_operation_receipt','get_document_revision'])assert.equal(tools.find(t=>t.name===name).annotations.readOnlyHint,true);
  const {serverInfo,...protocol}=c.initialize.result;const {serverInfo:old,...expected}=baseline.initialize;assert.deepEqual(protocol,expected);assert.deepEqual(serverInfo,{name:'figma-designer-mcp',version:'1.1.0'});
  assert.deepEqual((await c.request('ownership/nonexistent')).error,baseline.unknownMethod);
  assert.deepEqual((await c.request('tools/call',{name:'ownership_nonexistent',arguments:{}})).error,baseline.unknownTool);
 }finally{c.close();}
});

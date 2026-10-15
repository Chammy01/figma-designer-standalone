import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {connect} from './mcp-client.mjs';
const baseline=JSON.parse(await readFile(new URL('./fixtures/approved-catalog.json',import.meta.url)));
test('owned runtime retains exact 106-tool catalog, protocol capabilities and stable errors',async()=>{
 const c=await connect(process.env.MCP_EXECUTABLE??'bin/figma-designer-mcp.exe');
 try{
  const listing=await c.request('tools/list');assert.deepEqual(listing.result.tools,baseline.tools);assert.equal(listing.result.tools.length,106);assert.ok(listing.result.tools.some(t=>t.name==='combine_as_variants'));
  const {serverInfo,...protocol}=c.initialize.result;const {serverInfo:old,...expected}=baseline.initialize;assert.deepEqual(protocol,expected);assert.deepEqual(serverInfo,{name:'figma-designer-mcp',version:'1.0.0'});
  assert.deepEqual((await c.request('ownership/nonexistent')).error,baseline.unknownMethod);
  assert.deepEqual((await c.request('tools/call',{name:'ownership_nonexistent',arguments:{}})).error,baseline.unknownTool);
 }finally{c.close();}
});

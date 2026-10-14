import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fidelityModel,analyzeFidelity,geometryClass,solidPaint} from '../rules/figma-browser-fidelity.mjs';
import {fidelityFixture} from './fixtures/browser-fidelity.mjs';
import {captureNativeReference} from './figma-browser-fidelity.mjs';
const f=fidelityFixture(),model=fidelityModel(f.projection,f.manifest);
const baseline=()=>[{id:'screen',nodes:model.screens[0].nodes.map(n=>({...structuredClone(n),count:1,visible:true,fonts:['Arial']}))}];
for(const [label,edit,status,code] of [
  ['exact',()=>{},'PASS'],
  ['one pixel',m=>m[0].nodes[1].bounds.x++,'PASS'],
  ['two pixels',m=>m[0].nodes[2].bounds.x+=2,'WARN','GEOMETRY_MINOR_DRIFT'],
  ['large shift',m=>m[0].nodes[2].bounds.x+=20,'FAIL','GEOMETRY_MAJOR_DRIFT'],
  ['large size',m=>m[0].nodes[2].bounds.width+=20,'FAIL','GEOMETRY_MAJOR_DRIFT'],
  ['text',m=>m[0].nodes[1].text='missing','FAIL','TEXT_CONTENT'],
  ['fallback',m=>m[0].nodes[1].fonts=['Courier New'],'WARN','FONT_FIDELITY_LIMITATION'],
  ['fallback wrapping',m=>{m[0].nodes[1].fonts=['Courier New'];m[0].nodes[1].bounds.height+=40;m[0].nodes[1].lineCount=3;m[0].nodes[1].intrinsicHeight=true;},'WARN','GEOMETRY_MAJOR_DRIFT'],
  ['fallback with wrong explicit CSS width',m=>{m[0].nodes[1].fonts=['Courier New'];m[0].nodes[1].bounds.width+=40;},'FAIL','GEOMETRY_MAJOR_DRIFT'],
  ['fill',m=>m[0].nodes[2].fill=[255,0,0,1],'FAIL','PROPERTY_fill'],
  ['missing control',m=>m[0].nodes.pop(),'FAIL','MISSING_OR_AMBIGUOUS_NODE'],
  ['uncertain transform',m=>m[0].nodes[1].bounds=null,'WARN','GEOMETRY_UNVERIFIED'],
])test(`fidelity: ${label}`,()=>{const m=baseline();edit(m);const result=analyzeFidelity(model,m);assert.equal(result.SOURCE_FIDELITY,status);if(code)assert.ok(result.findings.some(f=>f.code===code));assert.deepEqual(result,analyzeFidelity(model,m));});
test('parent-local coordinates ignore canvas root placement and accumulate nesting',()=>{
  const f=fidelityFixture();f.projection.runtime.children[0].children[0].children=[{id:'nested',type:'FRAME',geometry:{x:10,y:7,width:2,height:3},props:{visible:true},children:[]}];
  assert.deepEqual(fidelityModel(f.projection,f.manifest).screens[0].nodes.find(n=>n.id==='nested').bounds,{x:34,y:31,width:2,height:3});
});
test('rotation on ancestor marks descendants unverified',()=>{const f=fidelityFixture();f.projection.runtime.children[0].props.rotation=20;assert.ok(fidelityModel(f.projection,f.manifest).screens[0].nodes.every(n=>n.bounds===null));});
test('complex paint is a limitation, not fabricated CSS color',()=>{assert.equal(solidPaint([{type:'IMAGE',imageHash:'fixture'}]),null);const m=structuredClone(model);m.screens[0].nodes[2].complex=true;assert.equal(analyzeFidelity(m,baseline()).findings[0].code,'COMPLEX_PAINT_LIMITATION');});
test('unavailable evidence cannot pass',()=>{assert.equal(geometryClass(null,{}),'UNVERIFIED');assert.equal(analyzeFidelity(model,[]).SOURCE_FIDELITY,'UNVERIFIED');});
test('observed missing screen is a blocker, not merely unavailable evidence',()=>{assert.equal(analyzeFidelity(model,[{id:'screen',missingDOM:true,nodes:[]}]).SOURCE_FIDELITY,'FAIL');});
test('new analysis is pure and does not introduce a native write path',()=>{
  const pure=readFileSync(new URL('../rules/figma-browser-fidelity.mjs',import.meta.url),'utf8');assert.doesNotMatch(pure,/node:fs|fetch\(|set_reactions|create_node|patch_html/);
  const runner=readFileSync(new URL('./figma-browser-fidelity.mjs',import.meta.url),'utf8');assert.doesNotMatch(runner,/set_reactions|create_node|patch_html|\.style\./);
});
test('native references use only approved frame export and validate identity/dimensions/source binding',async()=>{
  const png=readFileSync(new URL('./fixtures/browser-fidelity-goldens/win32/layout.png',import.meta.url));
  const frame={id:'synthetic',type:'FRAME',geometry:{width:800,height:600}},fingerprint={sha256:'a'.repeat(64)};
  const read=async(name,args)=>{assert.equal(name,'get_screenshot');assert.deepEqual(args,{nodeIds:['synthetic'],format:'PNG',scale:1});return {exports:[{nodeId:'synthetic',format:'PNG',base64:png.toString('base64')}]};};
  const reference=await captureNativeReference(read,frame,fingerprint);assert.equal(reference.metadata.width,800);assert.deepEqual(reference.metadata.sourceFingerprint,fingerprint);
  await assert.rejects(()=>captureNativeReference(read,{...frame,geometry:{width:700,height:600}},fingerprint),/bounds/);
  await assert.rejects(()=>captureNativeReference(read,{...frame,type:'SECTION'},fingerprint),/FRAME/);
});

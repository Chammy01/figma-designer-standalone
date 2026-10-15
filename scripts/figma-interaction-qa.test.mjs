import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {analyzeInteractions,documentFingerprint,formatQAReport,qaReadTools} from '../rules/figma-interaction-qa.mjs';
import {collectInteractionQA,readQATool} from './figma-interaction-qa.mjs';
import {qaCases,flowFixture,stateFixture,modalFixture,reaction,readFixture} from './fixtures/interaction-qa.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8').replaceAll('\r\n','\n');
for(const c of qaCases)test(`${c.id}: ${c.name}`,()=>{
  const model=c.build(),before=structuredClone(model),result=analyzeInteractions(model);
  assert.equal(result.status,c.status);if(c.code)assert.ok(result.findings.some(f=>f.code===c.code),c.code);
  assert.deepEqual(model,before);assert.equal(result.integrity.writeCalls,0);
});
test('reactionless affordance is inventoried without inventing a destination',()=>{
  const f=flowFixture();f.model.scope.controls=[];f.control.reactions=[];
  const r=analyzeInteractions(f.model);assert.equal(r.controls.length,1);assert.equal(r.controls[0].classification,'UNKNOWN_EXPECTATION');assert.equal(r.coverage.BROKEN,0);
});
test('descendant navigation reaches Success and leaves it a valid terminal',()=>{
  const r=analyzeInteractions(flowFixture().model);assert.deepEqual(r.journeys[0].reachableScreens,['3:1','3:2']);assert.equal(r.journeys[0].terminals[0].status,'VALID_TERMINAL');assert.equal(r.graph.edges[0].sourceId,'4:1');
});
test('graph separates screen, state, overlay, URL and scroll identities',()=>{
  const f=stateFixture();f.control.reactions.push(reaction('NAVIGATE','3:2'));f.node('8:1','TEXT','3:1','Section',{characters:'Content'});
  f.control.reactions.push({trigger:{type:'ON_CLICK'},actions:[{type:'URL',url:'https://example.test'}]});
  f.control.reactions.push({trigger:{type:'ON_CLICK'},actions:[{type:'NODE',navigation:'SCROLL_TO',destinationId:'8:1',transition:null}]});
  const r=analyzeInteractions(f.model);for(const type of ['SCREEN','STATE_VARIANT','EXTERNAL_URL','SCROLL_TARGET'])assert.ok(r.graph.nodes.some(n=>n.type===type));assert.ok(analyzeInteractions(modalFixture().model).graph.nodes.some(n=>n.type==='OVERLAY'));
});
test('state path inspects the real source variant and family',()=>{
  const f=stateFixture();f.model.scope.scenarios=[{id:'hover',name:'Default to Hover',startId:'5:2',endId:'5:3',steps:[{type:'CHANGE_TO',controlId:'5:2',destinationId:'5:3'}]}];
  const r=analyzeInteractions(f.model);assert.equal(r.scenarios[0].status,'PASS');assert.equal(r.controls[0].componentSetId,'5:1');assert.equal(r.stateFacetCount,1);
});
test('modal scenario preserves overlay stack and returns the same base context',()=>{const r=analyzeInteractions(modalFixture().model);assert.equal(r.scenarios[0].status,'PASS');assert.deepEqual(r.scenarios[0].path,['3:1','3:2','3:1']);});
test('BACK history is traversed only when established',()=>{
  const f=flowFixture();const back=f.node('4:3','FRAME','3:2','Back');back.reactions=[{trigger:{type:'ON_CLICK'},actions:[{type:'BACK'}]}];
  f.model.scope.scenarios=[{id:'return',name:'Return',startId:'3:1',endId:'3:1',steps:[{type:'NAVIGATE',controlId:'4:1',destinationId:'3:2'},{type:'BACK',controlId:back.id}]}];assert.equal(analyzeInteractions(f.model).scenarios[0].status,'PASS');
  f.model.scope.scenarios[0].startId='3:2';f.model.scope.scenarios[0].steps.shift();assert.equal(analyzeInteractions(f.model).scenarios[0].status,'LIMITED');
});
test('start inference uses graph roots, not canvas left edge',()=>{
  const f=flowFixture();delete f.model.scope.startIds;f.find('3:1').geometry.x=800;f.find('3:2').geometry.x=0;assert.equal(analyzeInteractions(f.model).journeys[0].startId,'3:1');
});
test('stable finding IDs and evidence/severity/workflow remain deterministic',()=>{
  const m=qaCases.find(c=>c.id==='B').build(),a=analyzeInteractions(m),b=analyzeInteractions(structuredClone(m));assert.deepEqual(a,b);
  assert.equal(a.findings[0].id,'Q01');assert.equal(a.findings[0].severity,'HIGH');assert.equal(a.findings[0].evidence.grade,'VERIFIED');assert.equal(a.findings[0].recommendedWorkflow,'FLOW');
  const report=formatQAReport(a);for(const text of ['Problem:','Why it matters:','Evidence:','Expected:','Actual:','not executed','WRITE_CALLS: 0'])assert.ok(report.includes(text));
});
test('semantic family duplicates require actual matching anatomy, not name alone',()=>{
  const f=stateFixture();f.node('7:1','COMPONENT_SET','6:1','Button / Primary');f.node('7:2','COMPONENT','7:1','Default',{variantProperties:{State:'Default'}});f.node('7:3','COMPONENT','7:1','Hover',{variantProperties:{State:'Hover'}});f.model.families.push({id:'7:1',name:'Button / Primary',variantIds:['7:2','7:3']});
  assert.ok(analyzeInteractions(f.model).findings.some(f=>f.code==='DUPLICATE_FAMILY'));f.find('7:2').geometry.width=300;assert.ok(!analyzeInteractions(f.model).findings.some(f=>f.code==='DUPLICATE_FAMILY'));
});
test('required overlay CLOSE absence is BROKEN; unknown settings are not a native limitation claim',()=>{
  const f=modalFixture();f.find('4:3').reactions=[];assert.ok(analyzeInteractions(f.model).findings.some(f=>f.code==='MISSING_BEHAVIOR'));
  delete f.find('3:2').props.overlayPositionType;const r=analyzeInteractions(f.model);assert.ok(r.findings.some(f=>f.code==='OVERLAY_SETTINGS_UNVERIFIED'));assert.ok(!r.findings.some(f=>f.code==='CONTEXTUAL_LIMIT'));
});
test('required outside/background changes are limited without authoring',()=>{
  const f=modalFixture();f.model.scope.controls[0].outsideClickRequired=true;f.model.scope.controls[0].backgroundRequired={type:'SOLID_COLOR',color:{r:0,g:0,b:0,a:.3}};
  const r=analyzeInteractions(f.model);assert.equal(r.coverage.BROKEN,0);assert.ok(r.findings.some(f=>f.code==='OUTSIDE_CLICK_LIMIT'));assert.ok(r.findings.some(f=>f.code==='BACKGROUND_LIMIT'));
});
test('manual relative positions require real MANUAL readback',()=>{const f=modalFixture();f.control.reactions[0].actions[0].overlayRelativePosition={x:24,y:60};assert.ok(analyzeInteractions(f.model).findings.some(f=>f.code==='INVALID_MANUAL_POSITION'));f.find('3:2').props.overlayPositionType='MANUAL';assert.ok(!analyzeInteractions(f.model).findings.some(f=>f.code==='INVALID_MANUAL_POSITION'));});
test('geometry uses parent-relative coordinates and rejects a real SECTION overflow',()=>{const f=flowFixture();f.find('1:1').geometry.x=10000;assert.ok(!analyzeInteractions(f.model).findings.some(f=>f.code==='SCREEN_OUTSIDE_RUNTIME'));f.find('3:2').geometry.x=1990;assert.ok(analyzeInteractions(f.model).findings.some(f=>f.code==='SCREEN_OUTSIDE_RUNTIME'));});
test('reversed reads do not change IDs/order; intentional repetition is not automatically duplicate',()=>{const f=flowFixture();const a=analyzeInteractions(f.model);f.model.nodes.reverse();assert.deepEqual(analyzeInteractions(f.model).findings,a.findings);f.node('7:1','FRAME','3:1','Repeated content');f.node('7:2','FRAME','3:1','Repeated content');assert.ok(!analyzeInteractions(f.model).findings.some(f=>f.code.startsWith('DUPLICATE')));});
test('fingerprint comparison resolves document-local fill aliases',()=>{
  const a={id:'0:1',type:'PAGE',name:'Page',globalVars:{styles:{s1:['#fff']}},children:[{id:'1:1',type:'FRAME',name:'Frame',styles:{fills:'s1'},children:[]}]};
  const b=structuredClone(a);b.globalVars.styles={s2:['#fff']};b.children[0].styles.fills='s2';assert.deepEqual(documentFingerprint(a),documentFingerprint(b));b.globalVars.styles.s2=['#000'];assert.notDeepEqual(documentFingerprint(a),documentFingerprint(b));
});
test('any forbidden tool or fingerprint change forces FAIL even if graph works',()=>{
  const f=flowFixture();f.model.trace=[{tool:'set_reactions'}];assert.equal(analyzeInteractions(f.model).status,'FAIL');f.model.trace=[];f.model.fingerprints.after.document='changed';assert.equal(analyzeInteractions(f.model).status,'FAIL');delete f.model.fingerprints;assert.equal(analyzeInteractions(f.model).status,'FAIL');
});
test('stateful data does not certify native execution or route to a writer',()=>{const f=flowFixture();f.control.reactions.push({trigger:{type:'ON_CLICK'},actions:[{type:'SET_VARIABLE',variableId:'VariableID:1:1'}]});const r=analyzeInteractions(f.model);assert.ok(r.findings.some(f=>f.code==='STATEFUL_UNVERIFIED'&&f.classification==='FIGMA_LIMITED'));});
test('read transport rejects every mutation family before network access',async()=>{for(const name of ['create_frame','delete_nodes','clone_node','rename_node','move_nodes','resize_nodes','reparent_nodes','set_fills','set_reactions','remove_reactions','set_variable_value','combine_as_variants'])await assert.rejects(readQATool(name),/only approved reads/);});
test('collector uses only reads and compares both snapshots',async()=>{
  const m=flowFixture().model,fixture=readFixture(m),calls=[];
  const read=async(tool)=>{calls.push(tool);if(tool==='health_check')return {ok:true};if(tool==='get_metadata')return {currentPageId:m.pageId};if(tool==='get_document')return fixture.document;if(tool==='get_node')return {projection:fixture.projection};throw Error(tool);};
  const result=await collectInteractionQA({scope:m.scope,read});assert.equal(result.status,'PASS');assert.equal(result.integrity.writeCalls,0);assert.equal(result.integrity.unchanged,true);assert.equal(calls.length,6);assert.ok(calls.every(c=>qaReadTools.includes(c)));
});
test('raw fallback reports missing destination even when source closure fails',async()=>{
  const f=flowFixture();f.control.reactions[0].actions[0].destinationId='99:99';const fixture=readFixture(f.model),map=new Map(f.model.nodes.map(n=>[n.id,n]));
  const read=async(tool,ids)=>{if(tool==='health_check')return {ok:true};if(tool==='get_metadata')return {currentPageId:f.model.pageId};if(tool==='get_document')return fixture.document;if(tool==='get_node')throw Error('Missing reaction destination: 99:99');if(tool==='get_reactions')return {reactions:map.get(ids[0]).reactions};if(tool==='get_local_components')return {components:[]};if(tool==='get_design_context')return fixture.document;throw Error(tool);};
  const result=await collectInteractionQA({scope:f.model.scope,read});assert.equal(result.status,'FAIL');assert.ok(result.findings.some(f=>f.code==='MISSING_DESTINATION'));assert.equal(result.integrity.writeCalls,0);
});
test('QA command/planner remain terminal, separate from critique and no repairs',()=>{
  const command=read('.opencode/commands/figma/qa.md'),rules=read('rules/figma-interaction-qa.md'),planner=read('rules/figma-prototype-planner.md');
  assert.match(command,/STRICTLY READ-ONLY/);assert.match(command,/rules\/figma-interaction-qa/);assert.match(rules,/QA verifies intended behavior; Critique judges visual quality/);assert.match(planner,/QA_STATUS[\s\S]*BROKEN_EDGE_COUNT/);assert.match(planner,/QA FAIL[\s\S]*success/);
});
test('new dependencies are enumerated without a new public command or runtime drift',()=>{
  for(const p of ['rules/figma-interaction-qa.mjs','rules/figma-interaction-qa.md','scripts/figma-interaction-qa.mjs']){assert.ok(JSON.parse(read('docs/SOURCE_ALLOWLIST.json')).includes(p));assert.ok(JSON.parse(read('docs/RELEASE_ALLOWLIST.json')).includes(p));assert.ok(read('setup.ps1').includes(p));}
  assert.equal(readdirSync(new URL('../.opencode/commands/figma/',import.meta.url)).filter(n=>n.endsWith('.md')).length,14);
  assert.match(read('docs/STATEFUL_VARIABLES_V1_2_5.md'),/FIGMA_STATEFUL_VARIABLES: HOLD\s*$/);
  assert.equal(createHash('sha256').update(read('.opencode/plugins/figma-critique-guard.js')).digest('hex'),'520c8934b0fbc4a334d084596e3e5dd3f4e2aff41fe7ff5bf130e1515c9f11ed');
});

test('prose and overlay heading are not inferred controls; native text links remain candidates',()=>{const f=modalFixture();f.node('8:1','TEXT','3:2','Close returns to the screen',{characters:'Close returns to the screen'});f.node('8:2','TEXT','3:1','Help',{textDecoration:'UNDERLINE',characters:'Help'});const r=analyzeInteractions(f.model);assert.ok(!r.controls.some(c=>['4:4','8:1'].includes(c.id)));assert.ok(r.controls.some(c=>c.id==='8:2'));});
test('absent family variant and malformed source references fail safely',()=>{const f=stateFixture();f.model.families[0].variantIds.push('99:99');assert.ok(analyzeInteractions(f.model).findings.some(f=>f.code==='MISSING_VARIANT'));});
test('same-set state edge outside canonical state ownership is broken',()=>{const f=stateFixture();f.find('5:1').parentId='2:1';assert.ok(analyzeInteractions(f.model).findings.some(f=>f.code==='STATE_SOURCE_OWNERSHIP'));});
test('overlapping independent screens are structural defects unless explicitly intentional',()=>{const f=flowFixture();f.find('3:2').geometry.x=200;assert.ok(analyzeInteractions(f.model).findings.some(f=>f.code==='SCREEN_OVERLAP'));f.model.scope.intentionalOverlap=[['3:1','3:2']];assert.ok(!analyzeInteractions(f.model).findings.some(f=>f.code==='SCREEN_OVERLAP'));});
test('transformed geometry is uncertain rather than compared in incompatible coordinates',()=>{const f=flowFixture();f.find('3:1').props.relativeTransform=[[0,-1,0],[1,0,0]];assert.ok(analyzeInteractions(f.model).findings.some(f=>f.code==='GEOMETRY_UNVERIFIED'));});
test('duplicate source-mapped screens and overlays require matching content plus semantic identity',()=>{const f=modalFixture();const extra=f.node('7:1','FRAME','1:1',f.find('3:2').name,structuredClone(f.find('3:2').props),{...f.find('3:2').geometry,x:1000});extra.children=f.find('3:2').children;f.model.scope.screens.push({id:extra.id,kind:'OVERLAY',optional:true});assert.ok(analyzeInteractions(f.model).findings.some(f=>f.code==='DUPLICATE_OVERLAY'));const g=flowFixture();g.find('3:2').children=g.find('3:1').children;g.model.scope.screens=[{id:'3:1',sourceProductionId:'2:1'},{id:'3:2',sourceProductionId:'2:1'}];assert.ok(analyzeInteractions(g.model).findings.some(f=>f.code==='DUPLICATE_SCREEN'));});
test('complete trigger fields and Disabled semantics are validated without repair',()=>{const f=flowFixture();f.control.reactions[0].trigger={type:'ON_KEY_DOWN'};assert.ok(analyzeInteractions(f.model).findings.some(f=>f.code==='INVALID_TRIGGER_FIELD'));const g=stateFixture();g.control.props.variantProperties.State='Disabled';assert.ok(analyzeInteractions(g.model).findings.some(f=>f.code==='DISABLED_INTERACTIVE'));});
test('automatic self-loop fails; conditional nested graph remains structurally visible but untraversable',()=>{const f=flowFixture();f.control.reactions=[{trigger:{type:'AFTER_TIMEOUT',timeout:.2},actions:[{type:'NODE',navigation:'NAVIGATE',destinationId:'3:1'}]}];assert.ok(analyzeInteractions(f.model).findings.some(f=>f.code==='AUTO_SELF_LOOP'));f.control.reactions=[{trigger:{type:'ON_CLICK'},actions:[{type:'CONDITIONAL',conditionalBlocks:[{condition:null,actions:[{type:'NODE',navigation:'NAVIGATE',destinationId:'3:2'}]}]}]}];const r=analyzeInteractions(f.model);assert.ok(r.graph.edges.some(e=>e.conditional&&!e.traversable));assert.ok(r.findings.some(f=>f.code==='STATEFUL_UNVERIFIED'));});
test('SWAP of a known overlay preserves underlying return context',()=>{const f=modalFixture();const second=f.node('7:1','FRAME','1:1','Overlay / Another',structuredClone(f.find('3:2').props),{x:1000,y:0,width:400,height:300});const swap=f.node('7:2','FRAME','3:2','Swap');swap.reactions=[reaction('SWAP',second.id)];const close=f.node('7:3','FRAME',second.id,'Close');close.reactions=[{trigger:{type:'ON_CLICK'},actions:[{type:'CLOSE'}]}];f.model.scope.scenarios[0].steps.splice(1,1,{type:'SWAP',controlId:swap.id,destinationId:second.id},{type:'CLOSE',controlId:close.id});assert.equal(analyzeInteractions(f.model).scenarios[0].status,'PASS');});
test('expected behavior without a source is not promoted to a fabricated defect',()=>{const f=flowFixture();f.control.reactions=[];delete f.model.scope.controls[0].expected.source;const r=analyzeInteractions(f.model);assert.equal(r.coverage.BROKEN,0);assert.equal(r.coverage.UNKNOWN_EXPECTATION,1);});

test('unknown capability is not counted as a broken graph edge without an evidenced expectation',()=>{const f=flowFixture();f.model.scope.controls=[];f.control.reactions=[{trigger:{type:'ON_CLICK'},actions:[{type:'FUTURE_ACTION'}]}];const r=analyzeInteractions(f.model);assert.equal(r.status,'WARN');assert.equal(r.summary.BROKEN_EDGE_COUNT,0);assert.equal(r.coverage.BROKEN,0);});

test('missing journey starts and nonexistent empty scenarios cannot certify PASS',()=>{const f=flowFixture();f.model.scope.startIds=['99:99'];assert.ok(analyzeInteractions(f.model).findings.some(f=>f.code==='START_CONTEXT'));f.model.scope.startIds=['3:1'];f.model.scope.scenarios=[{id:'invalid',name:'Missing start',startId:'99:99',steps:[]}];assert.equal(analyzeInteractions(f.model).scenarios[0].status,'FAIL');});

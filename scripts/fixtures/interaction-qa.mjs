import {motionTokens} from '../../rules/figma-motion-semantics.mjs';
export function transition(token){const {tolerance,types,...value}=motionTokens[token];return structuredClone(value);}
export const reaction=(navigation,destinationId,token='NAV_DEFAULT',trigger='ON_CLICK')=>({trigger:{type:trigger},actions:[{type:'NODE',navigation,destinationId,transition:transition(token)}]});
export function flowFixture(){
  const model={pageId:'0:1',nodes:[],families:[],scope:{startIds:['3:1'],controls:[{id:'4:1',role:'PRIMARY_ACTION',expected:{confidence:'VERIFIED',source:'Explicit fixture request: Continue opens existing Success',actions:[{type:'NAVIGATE',destinationId:'3:2'}]}}]},complete:true,fingerprints:{before:{document:'synthetic-fixture',graph:'synthetic-fixture'},after:{document:'synthetic-fixture',graph:'synthetic-fixture'}},trace:[]};
  const node=(id,type,parentId,name=id,props={},geometry={x:0,y:0,width:120,height:40})=>{const n={id,type,parentId,name,props:{visible:true,opacity:1,...props},geometry,children:[],reactions:[],component:null};model.nodes.push(n);model.nodes.find(p=>p.id===parentId)?.children.push(id);return n;};
  node('0:1','PAGE',null,'Page',{}, {x:0,y:0,width:0,height:0});
  node('1:1','SECTION','0:1','Figma Designer — Interactive App',{}, {x:1000,y:200,width:2000,height:1000});
  node('2:1','FRAME','0:1','Production',{}, {x:0,y:0,width:400,height:300});
  node('3:1','FRAME','1:1','Start',{}, {x:0,y:0,width:400,height:300});
  node('3:2','FRAME','1:1','Success',{}, {x:500,y:0,width:400,height:300});
  const control=node('4:1','FRAME','3:1','Continue',{fills:['#EEE'],padding:{top:8,right:12,bottom:8,left:12}}, {x:24,y:24,width:120,height:40});
  node('4:2','TEXT','4:1','Label',{characters:'Continue'});control.reactions=[reaction('NAVIGATE','3:2')];
  return {model,node,control,find:id=>model.nodes.find(n=>n.id===id)};
}
export function stateFixture(){
  const f=flowFixture();f.node('6:1','FRAME','0:1','Figma Designer — Component States');
  f.node('5:1','COMPONENT_SET','6:1','Button / Primary');
  const def=f.node('5:2','COMPONENT','5:1','Default',{variantProperties:{State:'Default'}}),hover=f.node('5:3','COMPONENT','5:1','Hover',{variantProperties:{State:'Hover'}});
  def.reactions=[reaction('CHANGE_TO','5:3','STATE_FAST','ON_HOVER')];
  f.model.families=[{id:'5:1',name:'Button / Primary',variantIds:[def.id,hover.id]}];
  f.control.type='INSTANCE';f.control.component={mainComponentId:def.id,componentSetId:'5:1'};f.control.props.variantProperties={State:'Default'};f.control.reactions=structuredClone(def.reactions);
  f.model.scope.controls[0]={id:f.control.id,role:'PRIMARY_ACTION',expectedFamilyId:'5:1',expected:{confidence:'STRONG',source:'Existing state-family semantics',actions:[{type:'CHANGE_TO',destinationId:hover.id,trigger:'ON_HOVER'}]}};
  return f;
}
export function modalFixture(){
  const f=flowFixture(),modal=f.find('3:2');modal.name='Overlay / Details';modal.props={...modal.props,overlayPositionType:'CENTER',overlayBackground:{type:'NONE'},overlayBackgroundInteraction:'NONE'};
  f.control.name='View details';f.control.reactions=[reaction('OVERLAY',modal.id,'OVERLAY_DEFAULT')];
  const close=f.node('4:3','FRAME',modal.id,'Close',{fills:['#EEE'],padding:{top:8}});f.node('4:4','TEXT',close.id,'Close label',{characters:'Close'});close.reactions=[{trigger:{type:'ON_CLICK'},actions:[{type:'CLOSE'}]}];
  f.model.scope.controls[0]={id:f.control.id,role:'OVERLAY_TRIGGER',overlayIntent:'CENTERED',destinationId:modal.id,expected:{confidence:'VERIFIED',source:'Explicit details-modal fixture',actions:[{type:'OPEN_OVERLAY',destinationId:modal.id}]}};
  f.model.scope.screens=[{id:modal.id,kind:'OVERLAY',requiredReachable:true}];
  f.model.scope.scenarios=[{id:'details',name:'Open/close details',startId:'3:1',endId:'3:1',steps:[{type:'OPEN_OVERLAY',controlId:'4:1',destinationId:modal.id},{type:'CLOSE',controlId:close.id}]}];
  return f;
}
const build=(base,change)=>()=>{const f=base();change?.(f);return f.model;};
export const qaCases=[
  {id:'A',name:'valid simple flow',status:'PASS',build:build(flowFixture)},
  {id:'B',name:'dead primary CTA',status:'FAIL',code:'MISSING_BEHAVIOR',build:build(flowFixture,f=>{f.control.reactions=[];})},
  {id:'C',name:'intentionally inert',status:'WARN',build:build(flowFixture,f=>{f.control.reactions=[];f.model.scope.controls=[{id:'4:1',role:'SECONDARY_ACTION',intentionallyInert:true,inertReason:'Source defines no destination or content'}];})},
  {id:'D',name:'invalid destination',status:'FAIL',code:'MISSING_DESTINATION',build:build(flowFixture,f=>{f.control.reactions[0].actions[0].destinationId='99:99';})},
  {id:'E',name:'production destination',status:'FAIL',code:'PRODUCTION_DESTINATION',build:build(flowFixture,f=>{f.control.reactions[0].actions[0].destinationId='2:1';})},
  {id:'F',name:'valid same-family component state',status:'PASS',build:build(stateFixture)},
  {id:'G',name:'cross-family CHANGE_TO',status:'FAIL',code:'CROSS_SET_STATE',build:build(stateFixture,f=>{f.node('7:1','COMPONENT_SET','6:1','Button / Secondary');f.node('7:2','COMPONENT','7:1','Hover',{variantProperties:{State:'Hover'}});f.model.families.push({id:'7:1',name:'Button / Secondary',variantIds:['7:2']});f.control.reactions[0].actions[0].destinationId='7:2';})},
  {id:'H',name:'duplicate equivalent edge',status:'FAIL',code:'DUPLICATE_EDGE',build:build(flowFixture,f=>{f.control.reactions.push(structuredClone(f.control.reactions[0]));})},
  {id:'I',name:'required unreachable screen',status:'FAIL',code:'UNREACHABLE_REQUIRED',build:build(flowFixture,f=>{f.control.reactions=[];f.model.scope.controls=[{id:'4:1',intentionallyInert:true}];f.model.scope.screens=[{id:'3:2',requiredReachable:true}];})},
  {id:'J',name:'valid terminal Success',status:'PASS',build:build(flowFixture,f=>{f.model.scope.screens=[{id:'3:2',role:'VALID_TERMINAL'}];})},
  {id:'K',name:'evidence-required continuation missing',status:'FAIL',code:'DEAD_END',build:build(flowFixture,f=>{f.model.scope.screens=[{id:'3:2',requiresContinuation:true}];})},
  {id:'L',name:'centered modal open and close',status:'PASS',build:build(modalFixture)},
  {id:'M',name:'native contextual configuration limitation',status:'WARN',code:'CONTEXTUAL_LIMIT',build:build(modalFixture,f=>{f.control.reactions=[];f.model.scope.controls[0].overlayIntent='CONTEXTUAL';f.model.scope.scenarios=[];f.model.scope.controlIds=['4:1'];})},
  {id:'N',name:'false centered substitute',status:'FAIL',code:'FALSE_CENTER_SUBSTITUTE',build:build(modalFixture,f=>{f.model.scope.controls[0].overlayIntent='CONTEXTUAL';})},
  {id:'O',name:'semantic motion mismatch',status:'WARN',code:'MOTION_MISMATCH',build:build(flowFixture,f=>{f.control.reactions[0].actions[0].transition={...transition('NAV_SPATIAL'),type:'PUSH',direction:'RIGHT',matchLayers:false};})},
  {id:'P',name:'wrong actual instance family',status:'FAIL',code:'WRONG_FAMILY',build:build(stateFixture,f=>{f.model.scope.controls[0].expectedFamilyId='7:1';f.node('7:1','COMPONENT_SET','6:1','Expected family');f.model.families.push({id:'7:1',name:'Expected family',variantIds:[]});})},
  {id:'Q',name:'detached required inherited behavior',status:'FAIL',code:'DETACHED_INSTANCE',build:build(stateFixture,f=>{f.control.type='FRAME';f.control.component=null;f.model.scope.controls[0].inheritedRequired=true;})},
  {id:'R',name:'source-established Auto Layout order inversion',status:'FAIL',code:'ORDER_INVERSION',build:build(flowFixture,f=>{f.node('4:5','RECTANGLE','3:1','Decoration');f.find('3:1').props.layoutMode='HORIZONTAL';f.model.scope.expectedOrders=[{parentId:'3:1',childIds:['4:5','4:1']}];})},
  {id:'S',name:'duplicate canonical runtime',status:'FAIL',code:'RUNTIME_OWNERSHIP',build:build(flowFixture,f=>{f.node('7:1','SECTION','0:1','Figma Designer — Interactive App');})},
  {id:'T',name:'legacy/canonical ownership ambiguity',status:'FAIL',code:'LEGACY_AMBIGUITY',build:build(flowFixture,f=>{f.node('7:1','SECTION','0:1','Figma Designer — Prototype Flows');})},
];

export function readFixture(model){
  const map=new Map(model.nodes.map(n=>[n.id,n]));
  const raw=n=>({id:n.id,name:n.name,type:n.type,bounds:n.geometry,styles:n.props,...(n.type==='TEXT'?{characters:n.props.characters}:{}),children:n.children.map(id=>raw(map.get(id)))});
  const projected=(n,parentId)=>({id:n.id,name:n.name,type:n.type,parentId,geometry:n.geometry,props:n.props,component:n.component,reactions:n.reactions,children:n.children.map(id=>projected(map.get(id),n.id))});
  const runtime=map.get('1:1');
  const projection={sourceProjectionVersion:'figma-browser-source-v1',document:{pageId:model.pageId},runtime:{...projected(runtime,model.pageId),visible:true},dependencies:[],families:model.families,variables:[],collections:[]};
  return {document:raw(map.get(model.pageId)),projection};
}

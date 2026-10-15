import {isDeepStrictEqual} from 'node:util';
import {normalizeSource} from '../scripts/figma-live-source.mjs';
import {sourceFingerprint} from '../scripts/figma-browser-freshness.mjs';
import {resolveMotion,transitionMatches,inspectScrollContext,conflictingScrollActions} from './figma-motion-semantics.mjs';

export const qaReadTools=Object.freeze(['health_check','get_metadata','get_document','get_node','get_reactions','get_local_components','get_design_context','get_operation_receipt','get_document_revision']);
export const coverageClasses=Object.freeze(['WORKING_ACTION','WORKING_STATE','FIGMA_LIMITED','INTENTIONALLY_INERT','UNKNOWN_EXPECTATION','BROKEN']);
const runtimeName='Figma Designer — Interactive App',libraryName='Figma Designer — Component States',legacyName='Figma Designer — Prototype Flows';
const rank={BLOCKER:0,HIGH:1,MEDIUM:2,LOW:3,LIMITATION:4};
const key=value=>JSON.stringify(normalizeSource(value??null));
const sort=(a,b)=>a.localeCompare(b,'en',{numeric:true});
const roles=/\b(button|cta|link|tab|toggle|checkbox|radio|input|search|filter|select|dropdown|pagination|close|back|menu)\b/i;

export function documentFingerprint(document){
  const styles=document.globalVars?.styles??{};
  function walk(n){const result={...n};delete result.globalVars;
    if(n.styles)result.styles=Object.fromEntries(Object.entries(n.styles).map(([k,v])=>[k,['fills','strokes'].includes(k)&&typeof v==='string'&&Object.hasOwn(styles,v)?styles[v]:v]));
    if(n.children)result.children=n.children.map(walk);return result;
  }
  return sourceFingerprint(normalizeSource(walk(document)));
}

// Adapt existing reads; root placements come from get_document, not zeroed source roots.
export function buildQAModel({document,projection,scope={},reactions={},instances={},registry=[],complete=true,fingerprints,trace=[]}){
  const nodes=new Map();
  function walk(n,parentId){nodes.set(n.id,{id:n.id,name:n.name,type:n.type,parentId,geometry:n.bounds,props:{...n.styles,...(typeof n.characters==='string'?{characters:n.characters}:{})},children:(n.children??[]).map(c=>c.id),reactions:reactions[n.id]??null,component:instances[n.id]??null});for(const c of n.children??[])walk(c,n.id);}
  walk(document,null);
  function merge(n){const existing=nodes.get(n.id);nodes.set(n.id,{...n,...existing,geometry:existing?.geometry??n.geometry,props:{...existing?.props,...n.props},component:n.component??existing?.component,reactions:n.reactions,children:n.children.map(c=>c.id)});for(const c of n.children)merge(c);}
  if(projection){for(const n of [...projection.runtime.children,...projection.dependencies])merge(n);}
  for(const c of registry){const n=nodes.get(c.id);if(n){n.componentSetId=c.componentSetId;n.props.variantProperties=c.variantProperties;}}
  const families=projection?.families??[...nodes.values()].filter(n=>n.type==='COMPONENT_SET').map(n=>({id:n.id,name:n.name,variantIds:n.children}));
  return {pageId:document.id,nodes:[...nodes.values()],families,scope,complete,fingerprints,trace};
}

export function analyzeInteractions(model){
  if(!model?.pageId||!Array.isArray(model.nodes))throw Error('QA requires a current-page node inventory');
  const nodes=new Map(model.nodes.map(n=>[n.id,n])),scope=model.scope??{},annotations=new Map((scope.controls??[]).map(c=>[c.id,c]));
  if(nodes.size!==model.nodes.length)throw Error('QA inventory contains duplicate node IDs');
  const families=new Map((model.families??[]).map(f=>[f.id,f])),findings=[],edges=[];
  const roots=model.nodes.filter(n=>n.parentId===model.pageId);
  const runtimes=roots.filter(n=>n.name===runtimeName),libraries=roots.filter(n=>n.name===libraryName),legacy=roots.filter(n=>n.name===legacyName);
  const runtime=runtimes[0],runtimeId=runtime?.id;
  function ancestry(n){const seen=new Set(),path=[];while(n){if(seen.has(n.id))throw Error('Cyclic node ancestry');seen.add(n.id);path.push(n.id);n=nodes.get(n.parentId);}return path;}
  const productionIds=scope.productionIds??roots.filter(n=>n.type==='FRAME'&&n.name!==libraryName&&n.name!==legacyName).map(n=>n.id);
  const owner=n=>!n?'MISSING':ancestry(n).some(id=>productionIds.includes(id))?'PRODUCTION':ancestry(n).includes(runtimeId)?'INTERACTIVE_RUNTIME':ancestry(n).some(id=>libraries.some(l=>l.id===id))?'COMPONENT_STATE_LIBRARY':ancestry(n).some(id=>legacy.some(l=>l.id===id))?'LEGACY':'UNRELATED';
  const within=(n,id)=>id&&ancestry(n).includes(id);
  function add(code,ids,problem,{severity='MEDIUM',classification='BROKEN',grade='VERIFIED',expected='Defined supported behavior',actual=problem,why='The intended interaction cannot be trusted.',workflow='INTERACTIVE'}={}){
    const affected=[...new Set(ids.filter(Boolean))].sort(sort);
    if(findings.some(f=>f.code===code&&key(f.affectedIds)===key(affected)))return;
    findings.push({code,severity,classification,problem,why,evidence:{grade,ids:affected},affectedIds:affected,expected,actual,recommendedWorkflow:workflow});
  }
  if(runtimes.length!==1||runtime?.type!=='SECTION')add('RUNTIME_OWNERSHIP',runtimes.map(n=>n.id),'Expected one canonical runtime SECTION',{severity:'BLOCKER',workflow:'PROTOTYPE_PLANNER'});
  if(legacy.length&&runtimes.length)add('LEGACY_AMBIGUITY',[...legacy,...runtimes].map(n=>n.id),'Legacy and canonical runtime coexist',{severity:'BLOCKER',workflow:'PROTOTYPE_PLANNER'});
  if(libraries.length>1||libraries.some(n=>n.type!=='FRAME'))add('LIBRARY_OWNERSHIP',libraries.map(n=>n.id),'Ambiguous component-state library',{severity:'BLOCKER',workflow:'STATES'});
  for(const id of [...scope.screenIds??[],...scope.controlIds??[],...scope.startIds??[],...annotations.keys()])if(!nodes.has(id))add('SCOPE_TARGET_MISSING',[id],'Requested QA target does not exist',{severity:'BLOCKER'});
  for(const n of model.nodes)if((n.children??[]).some(id=>!nodes.has(id)))add('INCOMPLETE_HIERARCHY',[n.id],'Referenced child is absent from inventory',{severity:'BLOCKER'});
  const runtimeNodes=model.nodes.filter(n=>within(n,runtimeId));
  for(const n of runtimeNodes){if(owner(n)==='PRODUCTION')add('PRODUCTION_NESTED',[n.id],'Protected production lies inside runtime',{severity:'BLOCKER'});if(['COMPONENT','COMPONENT_SET'].includes(n.type))add('RUNTIME_MASTER',[n.id],'Component master lies inside runtime',{severity:'BLOCKER',workflow:'STATES'});}
  const screenEvidence=new Map((scope.screens??[]).map(s=>[s.id,s]));
  const screens=runtimeNodes.filter(n=>n.type==='FRAME'&&(n.parentId===runtimeId||screenEvidence.has(n.id)||scope.screenIds?.includes(n.id)));
  const overlays=new Set(screens.filter(n=>screenEvidence.get(n.id)?.kind==='OVERLAY'||n.name.startsWith('Overlay / ')).map(n=>n.id));
  for(const n of runtimeNodes)for(const r of n.reactions??[])for(const a of r.actions??[])if(a.navigation==='OVERLAY'&&nodes.get(a.destinationId)?.type==='FRAME'){overlays.add(a.destinationId);if(owner(nodes.get(a.destinationId))==='INTERACTIVE_RUNTIME'&&!screens.some(s=>s.id===a.destinationId))screens.push(nodes.get(a.destinationId));}
  const screenIds=new Set(screens.map(n=>n.id)),screenOf=n=>ancestry(n).find(id=>screenIds.has(id))??null;
  const inScope=n=>(!scope.screenIds||scope.screenIds.includes(screenOf(n)))&&(!scope.controlIds||scope.controlIds.includes(n.id));
  const setOf=n=>n?.component?.componentSetId??n?.componentSetId??[...families.values()].find(f=>f.variantIds.includes(n?.id))?.id??(nodes.get(n?.parentId)?.type==='COMPONENT_SET'?n.parentId:null);
  const stateNodes=model.nodes.filter(n=>n.type==='COMPONENT'&&setOf(n));
  const graphSources=[...runtimeNodes,...stateNodes].filter(n=>n.reactions!==null&&Array.isArray(n.reactions)).sort((a,b)=>sort(a.id,b.id));
  function edgeActions(n,r,reactionIndex,actions,conditional=false){
    const sourceScreenId=screenOf(n),trigger=r.trigger;
    const locationCount=actions.filter(a=>a.type==='NODE'&&['NAVIGATE','OVERLAY','SWAP'].includes(a.navigation)||['BACK','CLOSE'].includes(a.type)).length;
    actions.forEach((action,actionIndex)=>{
      if(action.type==='CONDITIONAL'){add('STATEFUL_UNVERIFIED',[n.id],'Conditional playback remains uncertified (V1.2.5 HOLD)',{severity:'LIMITATION',classification:'FIGMA_LIMITED',grade:'LIMITED',workflow:'INTERACTIVE'});for(const b of action.conditionalBlocks??[])edgeActions(n,r,reactionIndex,b.actions??[],true);return;}
      if(['SET_VARIABLE','SET_VARIABLE_MODE'].includes(action.type)){add('STATEFUL_UNVERIFIED',[n.id],'Stateful playback remains uncertified (V1.2.5 HOLD)',{severity:'LIMITATION',classification:'FIGMA_LIMITED',grade:'LIMITED'});return;}
      const type=action.type==='NODE'?(action.navigation==='OVERLAY'?'OPEN_OVERLAY':action.navigation):action.type;
      const destinationId=action.destinationId??(action.type==='URL'?action.url:null),target=nodes.get(destinationId),sourceSetId=setOf(n),destinationSetId=setOf(target);
      const edge={sourceId:n.id,sourceScreenId,type,destinationId,trigger,action,conditional,reactionIndex,actionIndex,valid:true,traversable:!conditional&&locationCount<=1,motion:null};
      const fail=(code,message,opts={})=>{edge.valid=false;if(edge.failureClassification!=='BROKEN')edge.failureClassification=opts.classification??'BROKEN';if(inScope(n)||owner(n)==='COMPONENT_STATE_LIBRARY')add(code,[n.id,destinationId],message,opts);};
      if(!trigger||!['ON_CLICK','ON_HOVER','ON_PRESS','ON_DRAG','AFTER_TIMEOUT','MOUSE_ENTER','MOUSE_LEAVE','MOUSE_UP','MOUSE_DOWN','ON_KEY_DOWN','ON_MEDIA_HIT','ON_MEDIA_END'].includes(trigger.type))fail('INVALID_TRIGGER','Reaction trigger is invalid');
      const triggerField=trigger?.type==='AFTER_TIMEOUT'?'timeout':trigger?.type?.startsWith('MOUSE_')?'delay':trigger?.type==='ON_MEDIA_HIT'?'mediaHitTime':null;
      if(triggerField&&(!Number.isFinite(trigger[triggerField])||trigger[triggerField]<0))fail('INVALID_TRIGGER_FIELD','Required trigger-specific value is invalid');
      if(trigger?.type==='ON_KEY_DOWN'&&(!['KEYBOARD','XBOX_ONE','PS4','SWITCH_PRO','UNKNOWN_CONTROLLER'].includes(trigger.device)||!Array.isArray(trigger.keyCodes)||!trigger.keyCodes.length||!trigger.keyCodes.every(Number.isInteger)))fail('INVALID_TRIGGER_FIELD','Keyboard trigger requires a supported device and key codes');
      if(['MOUSE_ENTER','MOUSE_LEAVE'].includes(trigger?.type)&&typeof trigger.deprecatedVersion!=='boolean')fail('INVALID_TRIGGER_FIELD','Mouse trigger requires its complete deprecatedVersion field');
      if(type==='URL'){try{const u=new URL(action.url);if(!['http:','https:','mailto:','tel:'].includes(u.protocol))throw Error();}catch{fail('INVALID_URL','URL action has no valid explicit URL');}}
      else if(['NAVIGATE','CHANGE_TO','OPEN_OVERLAY','SCROLL_TO','SWAP'].includes(type)){
        if(!target)fail('MISSING_DESTINATION','Reaction destination is absent',{severity:'HIGH',workflow:type==='CHANGE_TO'?'STATES':'FLOW'});
        else if(type==='CHANGE_TO'){if(target.type!=='COMPONENT'||!sourceSetId||sourceSetId!==destinationSetId)fail('CROSS_SET_STATE','CHANGE_TO is not a compatible same-family state',{severity:'HIGH',workflow:'STATES'});else if(owner(target)!=='COMPONENT_STATE_LIBRARY')fail('STATE_SOURCE_OWNERSHIP','State destination lies outside the owned component-state library',{severity:'HIGH',workflow:'STATES'});}
        else if(type==='SCROLL_TO'){if(owner(target)!=='INTERACTIVE_RUNTIME'||screenOf(target)!==sourceScreenId)fail('INVALID_SCROLL_CONTEXT','SCROLL_TO leaves the intended runtime screen');}
        else if(owner(target)!=='INTERACTIVE_RUNTIME')fail('PRODUCTION_DESTINATION','Runtime navigation points outside owned runtime',{severity:'BLOCKER',workflow:'FLOW'});
        else if(target.type!=='FRAME'||!screenIds.has(target.id))fail('DESTINATION_TYPE','Destination is not an inventoried runtime FRAME',{severity:'HIGH',workflow:'FLOW'});
        else if(type==='SWAP'&&overlays.has(sourceScreenId)&&!overlays.has(target.id))fail('SWAP_CONTEXT','Overlay swap destination is not a verified overlay',{severity:'HIGH',workflow:'INTERACTIVE'});
      }else if(type==='CLOSE'){if(!overlays.has(sourceScreenId))fail('CLOSE_CONTEXT','CLOSE is outside an overlay context');}
      else if(type!=='BACK')fail('UNKNOWN_ACTION','Action is not verified by the current supported graph',{classification:'UNKNOWN_EXPECTATION',grade:'LIMITED',severity:'LIMITATION'});
      if(action.overlayRelativePosition&&(type!=='OPEN_OVERLAY'||target?.props?.overlayPositionType!=='MANUAL'))fail('INVALID_MANUAL_POSITION','Relative overlay position requires a verified MANUAL destination',{severity:'HIGH'});
      if(edge.valid&&action.type==='NODE'){
        const hint=annotations.get(n.id)?.motion??{},intent=hint.intent??({CHANGE_TO:'STATE',NAVIGATE:'NAVIGATION',OPEN_OVERLAY:'OVERLAY',SCROLL_TO:'SCROLL'}[type]);
        if(intent){const scrollContext=type==='SCROLL_TO'?inspectScrollContext({nodes:model.nodes,sourceId:n.id,destinationId,runtimeId}):null;
          const decision=intent==='SCROLL_SMOOTH'&&conflictingScrollActions(n.reactions,reactionIndex)?{support:'UNKNOWN',token:'SCROLL_SMOOTH',reason:'Conflicting reaction semantics'}:resolveMotion({intent,action,evidence:{...hint.evidence,destinationExists:!!target,runtimeDestination:owner(target)==='INTERACTIVE_RUNTIME',sourceSetId,destinationSetId,...(scrollContext?{scrollContext,sourceId:n.id,intendedDestinationId:destinationId}:{})},override:hint.override});
          edge.motion={intent,token:decision.token,status:decision.support==='UNKNOWN'?'UNKNOWN':decision.support==='LIMITED'?'LIMITED':decision.transition&&!transitionMatches(action.transition,decision.transition)?'MISMATCH':'MATCH'};
          if(type==='SCROLL_TO')edge.motion.context=scrollContext;
          if(intent==='SCROLL_SMOOTH'&&scrollContext?.status==='PREPARED'&&action.transition!=null&&action.transition.type!=='SCROLL_ANIMATE')edge.motion.status='MISMATCH';
          if(intent==='SCROLL_SMOOTH'&&inScope(n)&&edge.motion.status==='LIMITED')add('SCROLL_CONTEXT_LIMITED',[n.id,destinationId],decision.reason,{severity:'LIMITATION',classification:'FIGMA_LIMITED',grade:'LIMITED',workflow:'MOTION'});
          else if(intent==='SCROLL_SMOOTH'&&inScope(n)&&edge.motion.status==='UNKNOWN')add('SCROLL_CONTEXT_UNKNOWN',[n.id,destinationId],decision.reason,{severity:'LIMITATION',classification:'UNKNOWN_EXPECTATION',grade:'LIMITED',workflow:'MOTION'});
          if(edge.motion.status==='MISMATCH'&&(inScope(n)||owner(n)==='COMPONENT_STATE_LIBRARY')){
            if(intent==='SCROLL_SMOOTH')add('SMOOTH_SCROLL_MISMATCH',[n.id,destinationId],'Explicit smooth-scroll requirement is not implemented in the prepared context',{severity:'MEDIUM',workflow:'MOTION',expected:decision.token,actual:key(action.transition)});
            else add('MOTION_MISMATCH',[n.id,destinationId],'Existing transition differs from its supported semantic token',{severity:'LOW',classification:'WORKING_ACTION',workflow:'MOTION',expected:decision.token,actual:key(action.transition),why:'The transition does not follow the verified interaction meaning.'});
          }
        }
      }
      if(type==='NAVIGATE'&&trigger?.type==='AFTER_TIMEOUT'&&destinationId===sourceScreenId&&inScope(n))fail('AUTO_SELF_LOOP','Automatic navigation repeats the same screen without progress',{severity:'HIGH',workflow:'FLOW'});
      edges.push(edge);
    });
  }
  for(const n of graphSources){const seen=new Set();(n.reactions??[]).forEach((r,i)=>{
    if(!Array.isArray(r.actions)){if(inScope(n))add('INCOMPLETE_REACTIONS',[n.id],'Complete plural reaction array unavailable',{severity:'BLOCKER',grade:'LIMITED'});return;}
    if(r.trigger&&!r.actions.length&&inScope(n))add('EMPTY_REACTION',[n.id],'Trigger has no actual action');
    if(r.action&&!isDeepStrictEqual(r.action,r.actions[0])&&inScope(n))add('ACTION_MIRROR',[n.id],'Deprecated action mirror differs from actual array');
    for(const action of r.actions){const k=key({trigger:r.trigger??null,action});if(seen.has(k)&&(inScope(n)||owner(n)==='COMPONENT_STATE_LIBRARY'))add('DUPLICATE_EDGE',[n.id,action.destinationId],'Equivalent edge occurs more than once');seen.add(k);}
    edgeActions(n,r,i,r.actions);
  });}
  function label(n){return (n.children??[]).map(id=>nodes.get(id)).filter(c=>c?.type==='TEXT').map(c=>c.props?.characters??c.name).join(' ')||n.name;}
  function meaningful(n){if(annotations.has(n.id))return true;if(n.reactions?.length)return true;if(screenIds.has(n.id)||!['FRAME','INSTANCE','TEXT'].includes(n.type))return false;
    if(n.type==='TEXT')return n.props?.textDecoration==='UNDERLINE'&&!(nodes.get(n.parentId)?.reactions?.length);
    const family=families.get(setOf(n));if(n.type==='INSTANCE'&&roles.test(family?.name??''))return true;
    const textChildren=(n.children??[]).map(id=>nodes.get(id)).filter(c=>c?.type==='TEXT');
    const padding=n.props?.padding||['paddingTop','paddingLeft','paddingRight','paddingBottom'].some(k=>n.props?.[k]>0);
    return roles.test(n.name)||(textChildren.length===1&&n.children.length===1&&padding&&((n.props?.fills?.length??0)+(n.props?.strokes?.length??0)>0));
  }
  const inventory=runtimeNodes.filter(n=>n.props?.visible!==false&&meaningful(n)&&inScope(n)).sort((a,b)=>sort(a.id,b.id)).map(n=>{
    const a=annotations.get(n.id)??{},actual=edges.filter(e=>e.sourceId===n.id),role=a.role??(/^close\b/i.test(n.name)?'CLOSE':/^back\b/i.test(n.name)?'BACK':'OTHER_MEANINGFUL_CONTROL');
    const expectation=a.expected??((role==='CLOSE'&&overlays.has(screenOf(n)))?{confidence:'STRONG',source:'Real close control in opened overlay',actions:[{type:'CLOSE'}]}:null);
    const required=expectation&&['VERIFIED','STRONG'].includes(expectation.confidence)&&typeof expectation.source==='string'&&expectation.source.trim(),expected=required?expectation.actions??[]:[];
    const missing=expected.filter(w=>!actual.some(e=>e.valid&&e.type===w.type&&(!w.destinationId||e.destinationId===w.destinationId)&&(!w.trigger||e.trigger?.type===w.trigger)));
    const positionType=nodes.get(a.destinationId)?.props?.overlayPositionType;
    const contextualReady=positionType==='MANUAL'||positionType&&positionType!=='CENTER'&&a.preconfiguredVerified;
    if(a.overlayIntent&&nodes.has(a.destinationId)&&positionType===undefined)add('OVERLAY_SETTINGS_UNVERIFIED',[n.id,a.destinationId],'Required readonly overlay settings could not be read',{severity:'BLOCKER',classification:'UNKNOWN_EXPECTATION',grade:'LIMITED'});
    const limitation=a.overlayIntent==='CONTEXTUAL'&&positionType!==undefined&&!contextualReady;
    if(limitation){if(actual.some(e=>e.type==='OPEN_OVERLAY'&&nodes.get(e.destinationId)?.props?.overlayPositionType==='CENTER'))add('FALSE_CENTER_SUBSTITUTE',[n.id,a.destinationId],'Contextual intent was implemented as a centered overlay',{severity:'HIGH',expected:'Trigger-relative contextual overlay',actual:'CENTER'});
      else add('CONTEXTUAL_LIMIT',[n.id,a.destinationId],'Contextual destination configuration is readonly',{severity:'LIMITATION',classification:'FIGMA_LIMITED',grade:'LIMITED',expected:'Contextual placement',actual:'Destination not suitably preconfigured',why:'Current Plugin API cannot configure that destination.'});
    }else if(missing.length)add('MISSING_BEHAVIOR',[n.id,...missing.map(w=>w.destinationId)],'Implementable expected action is missing',{severity:role==='PRIMARY_ACTION'?'HIGH':'MEDIUM',grade:expectation.confidence,expected:key(missing),actual:key(actual.map(e=>({type:e.type,destinationId:e.destinationId}))),workflow:missing.some(w=>w.type==='CHANGE_TO')?'STATES':missing.some(w=>['NAVIGATE','BACK'].includes(w.type))?'FLOW':'INTERACTIVE'});
    if(a.outsideClickRequired&&nodes.get(a.destinationId)?.props?.overlayBackgroundInteraction!=='CLOSE_ON_CLICK_OUTSIDE')add('OUTSIDE_CLICK_LIMIT',[n.id,a.destinationId],'Required outside-click dismissal is not preconfigured',{severity:'LIMITATION',classification:'FIGMA_LIMITED',grade:'LIMITED'});
    if(a.backgroundRequired&&!isDeepStrictEqual(nodes.get(a.destinationId)?.props?.overlayBackground,a.backgroundRequired))add('BACKGROUND_LIMIT',[n.id,a.destinationId],'Required overlay background is not preconfigured',{severity:'LIMITATION',classification:'FIGMA_LIMITED',grade:'LIMITED'});
    if(n.type==='INSTANCE'){
      const source=nodes.get(n.component?.mainComponentId),family=setOf(n);
      if(!source||source.type!=='COMPONENT'||family!==setOf(source))add('INSTANCE_SOURCE',[n.id,n.component?.mainComponentId],'Actual instance source/family cannot be resolved',{severity:'HIGH'});
      else if(a.expectedFamilyId&&family!==a.expectedFamilyId)add('WRONG_FAMILY',[n.id,family,a.expectedFamilyId],'Instance resolves to the wrong intended family',{severity:'HIGH'});
    }else if(a.inheritedRequired)add('DETACHED_INSTANCE',[n.id],'Required inherited component behavior is detached',{severity:'HIGH'});
    const disabled=n.props?.variantProperties?.State==='Disabled';if(disabled&&a.disabledInert!==false&&actual.length)add('DISABLED_INTERACTIVE',[n.id],'Disabled control has interactive reactions',{severity:'HIGH',workflow:'STATES'});
    const stateWorking=actual.some(e=>e.type==='CHANGE_TO'&&e.valid);
    return {id:n.id,label:a.label??label(n),role,nodeType:n.type,screenId:screenOf(n),sourceProductionId:a.sourceProductionId??null,instanceSourceComponentId:n.component?.mainComponentId??null,componentSetId:setOf(n),expectedBehavior:expectation??{confidence:'INSUFFICIENT',source:a.inertReason??'No defined behavior; no product logic guessed'},actualBehavior:actual,workingState:stateWorking,classification:null,evidence:[{grade:required?expectation.confidence:'VERIFIED',ids:[n.id],detail:'Native structure and complete reaction readback'}],annotation:a};
  });
  for(const family of families.values()){
    for(const id of family.variantIds)if(nodes.get(id)?.type!=='COMPONENT')add('MISSING_VARIANT',[family.id,id],'Referenced variant is absent or not a COMPONENT',{severity:'HIGH',workflow:'STATES'});
    const variants=family.variantIds.map(id=>nodes.get(id)).filter(Boolean),seen=new Set();
    for(const variant of variants){const state=key(variant.props?.variantProperties??{});if(seen.has(state))add('DUPLICATE_STATE',[family.id,variant.id],'Duplicate variant property combination',{workflow:'STATES'});seen.add(state);}
    for(const state of scope.requiredStates?.[family.id]??[])if(!variants.some(n=>n.props?.variantProperties?.State===state))add('MISSING_STATE',[family.id],'A source-required state is absent',{severity:'HIGH',grade:'STRONG',workflow:'STATES',expected:state,actual:variants.map(n=>n.props?.variantProperties?.State).join(',')});
  }
  function shape(n){if(!n)return {missing:true};return {type:n.type,props:n.props,dimensions:n.geometry?{width:n.geometry.width,height:n.geometry.height}:null,children:(n.children??[]).map(id=>shape(nodes.get(id)))};}
  const familyKeys=new Map(),overlayKeys=new Map(),sourceKeys=new Map();
  for(const f of families.values()){const k=key({role:f.role??f.name,variants:f.variantIds.map(id=>nodes.get(id)).filter(Boolean).map(shape)});if(familyKeys.has(k)&&!scope.intentionalDuplicates?.includes(f.id))add('DUPLICATE_FAMILY',[f.id,familyKeys.get(k)],'Equivalent component families share the same semantic role',{grade:'STRONG',workflow:'STATES'});familyKeys.set(k,f.id);}
  for(const n of screens){const s=screenEvidence.get(n.id)??{};if(s.sourceProductionId){const k=key([s.sourceProductionId,s.role??'SCREEN',shape(n)]);if(sourceKeys.has(k)&&!s.intentionalRepeat)add('DUPLICATE_SCREEN',[n.id,sourceKeys.get(k)],'Equivalent runtime screens map to the same production source',{grade:'STRONG'});sourceKeys.set(k,n.id);}
    if(s.sourceProductionId&&nodes.get(s.sourceProductionId)?.children?.length&&!n.children?.length)add('EMPTY_RUNTIME_ARTIFACT',[n.id,s.sourceProductionId],'Empty runtime wrapper replaces a nonempty source screen',{severity:'HIGH',grade:'STRONG'});
    if(overlays.has(n.id)){const k=key({role:s.role??n.name,content:shape(n)});if(overlayKeys.has(k)&&!s.intentionalRepeat)add('DUPLICATE_OVERLAY',[n.id,overlayKeys.get(k)],'Equivalent overlay content/role is duplicated',{grade:'STRONG'});overlayKeys.set(k,n.id);}
  }
  function position(n){let x=0,y=0;for(const id of ancestry(n)){const a=nodes.get(id);const t=a.props?.relativeTransform;if(t&&(t[0][0]!==1||t[0][1]!==0||t[1][0]!==0||t[1][1]!==1))return null;x+=a.geometry?.x??0;y+=a.geometry?.y??0;}return {x,y};}
  for(const n of screens.filter(n=>!scope.screenIds||scope.screenIds.includes(n.id))){const p=position(n),r=runtime&&position(runtime);if(p&&r&&runtime.geometry&&n.geometry&&(p.x<r.x||p.y<r.y||p.x+n.geometry.width>r.x+runtime.geometry.width||p.y+n.geometry.height>r.y+runtime.geometry.height))add('SCREEN_OUTSIDE_RUNTIME',[n.id,runtimeId],'Runtime FRAME extends outside SECTION in matching coordinates',{workflow:'REVISION'});}
  const comparable=screens.filter(n=>!overlays.has(n.id)&&n.parentId===runtimeId&&(!scope.screenIds||scope.screenIds.includes(n.id)));
  for(let i=0;i<comparable.length;i++)for(const b of comparable.slice(i+1)){const a=comparable[i],p=position(a),q=position(b);if(!p||!q||!a.geometry||!b.geometry)continue;
    if(p.x<q.x+b.geometry.width&&q.x<p.x+a.geometry.width&&p.y<q.y+b.geometry.height&&q.y<p.y+a.geometry.height&&!scope.intentionalOverlap?.some(ids=>ids.includes(a.id)&&ids.includes(b.id)))add('SCREEN_OVERLAP',[a.id,b.id],'Separate runtime screens overlap structurally',{grade:'STRONG',workflow:'REVISION',why:'Unintentional authoring overlap obscures independent runtime screen boundaries.'});
  }
  for(const n of screens.filter(n=>!scope.screenIds||scope.screenIds.includes(n.id)))if(!position(n))add('GEOMETRY_UNVERIFIED',[n.id],'Rotated/scaled ancestry prevents this axis-aligned geometry check',{severity:'LIMITATION',classification:'UNKNOWN_EXPECTATION',grade:'LIMITED',workflow:'REVISION'});
  for(const c of inventory){const g=nodes.get(c.id).geometry;if(!g||![g.x,g.y,g.width,g.height].every(Number.isFinite)||g.width<=0||g.height<=0)add('INVALID_BOUNDS',[c.id],'Meaningful control has invalid or non-positive bounds',{workflow:'REVISION'});}
  for(const order of scope.expectedOrders??[]){const n=nodes.get(order.parentId);if(!n||key(n.children)!==key(order.childIds))add('ORDER_INVERSION',[order.parentId,...order.childIds],'Actual child order differs from source-established order',{grade:'STRONG',workflow:'REVISION',expected:key(order.childIds),actual:key(n?.children??[])});}
  const normalScreens=screens.filter(n=>!overlays.has(n.id)&&(!scope.screenIds||scope.screenIds.includes(n.id)));
  const navigation=edges.filter(e=>e.valid&&e.traversable&&['NAVIGATE','SWAP'].includes(e.type));
  const starts=scope.startIds??normalScreens.filter(n=>!navigation.some(e=>e.destinationId===n.id)).map(n=>n.id).sort(sort);
  for(const id of scope.startIds??[])if(!normalScreens.some(n=>n.id===id))add('START_CONTEXT',[id],'Journey start is not a scoped runtime screen',{severity:'BLOCKER',workflow:'PROTOTYPE_PLANNER'});
  if(!starts.length&&normalScreens.length)add('UNKNOWN_START',normalScreens.map(n=>n.id),'No evidence establishes a journey start; canvas position is not meaning',{severity:'LIMITATION',classification:'UNKNOWN_EXPECTATION',grade:'LIMITED',workflow:'PROTOTYPE_PLANNER'});
  function reach(start){const reached=new Set([start]),queue=[start];while(queue.length){const id=queue.shift();for(const e of edges.filter(e=>e.valid&&e.traversable&&e.sourceScreenId===id&&['NAVIGATE','SWAP','OPEN_OVERLAY'].includes(e.type)))if(!reached.has(e.destinationId)){reached.add(e.destinationId);queue.push(e.destinationId);}}return [...reached].sort(sort);}
  const journeys=starts.map(start=>{const reached=reach(start),terminal=normalScreens.filter(n=>reached.includes(n.id)&&!navigation.some(e=>e.sourceScreenId===n.id)).map(n=>({id:n.id,status:screenEvidence.get(n.id)?.requiresContinuation?'DEAD_END':'VALID_TERMINAL',reason:screenEvidence.get(n.id)?.requiresContinuation?'Source/user requires continuation':'No onward path required by supplied evidence'}));return {startId:start,reachableScreens:reached.filter(id=>!overlays.has(id)),reachableOverlays:reached.filter(id=>overlays.has(id)),terminals:terminal,unreachableScreens:normalScreens.map(n=>n.id).filter(id=>!reached.includes(id)),unreachableOverlays:[...overlays].filter(id=>!reached.includes(id)),brokenEdges:edges.filter(e=>!e.valid&&e.failureClassification==='BROKEN'&&reached.includes(e.sourceScreenId)).map(e=>({sourceId:e.sourceId,destinationId:e.destinationId}))};});
  const reachable=new Set(journeys.flatMap(j=>[...j.reachableScreens,...j.reachableOverlays]));
  for(const n of screens.filter(n=>!scope.screenIds||scope.screenIds.includes(n.id))){const s=screenEvidence.get(n.id)??{};
    if(s.requiresContinuation&&reachable.has(n.id)&&!navigation.some(e=>e.sourceScreenId===n.id))add('DEAD_END',[n.id],'Required continuation/return path is absent',{severity:'HIGH',grade:'STRONG',workflow:'FLOW'});
    const knownLimited=[...annotations.values()].some(a=>a.destinationId===n.id&&a.overlayIntent==='CONTEXTUAL'&&n.props?.overlayPositionType!==undefined&&n.props.overlayPositionType!=='MANUAL'&&!(n.props.overlayPositionType!=='CENTER'&&a.preconfiguredVerified));
    if(!reachable.has(n.id)&&s.requiredReachable&&!knownLimited)add('UNREACHABLE_REQUIRED',[n.id],'Required runtime destination is unreachable',{grade:'STRONG',workflow:'FLOW'});
    if(overlays.has(n.id)&&!reachable.has(n.id)&&!knownLimited&&!s.optional)add('ORPHAN_OVERLAY',[n.id],'Overlay has no reachable opener',{classification:'UNKNOWN_EXPECTATION',severity:'LOW',grade:'STRONG'});
  }
  const scenarios=(scope.scenarios??[]).map(s=>{
    let screenId=s.startId,stateId=s.startId,history=[],stack=[],status='PASS',reason='Verified structural path; not manual playback',path=[s.startId];
    if(!screenIds.has(s.startId)&&!stateNodes.some(n=>n.id===s.startId)){status='FAIL';reason='Scenario start is not an actual screen or state variant';}
    for(const step of s.steps){const candidates=edges.filter(e=>e.valid&&e.type===step.type&&(!step.controlId||e.sourceId===step.controlId)&&(!step.destinationId||e.destinationId===step.destinationId)&&(!step.trigger||e.trigger?.type===step.trigger));
      if(status!=='PASS')break;
      const e=candidates.find(e=>e.type==='CHANGE_TO'?e.sourceId===stateId||nodes.get(e.sourceId)?.component?.mainComponentId===stateId:e.sourceScreenId===(stack.at(-1)??screenId));
      if(!e){status='FAIL';reason='Required path step is missing or invalid';break;}
      if(!e.traversable){status='LIMITED';reason='Conditional/multi-location action execution is not certified';break;}
      if(e.type==='OPEN_OVERLAY')stack.push(e.destinationId);else if(e.type==='CLOSE'){if(!stack.length){status='FAIL';reason='No overlay context to close';break;}stack.pop();}
      else if(e.type==='BACK'){if(!history.length){status='LIMITED';reason='Back history is not established';break;}screenId=history.pop();stack=[];}
      else if(e.type==='SWAP'&&stack.length)stack[stack.length-1]=e.destinationId;
      else if(['NAVIGATE','SWAP'].includes(e.type)){if(e.type==='NAVIGATE')history.push(screenId);screenId=e.destinationId;stack=[];}
      else if(e.type==='CHANGE_TO')stateId=e.destinationId;
      path.push(e.type==='CHANGE_TO'?stateId:stack.at(-1)??screenId);
    }
    if(status==='PASS'&&s.endId&&(path.at(-1)!==s.endId)){status='FAIL';reason='Path ends in the wrong context';}
    if(status==='FAIL'&&s.required!==false)add('SCENARIO_FAILED',[s.startId,...s.steps.map(x=>x.controlId)],reason,{severity:s.primary?'BLOCKER':'HIGH',grade:'STRONG',workflow:'PROTOTYPE_PLANNER',expected:s.name,actual:key(path)});
    return {id:s.id,name:s.name,status,path,reason};
  });
  const writeCalls=(model.trace??[]).filter(c=>!qaReadTools.includes(c.tool)).length;
  if(writeCalls)add('QA_MUTATION_CALL',[],'A forbidden tool was called during QA',{severity:'BLOCKER',expected:'WRITE_CALLS: 0',actual:String(writeCalls)});
  if(model.fingerprints&&!isDeepStrictEqual(model.fingerprints.before,model.fingerprints.after))add('FINGERPRINT_CHANGED',[],'Protected document/source fingerprint changed during QA',{severity:'BLOCKER',expected:key(model.fingerprints.before),actual:key(model.fingerprints.after)});
  if(model.complete===false)add('INCOMPLETE_EVIDENCE',[],'Required readback could not be completed',{severity:'BLOCKER',classification:'UNKNOWN_EXPECTATION',grade:'LIMITED'});
  if(!model.fingerprints)add('MISSING_INTEGRITY_EVIDENCE',[],'Before/after protected fingerprints were not supplied',{severity:'BLOCKER',classification:'UNKNOWN_EXPECTATION',grade:'LIMITED'});
  for(const c of inventory){const f=findings.filter(f=>f.affectedIds.includes(c.id));c.classification=f.some(f=>f.classification==='BROKEN')?'BROKEN':f.some(f=>f.classification==='FIGMA_LIMITED')?'FIGMA_LIMITED':c.actualBehavior.some(e=>e.valid&&e.type!=='CHANGE_TO')?'WORKING_ACTION':c.workingState?'WORKING_STATE':c.annotation.intentionallyInert?'INTENTIONALLY_INERT':'UNKNOWN_EXPECTATION';delete c.annotation;}
  findings.sort((a,b)=>rank[a.severity]-rank[b.severity]||sort(a.affectedIds.join('|'),b.affectedIds.join('|'))||sort(a.code,b.code));
  const numbered=findings.map((f,i)=>({id:'Q'+String(i+1).padStart(2,'0'),...f})),coverage=Object.fromEntries(coverageClasses.map(c=>[c,inventory.filter(n=>n.classification===c).length]));
  const severityCounts=Object.fromEntries(Object.keys(rank).map(s=>[s,numbered.filter(f=>f.severity===s).length]));
  const failed=coverage.BROKEN>0||findings.some(f=>f.classification==='BROKEN')||severityCounts.BLOCKER>0;
  const warned=coverage.FIGMA_LIMITED+coverage.INTENTIONALLY_INERT+coverage.UNKNOWN_EXPECTATION>0||findings.length>0||scenarios.some(s=>s.status==='LIMITED');
  const status=failed?'FAIL':warned?'WARN':'PASS';
  const graphNodes=new Map([...screens.map(n=>({id:n.id,type:overlays.has(n.id)?'OVERLAY':'SCREEN'})),...stateNodes.map(n=>({id:n.id,type:'STATE_VARIANT'}))].map(n=>[n.id,n]));
  for(const e of edges)if(e.valid&&['URL','SCROLL_TO'].includes(e.type)&&!graphNodes.has(e.destinationId))graphNodes.set(e.destinationId,{id:e.destinationId,type:e.type==='URL'?'EXTERNAL_URL':'SCROLL_TARGET'});
  return {status,scope:{runtimeId,screenIds:screens.filter(n=>!scope.screenIds||scope.screenIds.includes(n.id)).map(n=>n.id).sort(sort)},ownership:Object.fromEntries(model.nodes.map(n=>[n.id,overlays.has(n.id)&&owner(n)==='INTERACTIVE_RUNTIME'?'OVERLAY_RUNTIME':owner(n)])),controls:inventory,coverage,stateFacetCount:inventory.filter(n=>n.workingState).length,graph:{nodes:[...graphNodes.values()],edges},journeys,scenarios,findings:numbered,summary:{QA_STATUS:status,BLOCKER_COUNT:severityCounts.BLOCKER,HIGH_COUNT:severityCounts.HIGH,MEDIUM_COUNT:severityCounts.MEDIUM,LOW_COUNT:severityCounts.LOW,LIMITATION_COUNT:severityCounts.LIMITATION,BROKEN_CONTROL_COUNT:coverage.BROKEN,UNREACHABLE_COUNT:screens.filter(n=>(!scope.screenIds||scope.screenIds.includes(n.id))&&!reachable.has(n.id)).length,BROKEN_EDGE_COUNT:edges.filter(e=>!e.valid&&e.failureClassification==='BROKEN').length},integrity:{unchanged:model.fingerprints?isDeepStrictEqual(model.fingerprints.before,model.fingerprints.after):null,fingerprints:model.fingerprints??null,readCalls:(model.trace??[]).length-writeCalls,writeCalls},evidenceMode:'STRUCTURAL_READBACK; playback not inferred'};
}

export function formatQAReport(result){
  const lines=[`FIGMA_INTERFACE_QA: ${result.status}`,'',`Scope: runtime ${result.scope.runtimeId??'unresolved'}; ${result.scope.screenIds.length} FRAMEs; ${result.controls.length} meaningful controls.`, 'Coverage: '+Object.entries(result.coverage).map(([k,v])=>`${k}=${v}`).join(', '),`Inherited state facets: ${result.stateFacetCount}`,'', 'Journeys:'];
  for(const s of result.scenarios)lines.push(`${s.name}: ${s.status} — ${s.path.join(' → ')} (${s.reason})`);
  for(const j of result.journeys)lines.push(`Start ${j.startId}: screens ${j.reachableScreens.join(', ')}; overlays ${j.reachableOverlays.join(', ')||'none'}; terminals ${j.terminals.map(t=>`${t.id} ${t.status}`).join(', ')||'none'}`);
  lines.push('', 'Findings:');for(const f of result.findings)lines.push(`${f.id} — ${f.severity} — ${f.classification}`,`Problem: ${f.problem}`,`Why it matters: ${f.why}`,`Evidence: ${f.evidence.grade}; IDs ${f.affectedIds.join(', ')||'QA boundary'}`,`Expected: ${f.expected}`,`Actual: ${f.actual}`,`Recommended next workflow: ${f.recommendedWorkflow} (not executed)`,'');
  lines.push('QA summary: '+JSON.stringify(result.summary),`Production/document: ${result.integrity.unchanged===true?'unchanged':result.integrity.unchanged===false?'CHANGED':'not supplied'}`,`READ_CALLS: ${result.integrity.readCalls}`,`WRITE_CALLS: ${result.integrity.writeCalls}`,result.evidenceMode);return lines.join('\n');
}

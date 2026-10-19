import {activityVersion,activityCopy,activityGroups} from '../shared/agent-activity.mjs';

const observers=new WeakMap();
const reads=new Set('health_check get_document get_design_context get_metadata get_node get_nodes_info get_pages get_selection get_viewport get_local_components get_styles get_reactions get_screenshot get_document_revision get_fonts get_variable_defs get_annotations get_recent_errors inspect_node_as_html get_html explain_node explain_layout diff_node_vs_html validate_html scan_nodes_by_types scan_text_nodes search_nodes list_slides'.split(' '));
const components=new Set('combine_as_variants create_component create_component_from_html instantiate_by_name swap_component detach_instance set_instance_overrides_batch'.split(' '));
const prototypes=new Set('set_reactions remove_reactions'.split(' '));
const exports=new Set('save_screenshots export_frames_to_pdf export_html_self_contained export_node_as_react export_tokens'.split(' '));
const writes=new Set('add_page create_frame create_text create_rectangle create_ellipse create_section create_variable create_variable_collection add_variable_mode set_variable_value delete_variable bind_variable_to_node bind_variable_to_style create_effect_style create_grid_style create_paint_style create_text_style create_styles_from_palette create_text_scale import_design_tokens import_image replace_image_globally clone_node delete_nodes delete_page delete_style apply_style_to_node apply_styles_batch auto_layout_from_positions align_nodes distribute_nodes batch_rename_nodes find_replace_text group_nodes ungroup_nodes lock_nodes unlock_nodes make_slide_grid move_nodes move_to_anchor navigate_to_page pack_grid patch_html regenerate_slide rename_node rename_page reorder_nodes reparent_nodes resize_nodes rotate_nodes set_auto_layout set_blend_mode set_constraints set_corner_radius set_effects set_fills set_opacity set_strokes set_text set_visible slide_template update_node_props update_paint_style write_html write_html_batch'.split(' '));
export function classifyActivityTool(name){
 if(typeof name!=='string'||name.length>100)return 'OTHER';
 const n=name.replace(/^figma(?:_critique_|_qa_|_|\.)/,'');
 if(n==='get_operation_receipt')return 'RECOVERY';
 if(name==='figma_qa_report')return 'QA';
 if(name==='figma_browser_test_report')return 'BROWSER';
 if(reads.has(n))return 'READ_DESIGN';if(components.has(n))return 'COMPONENTS';if(prototypes.has(n))return 'PROTOTYPE';if(exports.has(n))return 'EXPORT';if(writes.has(n))return 'WRITE_DESIGN';return 'OTHER';
}
function state(run){let s=observers.get(run);if(!s){s={index:0,pending:new Set(),seen:new Map(),wrote:false};observers.set(run,s);}return s;}
function emit(run,messageId,{group='OTHER',active=false,attention=false,terminal=false,observation='state',now=new Date().toISOString(),restored=false}={}){
 const copy=activityCopy[messageId];if(!copy)return;
 const previous=run.agentActivity,key=copy.phase+':'+(modeMessage(run.mode)&&group!=='RECOVERY'?run.mode:group);
 const same=previous?.semanticKey===key;
 const sequence=(previous?.sequence??0)+(same?0:1);
 const technical={workflow:['AUTO','DESIGN','QA','BROWSER','BROWSER_TEST','STATUS'].includes(run.mode)?run.mode:'AUTO',runState:['RUNNING','COMPLETED','FAILED','CANCELLED','WAITING_FOR_USER'].includes(run.state)?run.state:'UNKNOWN',category:activityGroups.includes(group)?group:'OTHER',...(restored?{restored:true}:{})};
 if(['RECONCILIATION_REQUIRED','RECOVERED_COMPLETED','CONTINUE_FROM_CURRENT_STATE','RETRY_SAFE','USER_ACCEPTED_CURRENT_STATE'].includes(run.recovery))technical.recovery=run.recovery;
 if(run.recovery==='USER_ACCEPTED_CURRENT_STATE'){technical.resolutionSource='USER';technical.originalOutcome='UNVERIFIED';}
 if(['UNCHANGED','CHANGED','UNVERIFIED'].includes(run.integrity?.state))technical.integrity=run.integrity.state;
 const counts=run.recoveryEvidence?.counts;
 if(counts)technical.receiptState=['UNKNOWN','IN_PROGRESS','FAILED_AFTER_PARTIAL_WRITE','COMMITTED','FAILED_PRECONDITION','FAILED_BEFORE_WRITE'].find(k=>Number.isSafeInteger(counts[k])&&counts[k]>0)??'UNVERIFIED';
 run.agentActivity={version:activityVersion,runId:/^[\w-]{8,80}$/.test(run.id??'')?run.id:null,sequence,semanticKey:key,...copy,messageId,active:active&&!terminal,attention,terminal,observation,startedAt:same?previous.startedAt:now,updatedAt:now,technical};
 run.activityHistory??=[];
 if(same&&run.activityHistory.length)run.activityHistory[run.activityHistory.length-1]=run.agentActivity;
 else{run.activityHistory.push(run.agentActivity);if(run.activityHistory.length>10)run.activityHistory.shift();}
}
function modeMessage(mode){return {QA:'qaStart',BROWSER:'previewStart',BROWSER_TEST:'testStart',STATUS:'statusStart'}[mode];}
function event(run,group,status){
 if(status==='pending')return; // Queued is not executing.
 if(!['running','completed','error'].includes(status))return;
 const active=status==='running',s=state(run);
 if(group==='OTHER'&&s.known)return;
 if(status==='error'){emit(run,'stepError',{attention:true});return;}
 if(group==='RECOVERY'){emit(run,run.responseLost||run.checking?'recoveryStart':active?'receiptStart':'receiptDone',{group,active,observation:active?'started':'completed'});return;}
 if(group!=='OTHER')s.known=true;
 const fixed=modeMessage(run.mode);
 const key=fixed??({READ_DESIGN:s.wrote?active?'checkStart':'checkDone':active?'readStart':'readDone',WRITE_DESIGN:active?'writeStart':'writeDone',COMPONENTS:active?'componentsStart':'componentsDone',PROTOTYPE:active?'prototypeStart':'prototypeDone',EXPORT:active?'exportStart':'exportDone',QA:'qaStart',BROWSER:active?'testStart':'testDone',OTHER:'planning'})[group]??'planning';
 if(['WRITE_DESIGN','COMPONENTS','PROTOTYPE'].includes(group))s.wrote=true;
 emit(run,key,{group,active,observation:active?'started':'completed'});
}
// Observational only: no engine calls, retries, state transitions or payload parsing.
export function observeActivityContext(run,context){
 if(!Array.isArray(context)||run.state!=='RUNNING')return;
 const s=state(run);
 if(context.length<s.index){s.index=context.length;s.pending.clear();return;}
 const indexes=new Set(s.pending);for(let i=s.index;i<context.length;i++)indexes.add(i);
 if(context.length)indexes.add(context.length-1);
 const active=[];
 for(const i of [...indexes].sort((a,b)=>a-b)){
  const m=context[i];if(m?.type!=='assistant')continue;
  let pending=i===context.length-1&&!m.finish,recognized=false;
  for(let j=0;j<(m.content?.length??0);j++){
   // OpenCode 2.0.28 can retain executed=false on completed/running native tool records.
   const t=m.content[j];if(t?.type!=='tool')continue;
   const trace=t.name==='execute'&&Array.isArray(t.state?.metadata?.toolCalls)?t.state.metadata.toolCalls.slice(0,64):null;
   const tools=trace?.length?trace.map(x=>({name:x?.tool,status:x?.status})):[{name:t.name,status:t.state?.status}];
   if(!['completed','error'].includes(t.state?.status))pending=true;
   for(let k=0;k<tools.length;k++){
    const tool=tools[k],group=classifyActivityTool(tool.name),key=(typeof t.id==='string'?t.id:i+':'+j)+':'+k,stamp=group+':'+tool.status;
    recognized||=group!=='OTHER';
    if(tool.status==='running')active.push({group,status:tool.status});
    if(s.seen.get(key)===stamp)continue;
    s.seen.set(key,stamp);if(s.seen.size>512)s.seen.delete(s.seen.keys().next().value);
    event(run,group,tool.status);
   }
  }
  if(pending){s.pending.add(i);if(s.pending.size>64)s.pending.delete(s.pending.values().next().value);}else s.pending.delete(i);
  if(i>=s.index&&!recognized&&!m.finish&&!s.known)emit(run,modeMessage(run.mode)??'planning',{active:true});
 }
 s.index=context.length;
 // An unrelated completion must not hide a different tool which is still running.
 if(active.length){const last=active.at(-1);if(!run.agentActivity?.active||run.agentActivity.technical.category!==last.group)event(run,last.group,last.status);}
}
export function observeActivityRun(run,{recovering=false,restored=false}={}){
 const options={terminal:run.state!=='RUNNING',restored};
 if(run.recovery==='USER_ACCEPTED_CURRENT_STATE'){if(!run.agentActivity)emit(run,'unknown',{...options,attention:true,group:'RECOVERY'});emit(run,'accepted',{...options,group:'RECOVERY',observation:'completed'});return;}
 if(run.integrity?.state==='CHANGED'){emit(run,'integrity',{...options,attention:true});return;}
 if(run.artifactIntegrity?.status==='CHANGED'||run.artifactIntegrity?.blockedWriteAttempts>0||run.error?.code==='BROWSER_TEST_ARTIFACT_WRITE_BLOCKED'||run.error?.code==='BROWSER_TEST_ARTIFACT_INTEGRITY_VIOLATION'){emit(run,'blockedMutation',{...options,attention:true});return;}
 if(recovering||run.checking){emit(run,'recoveryStart',{group:'RECOVERY',active:true});return;}
 if(run.recovery==='RECOVERED_COMPLETED'){emit(run,'recovered',options);return;}
 if(run.recoveryEvidence?.counts?.FAILED_AFTER_PARTIAL_WRITE){emit(run,'partial',{...options,attention:true,group:'RECOVERY'});return;}
 if(run.recovery==='CONTINUE_FROM_CURRENT_STATE'){emit(run,run.recoveryEvidence?.complete&&run.recoveryEvidence.counts.COMMITTED?'committed':'partial',{...options,attention:true,group:'RECOVERY'});return;}
 if(run.state==='FAILED'&&run.recovery==='RECONCILIATION_REQUIRED'){emit(run,'unknown',{...options,attention:true,group:'RECOVERY'});return;}
 const errors={PROVIDER_AUTH_REQUIRED:'providerAuth',PROVIDER_REQUIRED:'providerAuth',MODEL_UNAVAILABLE:'modelUnavailable',MODEL_REQUIRED:'modelRequired',PROVIDER_RATE_LIMITED:'rateLimit',PROVIDER_UNAVAILABLE:'providerUnavailable',PROVIDER_UNAVAILABLE_SAFE:'providerUnavailable',PROVIDER_UNAVAILABLE_UNCERTAIN:'providerUnavailable',PLUGIN_NOT_CONNECTED:'figmaDisconnected',MCP_UNAVAILABLE:'figmaDisconnected',FIGMA_DISCONNECTED:'figmaDisconnected'};
 if(errors[run.error?.code]){emit(run,errors[run.error.code],{...options,attention:true});return;}
 if(run.state==='FAILED'){
  emit(run,run.recovery==='RETRY_SAFE'?'prewrite':run.recovery==='RECONCILIATION_REQUIRED'?'unknown':'failed',{...options,attention:true,group:'RECOVERY'});return;
 }
 if(run.state==='CANCELLED'){emit(run,'cancelled',options);return;}
 if(run.state==='WAITING_FOR_USER'){emit(run,'waiting',{...options,attention:true});return;}
 if(run.state==='COMPLETED'){
  const markers=[...(run.result??'').matchAll(/^FIGMA_[A-Z0-9_]+:\s*(PASS|WARN|FAIL|HOLD|BLOCKED)\s*$/gm)].map(m=>m[1]);
  const limited=markers.some(m=>['HOLD','BLOCKED'].includes(m)),findings=['WARN','FAIL'].includes(run.validation?.status)||markers.some(m=>['WARN','FAIL'].includes(m));
  emit(run,restored?'restored':limited?'limited':findings?'findings':({QA:'qaDone',BROWSER:'previewDone',BROWSER_TEST:'testDone',STATUS:'statusDone'})[run.mode]??'completed',{...options,attention:limited||findings});return;
 }
 if(run.state==='RUNNING'&&run.mode==='BROWSER_TEST'){emit(run,'testStart',{active:true,group:'BROWSER'});return;}
 if(!run.agentActivity)emit(run,'submitted',{active:false});
}

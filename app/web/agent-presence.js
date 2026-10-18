import {activityView,connectionMessage,phaseLabels} from './agent-activity.mjs';
let rendered='';
const $=id=>document.getElementById(id);
const put=(id,value)=>{if($(id).textContent!==value)$(id).textContent=value;};
export function renderAgentPresence(runs,status={}){
 const run=runs.filter(r=>status.workspaceId?r.workspaceId===status.workspaceId:!status.sessionId||r.sessionId===status.sessionId).at(-1);
 const override=status.reconciliationRequired&&!status.activeRun?'unknown':connectionMessage(status);
 const view=activityView(override?{messageId:override,attention:true}:run?.agentActivity);
 const phases=new Map();
 for(const entry of (run?.activityHistory??[]).slice(-10)){
  const view=activityView(entry),key=entry.technical?.category==='RECOVERY'?'RECOVERY':view.phase;
  phases.delete(key);phases.set(key,{...view,observation:entry.observation,historyLabel:key==='RECOVERY'?'Checking previous change':null});
 }
 const history=[...phases.values()];
 const technical=run?.agentActivity?.technical??{};
 const safeDetails={phase:view.phase,animation:view.animation};
 for(const [key,allowed]of Object.entries({workflow:['AUTO','DESIGN','QA','BROWSER','BROWSER_TEST','STATUS'],runState:['RUNNING','COMPLETED','FAILED','CANCELLED','WAITING_FOR_USER'],category:['READ_DESIGN','WRITE_DESIGN','COMPONENTS','PROTOTYPE','EXPORT','QA','BROWSER','RECOVERY','OTHER'],recovery:['RECONCILIATION_REQUIRED','RECOVERED_COMPLETED','CONTINUE_FROM_CURRENT_STATE','RETRY_SAFE'],receiptState:['UNKNOWN','IN_PROGRESS','FAILED_AFTER_PARTIAL_WRITE','COMMITTED','FAILED_PRECONDITION','FAILED_BEFORE_WRITE','UNVERIFIED'],integrity:['UNCHANGED','CHANGED','UNVERIFIED']}))if(allowed.includes(technical[key]))safeDetails[key]=technical[key];
 const signature=JSON.stringify([view,history,safeDetails]);if(signature===rendered)return;rendered=signature;
 $('agent-studio').dataset.phase=view.phase;$('agent-scene').dataset.animation=view.animation;$('agent-scene').dataset.active=String(view.active);
 const character={IDLE:'idle',LISTEN:'listening',READ:'checking',THINK:'planning',TYPE:'designing',CONNECT:'prototyping',CHECK:'checking',PREVIEW:'listening',TALK:'waiting',WAIT:'waiting',RECOVER:'recovering',DONE:'done',ALERT:'alert'}[view.animation];
 const monitor={IDLE:'ready',LISTENING:'ready',INSPECTING:'inspecting',PLANNING:'planning',DESIGNING:'designing',PROTOTYPING:'prototyping',CHECKING:'checking',PREVIEWING:'previewing',WAITING:'ready',RECOVERING:'recovering',COMPLETED:view.attention?'attention':'done',CANCELLED:'ready',BLOCKED:'attention'}[view.phase];
 $('studio-character').src='/assets/agent-studio/character/'+character+'.png';$('studio-monitor').src='/assets/agent-studio/monitor/'+monitor+'.png';
 put('agent-phase',phaseLabels[view.phase]);put('agent-message',view.message);put('agent-detail',view.detail);$('agent-detail').hidden=!view.detail||!!override||technical.category==='RECOVERY';
 const list=$('agent-history');list.replaceChildren();
 for(const [index,entry]of history.entries()){const item=document.createElement('li'),mark=document.createElement('span'),label=document.createElement('span');mark.setAttribute('aria-hidden','true');mark.textContent=entry.attention?'!':entry.observation==='completed'||entry.terminal?'✓':entry.active&&index===history.length-1?'●':'·';label.textContent=entry.historyLabel??(entry.observation!=='completed'?({INSPECTING:'Design review',PLANNING:'Preparing next step',DESIGNING:'Interface updates',PROTOTYPING:'Interaction wiring',CHECKING:'Result check',PREVIEWING:'Preview preparation'})[entry.phase]:null)??({IDLE:'Ready',LISTENING:'Request received',INSPECTING:'Checked your design',PLANNING:'Prepared the next step',DESIGNING:'Built the interface',PROTOTYPING:'Connected interactions',CHECKING:'Checked the result',PREVIEWING:'Prepared preview',WAITING:'Awaiting your reply',RECOVERING:'Checking previous change',COMPLETED:'Finished',CANCELLED:'Task stopped',BLOCKED:'Needs attention'})[entry.phase];item.append(mark,label);list.append(item);}
 $('agent-history-empty').hidden=!!history.length;
 put('agent-technical',Object.entries(safeDetails).map(([key,value])=>key+': '+value).join('\n'));
}

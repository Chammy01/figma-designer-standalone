const $=id=>document.getElementById(id);
let active=null,history=[],status={},polling=false,rendered='';
async function api(path,body){const r=await fetch(path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const value=await r.json();if(!r.ok)throw Error(value.error?.message??'The local application is unavailable. Check the connection and try again.');return value;}
function showError(error){$('error').textContent=error.message;$('error').dataset.kind=error.network?'network':'request';$('error').hidden=false;}
function route(){const name=location.hash.slice(1)||'workspace';for(const el of document.querySelectorAll('.view'))el.hidden=el.id!==name;for(const a of document.querySelectorAll('nav a,.settings')){if(a.hash==='#'+name)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}if(name==='browser')refreshBrowser().catch(showError);}
function text(tag,content){const el=document.createElement(tag);el.textContent=content;return el;}
function update(id,content){if($(id).textContent!==content)$(id).textContent=content;}
function renderRuns(){
  const signature=JSON.stringify([status.sessionId,history]);
  if(signature!==rendered){
  rendered=signature;
  const conversation=$('conversation'),previousTop=conversation.scrollTop,atEnd=conversation.scrollHeight-previousTop-conversation.clientHeight<40;
  $('conversation').replaceChildren();$('recent-runs').replaceChildren();
  for(const run of history){const message=document.createElement('article');message.className='message';message.dataset.runId=run.id;message.dataset.state=run.state;message.append(text('h3','You'),text('pre',run.input||run.mode));if(run.result)message.append(text('h3','Figma Designer'),text('pre',run.result));if(run.error)message.append(text('p',run.error.title+': '+run.error.message));if(!status.sessionId||!run.sessionId||run.sessionId===status.sessionId)$('conversation').append(message);const card=document.createElement('article');card.append(text('strong',run.mode+' · '+run.state.replaceAll('_',' ')),text('p',run.input.slice(0,160)||'System workflow'));$('recent-runs').append(card);if(run.mode==='QA'&&run.result)$('qa-result').textContent=run.result;}
  active=history.find(r=>r.state==='RUNNING')??null;
  conversation.scrollTop=atEnd?conversation.scrollHeight:previousTop;
  document.querySelector('.intro').hidden=!!conversation.children.length;
  }
  update('run-state',active?'Working…':history.filter(r=>r.sessionId===status.sessionId).at(-1)?.state==='WAITING_FOR_USER'?'Ready for your reply.':'');
  $('send').disabled=!!active||!['READY','EXTERNAL'].includes(status.engine?.state)||status.figma!=='CONNECTED'||status.runtime!=='VERIFIED'||status.reconciliationRequired;
  $('cancel').hidden=!active;for(const b of document.querySelectorAll('[data-mode],#new-design'))b.disabled=!!active;
}
async function refreshStatus(force=false){
  status=await api('/api/app/status'+(force?'?refresh=1':''));
  const engineReady=['READY','EXTERNAL'].includes(status.engine.state);
  const labels=[['Figma',status.figma==='CONNECTED'?'Connected':'Not connected'],['Engine',status.engine.availability==='PROVIDER_REQUIRED'?'Provider needed':engineReady?'Ready':status.engine.state],['Runtime',status.runtime==='VERIFIED'?'Verified':status.runtime]];
  if($('statuses').textContent!==labels.map(([name,value])=>name+' · '+value).join(''))$('statuses').replaceChildren(...labels.map(([name,value])=>{const el=text('span',name+' · '+value);el.className='status';return el;}));
  let title='Your workspace is connected',copy='Describe your next design or continue the conversation below.';
  if(status.runtime!=='VERIFIED'){title='Runtime verification needs attention';copy='Run source setup or restore the approved runtime before starting design work.';}
  else if(!engineReady){title=status.engine.state==='STARTING'?'Starting your design engine':'The design engine needs attention';copy='Check your local OpenCode installation. Developer diagnostics has the safe status.';}
  else if(status.figma!=='CONNECTED'){title=status.figma==='PLUGIN_NOT_CONNECTED'?'Figma plugin not connected':'Figma connection needs attention';copy='Open your design file in Figma Desktop and run the imported Figma Designer development plugin. Then choose Check Again.';}
  else if(status.reconciliationRequired){title='Checking the previous operation';copy='The engine response was interrupted. Check Again to reconcile before starting another run.';}
  update('connection-title',title);update('connection-copy',copy);
  if(force||$('error').dataset.kind==='network')$('error').hidden=true;
  $('diagnostic-output').textContent=JSON.stringify({applicationVersion:'1.4.0-source',...status},null,2);renderRuns();
}
async function refreshRuns(){history=await api('/api/runs');renderRuns();}
async function refreshBrowser(){const value=await api('/api/browser/status');$('browser-status').textContent='Browser preview · '+value.state+' · Test '+(value.acceptance??'NOT_RUN');$('open-preview').disabled=value.state==='NOT_BUILT';const f=value.fidelity;$('fidelity').textContent=f.SOURCE_FIDELITY+(f.coverage?` · ${f.coverage.SCREENS_VALIDATED??0} screens · ${f.coverage.FONT_LIMITATIONS??0} font limitations`:'');}
async function submit(mode,input=''){
  $('error').hidden=true;
  try{const run=await api('/api/run',{mode,input,requestId:crypto.randomUUID()});history.push(run);location.hash='workspace';renderRuns();$('prompt').value='';}
  catch(error){showError(error);}
}
$('composer').addEventListener('submit',event=>{event.preventDefault();submit('AUTO',$('prompt').value);});
for(const b of document.querySelectorAll('[data-mode]'))b.addEventListener('click',()=>submit(b.dataset.mode));
$('check').addEventListener('click',()=>refreshStatus(true).catch(showError));
$('cancel').addEventListener('click',async()=>{try{const value=await api(`/api/run/${active.id}/cancel`,{});$('run-state').textContent=value.message;}catch(error){showError(error);}});
$('new-design').addEventListener('click',async()=>{try{await api('/api/session',{});location.hash='workspace';$('prompt').focus();}catch(error){showError(error);}});
$('prototype-compose').addEventListener('click',()=>{location.hash='workspace';$('prompt').focus();});
$('refresh-browser').addEventListener('click',()=>refreshBrowser().catch(showError));
$('open-preview').addEventListener('click',async()=>{const tab=window.open('about:blank','_blank');if(tab)tab.opener=null;try{const value=await api('/api/browser/preview');if(tab)tab.location=value.url;else throw Error('Allow the local preview window to open.');}catch(error){tab?.close();showError(error);}});
window.addEventListener('hashchange',route);route();
async function poll(){if(polling)return;polling=true;try{await refreshRuns();await refreshStatus();}catch(error){showError(Object.assign(Error('The local service is unavailable. Refresh after it reconnects.'),{network:true}));}finally{polling=false;}}
await poll();setInterval(poll,1500);

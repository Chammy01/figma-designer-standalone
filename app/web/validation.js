const $=id=>document.getElementById(id);
let current;
let rendered;
const titles={PROPERTY_strokeWidth:'Stroke width mismatch',PROPERTY_fill:'Fill color mismatch',PROPERTY_stroke:'Stroke color mismatch',PROPERTY_radius:'Corner radius mismatch',PROPERTY_opacity:'Opacity mismatch',PROPERTY_fontSize:'Text size mismatch',PROPERTY_lineHeight:'Line spacing mismatch',GEOMETRY_MAJOR_DRIFT:'Major geometry drift',GEOMETRY_MINOR_DRIFT:'Minor geometry drift',TEXT_CONTENT:'Text content differs',MISSING_OR_AMBIGUOUS_NODE:'Missing or ambiguous node',FONT_FIDELITY_LIMITATION:'Font fidelity limitation',COMPLEX_PAINT_LIMITATION:'Complex property limitation',GEOMETRY_UNVERIFIED:'Geometry not verified'};
const el=(tag,value,className)=>{const n=document.createElement(tag);if(value!==undefined&&value!==null)n.textContent=String(value);if(className)n.className=className;return n;};
const display=v=>v===undefined||v===null?'Not measured':String(v).replaceAll('_',' ');
function outcome(value){const n=el('span',display(value),'outcome');n.dataset.outcome=value;return n;}
function line(label,value){const n=el('div',null,'evidence-row');n.append(el('span',label),outcome(value));return n;}
function metrics(values){const dl=el('dl',null,'metrics');for(const [name,value]of values)dl.append(el('dt',name),el('dd',display(value)));return dl;}
function details(title,values){const d=el('details');d.append(el('summary',title));for(const [label,value]of values)if(value!==undefined&&value!==null){d.append(el('h4',label),el('pre',typeof value==='object'?JSON.stringify(value,null,2):value));}return d;}
function stamp(value){return value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString():'Unavailable';}
function nodeName(node){return node?.name||'Affected node';}
function finding(f,kind){
  const a=el('article',null,'finding'),heading=el('div',null,'finding-heading');heading.append(el('h3',kind==='qa'?f.problem:titles[f.code]??display(f.code)),outcome(f.severity));a.append(heading);
  if(kind==='qa'){a.append(el('p',display(f.classification),'muted'));if(f.impact&&f.classification==='BROKEN')a.append(el('p',f.impact));const names=f.nodes?.filter(n=>n.name).map(n=>n.name);if(names?.length)a.append(el('p','Affected: '+names.join(', ')));}
  else {const unit=['PROPERTY_strokeWidth','PROPERTY_radius','PROPERTY_fontSize','PROPERTY_lineHeight'].includes(f.code)?' px':'';a.append(el('p',nodeName(f.node)+(f.screen?.name?' · '+f.screen.name:'')));a.append(el('p','Source: '+display(f.expected)+unit+' · Browser: '+display(f.actual)+unit));}
  a.append(details('Details',kind==='qa'?[['Finding',f.id+' · '+f.code],['Evidence',f.grade],['Impact',f.impact],['Expected',f.expected],['Actual',f.actual],['Recommended workflow',f.workflow],['Node references',f.nodes]]:[['Finding',f.id+' · '+f.code],['Source',f.expected],['Browser',f.actual],['Node ID',f.node?.id],['Screen ID',f.screen?.id]]));return a;
}
function renderQA(){
  const q=current.qa,box=$('qa-result');box.replaceChildren(line('Interaction QA',q.status),line('Evidence freshness',q.freshness),el('p','Last completed check: '+stamp(q.generatedAt),'muted'));
  if(q.reason)box.append(el('p',q.reason));if(q.freshness!=='CURRENT'&&q.lastStatus)box.append(el('p','Historical reported result: '+q.lastStatus,'muted'));
  if(Object.keys(q.counts??{}).length)box.append(metrics([['Working actions',q.counts.workingActions],['Working states',q.counts.workingStates],['Broken controls',q.counts.brokenControls],['Broken edges',q.counts.brokenEdges],['Unknown expectations',q.counts.unknown],['Limited controls',q.counts.limitedControls],['Limitation findings',q.counts.limitations],['Unreachable from evidenced starts',q.counts.unreachable]]));
  if(q.status==='PASS'&&q.freshness==='CURRENT')box.append(el('p','No broken controls or prototype edges were found in the inspected scope. Structural checks do not prove native playback.'));
  const integrity=$('qa-integrity');integrity.replaceChildren(el('h3','Document integrity'),line('Read-only evidence',q.integrity.status));if(q.integrity.status==='FAILED')integrity.append(el('p','The QA integrity check failed. This result is not trusted.'));
  integrity.append(details('Integrity details',[['Before fingerprints',q.integrity.before],['After fingerprints',q.integrity.after],['Collector reads',q.integrity.readCalls],['Collector writes',q.integrity.writeCalls],['Scope',q.evidenceMode]]));
  const filter=$('qa-filter').value,rows=q.findings.filter(f=>filter==='ALL'||filter==='BROKEN'&&f.classification==='BROKEN'||filter==='UNKNOWN'&&f.classification==='UNKNOWN_EXPECTATION'||filter==='LIMITATIONS'&&f.classification==='FIGMA_LIMITED'||f.severity===filter);
  $('qa-findings').replaceChildren(...rows.map(f=>finding(f,'qa')));if(!rows.length)$('qa-findings').append(el('p',q.freshness==='UNAVAILABLE'?'Run QA to collect structured evidence.':'No findings in this filter.','muted'));
  $('qa-raw').replaceChildren(el('summary','Raw Evidence — normalized'),el('pre',JSON.stringify(q,null,2)));
}
function shown(value,freshness){return value==='UNVERIFIED'||value==='NOT_RUN'?value:freshness==='CURRENT'?value:freshness==='UNAVAILABLE'?'NOT_RUN':freshness;}
function renderBrowser(){
  const {browser:b,motion:m,fidelity:f}=current;
  const preview=$('browser-status');preview.replaceChildren(line('Browser Preview',b.buildState==='NOT_BUILT'?'NOT_BUILT':b.freshness),el('p','Reported generated time: '+stamp(b.generatedAt),'muted'),line('Source freshness',b.sourceFreshness));
  if(b.freshness==='STALE')preview.append(el('p',b.sourceFreshness==='STALE'?'Your Figma source changed after this preview was created. Rebuild when you are ready.':'Preview files or validation bindings changed. Rebuild or run Browser Test as appropriate.'));
  if(b.freshness==='UNVERIFIED')preview.append(el('p','Current source evidence is unavailable or incompatible. This preview is not certified current.'));
  $('open-preview').disabled=b.buildState!=='BUILT';
  const tests=$('browser-tests');tests.replaceChildren(line('Browser Test',b.acceptance),line('Test evidence freshness',b.testFreshness),line('Local artifact freshness',b.localFreshness),el('p','Last tested: '+stamp(b.testedAt),'muted'));
  if(b.testFreshness!=='CURRENT'&&b.lastAcceptance)tests.append(el('p','Historical reported result: '+b.lastAcceptance,'muted'));
  for(const t of b.checks)tests.append(details(t.name+' — '+display(t.status),[['Reported detail',t.detail]]));
  if(!b.checks.length)tests.append(el('p','Browser Test NOT_RUN — no compatible checks are available.','muted'));
  const motion=$('browser-motion');motion.replaceChildren(line('Motion',m.status),line('Motion evidence freshness',m.freshness));if(m.rows.length&&m.freshness!=='CURRENT')motion.append(el('p','Historical motion checks — rerun against current evidence.','muted'));if(!m.contractVersion)motion.append(el('p','This preview does not include the current motion evidence contract. Motion is not verified.'));for(const r of m.rows)motion.append(line(display(r.token)+' · '+r.mode+' · '+display(r.parity),r.status));
  const fidelity=$('fidelity');fidelity.replaceChildren(line('Source Fidelity',shown(f.sourceFidelity,f.freshness)),line('Fidelity evidence freshness',f.freshness),metrics([['Screens checked',f.coverage.SCREENS_VALIDATED],['Nodes compared',f.coverage.NODES_COMPARED],['Text nodes',f.coverage.TEXT_NODES_COMPARED],['Controls',f.coverage.CONTROLS_COMPARED],['Font limitations',f.coverage.FONT_LIMITATIONS],['Unsupported properties',f.coverage.UNSUPPORTED_PROPERTIES]]));
  if(f.freshness!=='CURRENT'&&f.sourceFidelity!=='UNVERIFIED')fidelity.append(el('p','Historical source-fidelity result: '+f.sourceFidelity,'muted'));
  const regression=$('browser-regression');regression.replaceChildren(line('Browser Visual Regression',shown(f.browserVisualRegression,f.freshness)),line('Live design golden','UNVERIFIED'),el('p','Committed synthetic fixtures do not provide a golden baseline for your live design.'));
  const native=$('native-parity');native.replaceChildren(line('Native Render Parity',shown(f.nativeRenderParity,f.freshness)),line('Figma Pixel Parity',shown(f.figmaPixelParity,f.freshness)),el('p','Native references and paired capture counts: Not measured. Exact pixel parity is not certified.'));
  renderFidelityFindings();
  const groups=new Map();for(const row of f.fonts){const key=JSON.stringify([row.source,row.browser,row.status]);groups.set(key,{...row,count:(groups.get(key)?.count??0)+1});}
  const fonts=$('font-limitations');fonts.replaceChildren(el('h3','Font availability'));for(const row of groups.values())fonts.append(el('p',`${row.count} text node${row.count===1?'':'s'} · ${row.source??'Source unavailable'} → ${row.browser.join(', ')||'Browser unavailable'} · ${display(row.status)}`));
  fonts.append(el('p',f.fonts.length?'Font differences may affect text metrics and wrapping. No fonts are downloaded or redistributed.':'Font evidence is unavailable.','muted'));
  const limits=$('property-limitations'),codes=new Map();for(const row of f.findings.filter(x=>x.severity==='LIMITATION'&&x.code!=='FONT_FIDELITY_LIMITATION'))codes.set(row.code,(codes.get(row.code)??0)+1);
  limits.replaceChildren(el('h3','Property limitations'));for(const [code,n]of codes)limits.append(el('p',display(code)+' · '+n+' recorded findings'));if(!codes.size)limits.append(el('p','No property limitations reported in the available evidence.','muted'));
  $('browser-raw').replaceChildren(el('summary','Raw Evidence — normalized'),el('pre',JSON.stringify({browser:b,motion:m,fidelity:f},null,2)));
}
function renderFidelityFindings(){const filter=$('fidelity-filter').value,rows=current.fidelity.findings.filter(f=>filter==='ALL'||filter==='DEFECTS'&&f.severity!=='LIMITATION'||filter==='FONTS'&&f.code==='FONT_FIDELITY_LIMITATION'||filter==='LIMITATIONS'&&f.severity==='LIMITATION');$('fidelity-findings').replaceChildren(...rows.map(f=>finding(f,'fidelity')));if(!rows.length)$('fidelity-findings').append(el('p','No findings in this filter. Unmeasured properties remain unverified.','muted'));}
export function renderValidation(value){
  $('validation-asof').textContent='Evidence checked: '+stamp(value.asOf);
  const signature=JSON.stringify({...value,asOf:null});if(signature===rendered)return;rendered=signature;
  current=value;renderQA();renderBrowser();
  const summary=$('validation-summary');summary.hidden=value.qa.freshness==='UNAVAILABLE'&&value.browser.buildState==='NOT_BUILT';
  $('validation-summary-status').replaceChildren(line('QA',value.qa.status),line('Preview',value.browser.buildState==='NOT_BUILT'?'NOT_BUILT':value.browser.freshness),line('Browser Test',value.browser.acceptance),line('Source Fidelity',shown(value.fidelity.sourceFidelity,value.fidelity.freshness)));
}
export function renderValidationHistory(runs){const list=$('validation-history');list.replaceChildren();for(const run of runs.filter(r=>['QA','BROWSER','BROWSER_TEST'].includes(r.mode)).slice(-10).reverse()){const row=el('p');row.textContent=stamp(run.startedAt)+' · '+run.mode.replaceAll('_',' ')+' · '+(run.validation?.status??run.state)+' (historical task)';list.append(row);}if(!list.children.length)list.append(el('p','No validation tasks in this app session yet.','muted'));}
$('qa-filter').addEventListener('change',()=>{if(current)renderQA();});$('fidelity-filter').addEventListener('change',()=>{if(current)renderFidelityFindings();});

import tools from "./reliability-tools.json";
import {fields,textFields} from "./browser-source";
import {canonical, sha256} from "./canonical";
import {errorSequence} from "./diagnostics";

export const protocolVersion = 2;
export const productVersion = "1.1.0";
const writes = new Set(tools);
const key = "figma-designer-mcp-receipts-v2";
const maxReceipts = 500, maxAge = 7 * 86400000, maxBytes = 4 * 1024 * 1024;
const idPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{15,79}$/;
const checks = new Set(["expectedNodeType", "expectedParentId", "expectedName", "expectedComponentId", "expectedComponentSetId", "expectedReactionCount", "expectedChildrenCount", "expectedVisible"]);
const states = new Set(["IN_PROGRESS", "COMMITTED", "FAILED_PRECONDITION", "FAILED_BEFORE_WRITE", "FAILED_AFTER_PARTIAL_WRITE", "FAILED"]);
const fail = (code: string) => { throw Error(code); };
const json = (v: any): any => typeof v === "symbol" ? {mixed:true} : JSON.parse(JSON.stringify(v));
const resultKeys = new Set(["id","nodeId","componentId","componentSetId","instanceId","frameId","pageId","collectionId","variableId","deleted","applied","failed","count","totalNodes","totalSlides","width","height","x","y","success"]);
function summary(data: any, depth = 0, budget = {objects:32,fields:32}): any {
  if (!data || typeof data !== "object" || depth > 3 || budget.objects-- <= 0) return {};
  const out: any = {};
  for (const [k,v] of Object.entries(data)) {
    if (budget.fields > 0 && resultKeys.has(k) && ((typeof v === "string" && /^[A-Za-z0-9:;,_-]{1,128}$/.test(v)) || typeof v === "boolean" || typeof v === "number")) {out[k] = v;budget.fields--;}
    else if (budget.objects>0 && ["results","created","slides","children","bounds"].includes(k) && v && typeof v === "object") out[k] = Array.isArray(v) ? v.slice(0,32).map(x=>summary(x,depth+1,budget)) : summary(v,depth+1,budget);
  }
  return out;
}
function hasFailure(v: any): boolean {
  if (!v || typeof v !== "object") return false;
  if (v.error || v.success === false || typeof v.failed === "number" && v.failed > 0 || Array.isArray(v.errors) && v.errors.length > 0) return true;
  return Object.values(v).some(hasFailure);
}
function validateId(id: any) { if (typeof id !== "string" || !idPattern.test(id)) fail("INVALID_OPERATION_ID"); }

// One serialized mutation queue per plugin. A disconnected UI never re-dispatches.
// clientStorage persists receipts before response delivery, not Figma documents.
export function createReliability(api: any) {
  const sessionId = "session-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  const documentId = () => api.fileKey || sessionId;
  let queue: Promise<any> = Promise.resolve(), corrupt = false, loaded = false;
  let loading: Promise<void>|undefined;
  const active = new Set<string>();
  let receipts: any[] = [];
  async function load() {
    if (loaded) {await loading;return;}
    loaded = true;
    loading=(async()=>{
    try {
      const stored = await api.clientStorage.getAsync(key);
      if (stored !== undefined) {
        if (stored?.version !== 2 || !Array.isArray(stored.receipts) || canonical(stored).length > maxBytes || stored.receipts.length > maxReceipts) fail("RECEIPT_STORAGE_CORRUPT");
        for (const r of stored.receipts) {
          validateId(r.operationId);
          if (!states.has(r.state) || typeof r.fingerprint !== "string" || !/^[a-f0-9]{64}$/.test(r.fingerprint) || !Number.isFinite(Date.parse(r.startedAt)) || !writes.has(r.tool) || typeof r.documentId !== "string") fail("RECEIPT_STORAGE_CORRUPT");
          if(!/^[A-Za-z0-9_-]{1,128}$/.test(r.documentId)||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(r.startedAt)||!/^I?\d+:\d+(;\d+:\d+)*$/.test(r.pageId))fail("RECEIPT_STORAGE_CORRUPT");
          for(const field of ["revisionBefore","revisionAfter"])if(r[field]!==undefined&&!/^[a-f0-9]{64}$/.test(r[field]))fail("RECEIPT_STORAGE_CORRUPT");
          if(r.errorCode!==undefined&&!/^[A-Z_]{1,64}$/.test(r.errorCode))fail("RECEIPT_STORAGE_CORRUPT");
          // Whitelist persisted fields on rehydration; never return arbitrary storage.
          const allowed = ["operationId","tool","fingerprint","state","startedAt","completedAt","documentId","pageId","revisionBefore","revisionAfter","createdNodeIds","affectedNodeIds","warnings","resultSummary","errorCode"];
          if (Object.keys(r).some(k=>!allowed.includes(k)) || canonical(r).length > 16384) fail("RECEIPT_STORAGE_CORRUPT");
          if(canonical(summary(r.resultSummary))!==canonical(r.resultSummary)||!Array.isArray(r.warnings)||r.warnings.some((s:any)=>!["No rollback; dispatched failure may have partial writes. Inspect before continuing.","Pre-write revision unavailable","Post-write revision unavailable","Post-write page scope changed; created-node closure unavailable"].includes(s)))fail("RECEIPT_STORAGE_CORRUPT");
          for(const field of ["createdNodeIds","affectedNodeIds"])if(r[field]!==undefined&&(!Array.isArray(r[field])||r[field].length>128||r[field].some((s:any)=>typeof s!=="string"||!/^I?\d+:\d+(;\d+:\d+)*$/.test(s))))fail("RECEIPT_STORAGE_CORRUPT");
        }
        if (new Set(stored.receipts.map((r:any)=>r.operationId)).size !== stored.receipts.length) fail("RECEIPT_STORAGE_CORRUPT");
        receipts = stored.receipts;
      }
    } catch { corrupt = true; }
    })();
    await loading;
  }
  function prune() { receipts = receipts.filter(r => Date.now()-Date.parse(r.startedAt) < maxAge); }
  async function save() {
    prune();
    const journal = {version:2,receipts};
    if(receipts.some(r=>canonical(r).length>16384))fail("RECEIPT_STORAGE_FULL");
    while(canonical(journal).length>maxBytes){
      const index=receipts.findIndex(r=>r.state!=="IN_PROGRESS"&&!active.has(r.operationId));
      if(index<0)fail("RECEIPT_STORAGE_FULL");
      receipts.splice(index,1);
    }
    // Single clientStorage value replacement; no multi-file journal transaction.
    await api.clientStorage.setAsync(key, journal);
  }
  async function lookup(id: any) {
    validateId(id); await load();
    if (corrupt) fail("RECEIPT_STORAGE_CORRUPT");
    prune();
    const r = receipts.find(r=>r.operationId===id);
    if (!r) return {operationId:id,state:"UNKNOWN",reason:"RECEIPT_UNKNOWN; absent or outside bounded retention. Never infer safe retry."};
    const {fingerprint,...visible} = r;
    if(active.has(id))visible.state="IN_PROGRESS";
    return json(visible);
  }
  async function revision() {
    if (!api.currentPage || api.currentPage.removed) fail("DOCUMENT_UNAVAILABLE");
    const page = api.currentPage;
    const ids: string[] = [];
    async function walk(n: any): Promise<any> {
      ids.push(n.id);
      const out: any = {id:n.id,type:n.type,name:n.name,parentId:n.parent?.id ?? null};
      for (const field of [...fields,"x","y","width","height","locked","reactions","backgrounds","flowStartingPoints","guides","layoutGrids","fillStyleId","strokeStyleId","effectStyleId","gridStyleId","textStyleId"]) {
        if (!(field in n)) continue;
        // Match source collection: do not compute glyph outlines on every text node.
        if (field === "fillGeometry" && !["VECTOR","BOOLEAN_OPERATION"].includes(n.type)) continue;
        if (field === "componentPropertyDefinitions" && n.type === "COMPONENT" && n.parent?.type === "COMPONENT_SET") continue;
        const v=n[field]; if (v !== undefined) out[field]=json(v);
      }
      if(n.type==="TEXT"){
        if(typeof n.getStyledTextSegments!=="function")fail("PRECONDITION_UNVERIFIED: text runs unavailable");
        out.textRuns=json(n.getStyledTextSegments(textFields));
      }
      if (n.type === "INSTANCE") { const c = await n.getMainComponentAsync(); out.componentId=c?.id??null; out.componentSetId=c?.parent?.type==="COMPONENT_SET"?c.parent.id:null; }
      if (n.children) { out.children=[]; for(const c of n.children) out.children.push(await walk(c)); }
      return out;
    }
    const tree = await walk(page);
    const resources: any = {variables:[],collections:[],styles:[]};
    if(api.variables) {
      // Await before iterating: Figma's compiler rejects for-of with a yielded iterable.
      const variables = await api.variables.getLocalVariablesAsync();
      for(const v of variables) resources.variables.push({id:v.id,name:v.name,type:v.resolvedType,collectionId:v.variableCollectionId,valuesByMode:json(v.valuesByMode)});
      const collections = await api.variables.getLocalVariableCollectionsAsync();
      for(const c of collections) resources.collections.push({id:c.id,name:c.name,modes:json(c.modes),defaultModeId:c.defaultModeId});
    }
    for(const method of ["getLocalPaintStylesAsync","getLocalTextStylesAsync","getLocalEffectStylesAsync","getLocalGridStylesAsync"]) {
      if(!api[method])continue;
      const styles = await api[method]();
      for(const s of styles) {
        const out:any={id:s.id,name:s.name};
        for(const f of ["paints","effects","layoutGrids",...fields])if(s[f]!==undefined)out[f]=json(s[f]);
        resources.styles.push(out);
      }
    }
    for(const list of Object.values(resources) as any[])list.sort((a:any,b:any)=>a.id<b.id?-1:a.id>b.id?1:0);
    if (api.currentPage !== page) fail("PRECONDITION_UNVERIFIED: page changed while reading");
    return {documentId:documentId(),pageId:page.id,revision:sha256(canonical({documentId:documentId(),tree,resources})),scope:"current-page",resourceScope:"all-local-styles-and-variables",algorithm:"canonical-json-sha256-v1",generatedAt:new Date().toISOString(),ids};
  }
  async function handshake() {
    await load();
    return {product:"Figma Designer MCP",version:productVersion,protocolVersion,pluginId:"figma-mcp-go",document:{id:documentId(),identity:api.fileKey?"file-key":"plugin-session",pageId:api.currentPage?.id??null,editorType:api.editorType??"figma",accessState:api.currentPage?"READABLE":"UNAVAILABLE"},capabilities:{receipts:!corrupt,preconditions:true,revisionTokens:true,writeTools:!corrupt,sourceCollector:true,combineAsVariants:true},receiptStorage:corrupt?"CORRUPT":"READY",receiptScope:"single-active-plugin; bounded retained journal; not exactly-once"};
  }
  async function conditions(request: any, before: any) {
    const p = request.params ?? {}, pre = p.preconditions ?? {};
    if (!pre || typeof pre !== "object" || Array.isArray(pre)) fail("PRECONDITION_UNVERIFIED");
    const expected = p.expectedRevision ?? pre.expectedRevision;
    if (p.expectedRevision && pre.expectedRevision && p.expectedRevision !== pre.expectedRevision) fail("PRECONDITION_UNVERIFIED");
    if (expected !== undefined && (typeof expected !== "string" || !/^[a-f0-9]{64}$/.test(expected))) fail("PRECONDITION_UNVERIFIED");
    if (expected !== undefined && !before?.revision) fail("PRECONDITION_UNVERIFIED");
    if (expected !== undefined && expected !== before.revision) fail("STALE_DOCUMENT_REVISION");
    if (Object.keys(pre).some(k=>!checks.has(k)&&k!=="expectedRevision")) fail("PRECONDITION_UNVERIFIED");
    const fields = Object.keys(pre).filter(k=>checks.has(k));
    if (!fields.length) return;
    const ids: string[] = [...(request.nodeIds??[])];
    for (const item of p.updates??[]) { const id=item.nodeId??item.instanceId; if (typeof id === "string") ids.push(id); }
    for (const id of [p.nodeId,p.instanceId]) if(typeof id === "string") ids.push(id);
    let targets: any[] = [];
    if (request.type === "instantiate_by_name") {
      // Preserve existing exact-then-substring resolution, verify the chosen source BEFORE creation.
      const all: any[]=[];
      function find(n:any) { if(n.type==="COMPONENT")all.push(n); for(const c of n.children??[]) find(c); }
      for(const page of api.root.children){await page.loadAsync();find(page);}
      const name=String(p.componentName??"").toLowerCase();
      const c=all.find(n=>n.name.toLowerCase()===name)??all.find(n=>n.name.toLowerCase().includes(name));
      if(c)targets=[c];
    } else {
      for(const id of [...new Set(ids)]) { const n=await api.getNodeByIdAsync(id); if(!n)fail("PRECONDITION_UNVERIFIED: target missing");targets.push(n); }
    }
    if(!targets.length) fail("PRECONDITION_UNVERIFIED: no inspectable target");
    for(const n of targets) for(const field of fields) {
      let actual: any;
      if(field==="expectedNodeType")actual=n.type;
      if(field==="expectedParentId")actual=n.parent?.id;
      if(field==="expectedName")actual=n.name;
      if(field==="expectedReactionCount")actual=n.reactions?.length;
      if(field==="expectedChildrenCount")actual=n.children?.length;
      if(field==="expectedVisible")actual=n.visible;
      if(field==="expectedComponentId"||field==="expectedComponentSetId") {
        const c=n.type==="INSTANCE"?await n.getMainComponentAsync():n.type==="COMPONENT"?n:null;
        actual=field==="expectedComponentId"?c?.id:c?.parent?.type==="COMPONENT_SET"?c.parent.id:null;
      }
      if(actual===undefined)fail("PRECONDITION_UNVERIFIED");
      if(actual!==pre[field])fail("PRECONDITION_FAILED: "+field);
    }
    if(request.type==="swap_component" && pre.expectedComponentSetId) {
      const target=await api.getNodeByIdAsync(p.componentId);
      if(!target||target.type!=="COMPONENT")fail("PRECONDITION_UNVERIFIED");
      if(target.parent?.id!==pre.expectedComponentSetId)fail("PRECONDITION_FAILED: destination component set");
    }
  }
  async function execute(request: any, dispatch: (r:any)=>Promise<any>) {
    if(request.type==="bridge_hello")return {type:request.type,requestId:request.requestId,data:await handshake()};
    if(request.type==="get_operation_receipt")return {type:request.type,requestId:request.requestId,data:await lookup(request.params?.operationId)};
    if(request.type==="get_document_revision") {const {ids,...r}=await revision();return {type:request.type,requestId:request.requestId,data:r};}
    if(!writes.has(request.type) || request.type==="slide_template"&&request.params?.action==="list") {
      const result=await dispatch(request);
      if(request.type==="health_check"&&result?.data) result.data.handshake={plugin:await handshake()};
      return result;
    }
    if(request.protocolVersion!==protocolVersion)fail("PROTOCOL_MISMATCH");
    if(!api.currentPage||api.currentPage.removed)fail("DOCUMENT_UNAVAILABLE");
    const id=request.params?.operationId;validateId(id);
    await load();if(corrupt)fail("RECEIPT_STORAGE_CORRUPT");prune();
    const p={...request.params};delete p.operationId;
    const fingerprint=sha256(canonical({tool:request.type,nodeIds:request.nodeIds??[],params:p,protocolVersion,documentId:documentId()}));
    let receipt=receipts.find(r=>r.operationId===id);
    if(receipt){
      if(receipt.fingerprint!==fingerprint)fail("OPERATION_ID_CONFLICT");
      const visible=await lookup(id);
      return {type:request.type,requestId:request.requestId,...(receipt.state!=="COMMITTED"?{error:"OPERATION_NOT_REPLAYABLE: "+receipt.state}:{}),data:{...receipt.resultSummary,operation:{...visible,replayed:true}}};
    }
    if(receipts.length>=maxReceipts) {const at=receipts.findIndex(r=>r.state!=="IN_PROGRESS");if(at<0)fail("RECEIPT_STORAGE_FULL");receipts.splice(at,1);}
    receipt={operationId:id,tool:request.type,fingerprint,state:"IN_PROGRESS",startedAt:new Date().toISOString(),documentId:documentId(),pageId:api.currentPage?.id,warnings:[],resultSummary:{}};
    receipts.push(receipt);
    active.add(id);
    // Persist intent before dispatch; an unresolved intent is never replayed after reload.
    try{await save();}catch{corrupt=true;fail("RECEIPT_STORAGE_UNAVAILABLE");}
    let before: any, dispatched=false, response: any, softFailure=false;
    try {
      try{before=await revision();receipt.revisionBefore=before.revision;}
      catch{receipt.warnings.push("Pre-write revision unavailable");}
      api.ui?.postMessage?.({type:"progress_update",requestId:request.requestId,progress:30,message:"Pre-write revision inspected"});
      await new Promise(resolve=>setTimeout(resolve,0));
      await conditions(request,before);
      const errorsBefore=errorSequence;
      dispatched=true;response=await dispatch(request);
      if(!response || response.error || hasFailure(response.data)||errorSequence!==errorsBefore){softFailure=!!response&&!response.error;fail("MUTATION_PARTIAL_OR_FAILED");}
      if(["swap_component","instantiate_by_name"].includes(request.type)) {
        const id=response.data?.instanceId??response.data?.id??request.nodeIds?.[0];
        const inst=await api.getNodeByIdAsync(id),component=await inst?.getMainComponentAsync();
        const resolvedId=request.type==="swap_component"?request.params.componentId:response.data?.componentId;
        if(inst?.type!=="INSTANCE"||component?.id!==resolvedId)fail("POSTCONDITION_FAILED");
        const pre=request.params?.preconditions??{};
        if(pre.expectedComponentSetId&&component?.parent?.id!==pre.expectedComponentSetId)fail("POSTCONDITION_FAILED");
        if(request.type==="instantiate_by_name"&&pre.expectedComponentId&&component?.id!==pre.expectedComponentId)fail("POSTCONDITION_FAILED");
        if(request.type==="swap_component"&&component?.id!==request.params.componentId)fail("POSTCONDITION_FAILED");
        response.data.componentSetId=component.parent?.type==="COMPONENT_SET"?component.parent.id:null;
      }
      receipt.state="COMMITTED";
    }catch(e){
      const code=e instanceof Error?e.message:String(e);
      receipt.state=dispatched?"FAILED":/PRECONDITION|STALE_DOCUMENT/.test(code)?"FAILED_PRECONDITION":"FAILED_BEFORE_WRITE";
      const candidate=code.split(":")[0];
      receipt.errorCode=/^[A-Z_]{1,64}$/.test(candidate)?candidate:"NATIVE_MUTATION_FAILED";
      if(dispatched)receipt.warnings.push("No rollback; dispatched failure may have partial writes. Inspect before continuing.");
      response={...response,type:request.type,requestId:request.requestId,...(softFailure?{}:{error:response?.error??(dispatched?code:receipt.errorCode)})};
    }
    api.ui?.postMessage?.({type:"progress_update",requestId:request.requestId,progress:70,message:"Mutation dispatch finished; verifying revision"});
    await new Promise(resolve=>setTimeout(resolve,0));
    try {
      const after=await revision();receipt.revisionAfter=after.revision;
      if(before&&after.pageId!==before.pageId)receipt.warnings.push("Post-write page scope changed; created-node closure unavailable");
      receipt.createdNodeIds=before&&after.pageId===before.pageId?after.ids.filter((id:string)=>id.length<=96&&!before.ids.includes(id)).slice(0,32):[];
      receipt.affectedNodeIds=[...new Set([...(request.nodeIds??[]),...receipt.createdNodeIds])].filter((id:any)=>typeof id==="string"&&id.length<=96&&/^I?\d+:\d+(;\d+:\d+)*$/.test(id)).slice(0,32);
      if(receipt.state==="FAILED"&&before&&after.revision!==before.revision)receipt.state="FAILED_AFTER_PARTIAL_WRITE";
    }catch{receipt.warnings.push("Post-write revision unavailable");}
    receipt.completedAt=new Date().toISOString();receipt.resultSummary=summary(response.data);
    // Failure to persist completion leaves the prior durable IN_PROGRESS, never safe-to-retry.
    try{await save();}catch{corrupt=true;fail("WRITE_RESPONSE_LOST: completion storage unavailable; do not retry");}
    active.delete(id);
    return {...response,data:{...(response.data??{}),operation:await lookup(id)}};
  }
  return {
    handle(request:any,dispatch:(r:any)=>Promise<any>):Promise<any> {
      const work=()=>execute(request,dispatch);
      if(["bridge_hello","health_check","get_operation_receipt"].includes(request.type))return work();
      const pending=queue.then(work,work);queue=pending.catch(()=>{});return pending;
    },
  };
}

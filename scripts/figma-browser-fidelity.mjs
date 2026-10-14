import { fidelityModel, analyzeFidelity, sortFidelityFindings } from '../rules/figma-browser-fidelity.mjs';
import { createHash } from 'node:crypto';

// Caller supplies the approved MCP read adapter and stable, dependency-closed source evidence.
export async function captureNativeReference(read,frame,sourceFingerprint) {
  if(frame?.type!=='FRAME' || !frame.id || !/^[a-f0-9]{64}$/.test(sourceFingerprint?.sha256 ?? ''))throw new Error('Native reference requires a source-bound FRAME');
  const response=await read('get_screenshot',{nodeIds:[frame.id],format:'PNG',scale:1});
  const image=response.exports?.[0];
  if(response.exports?.length!==1 || image.nodeId!==frame.id || image.format!=='PNG')throw new Error('Native reference identity mismatch');
  const bytes=Buffer.from(image.base64,'base64');
  if(bytes.length<24 || bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('Native reference is not PNG');
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  if(width!==Math.ceil(frame.geometry.width) || height!==Math.ceil(frame.geometry.height))throw new Error('Native export bounds differ; crop alignment is unverified');
  return {bytes,metadata:{nodeId:frame.id,scale:1,width,height,sourceFingerprint,sha256:createHash('sha256').update(bytes).digest('hex'),background:'native alpha; composite both references over the same background',crop:'native export bounds verified against source FRAME'}};
}

export async function measureScreen(page,screen) {
  const nodes=await page.evaluate(ids=>{
    const root=document.querySelector(`[data-figma-screen=${CSS.escape(ids.screen)}]`);
    if(!root || !root.getClientRects().length)return null;
    const origin=root.getBoundingClientRect();
    const rgba=s=>{const v=s.match(/[\d.]+/g)?.map(Number);return v?.length===3?[...v,1]:v;};
    return ids.nodes.map(id=>{
      const els=[...(root.matches(`[data-figma-node=${CSS.escape(id)}]`)?[root]:[]),...root.querySelectorAll(`[data-figma-node=${CSS.escape(id)}]`)];
      const el=els[0]; if(!el)return {id,count:0};
      const r=el.getBoundingClientRect(),style=getComputedStyle(el),typed=el.computedStyleMap();
      let sx=0,sy=0,opacity=1,transformed=false;
      for(let a=el;a;a=a.parentElement){opacity*=Number(getComputedStyle(a).opacity);if(a!==el){sx+=a.scrollLeft;sy+=a.scrollTop;}if(a===root)break;const t=getComputedStyle(a).transform;if(t!=='none'){const m=new DOMMatrixReadOnly(t);transformed ||= !m.is2D || Math.abs(m.a-1)>.0001 || Math.abs(m.d-1)>.0001 || Math.abs(m.b)>.0001 || Math.abs(m.c)>.0001;}}
      const range=document.createRange(); range.selectNodeContents(el);const lines=[...range.getClientRects()];
      return {id,intrinsicWidth:typed.get('width')?.toString()==='auto',intrinsicHeight:typed.get('height')?.toString()==='auto',count:els.length,visible:!!el.getClientRects().length && style.visibility!=='hidden',bounds:transformed?null:{x:r.x-origin.x+sx,y:r.y-origin.y+sy,width:r.width,height:r.height},text:el.textContent,fill:rgba(ids.text.includes(id)?style.color:style.backgroundColor),stroke:rgba(style.borderTopColor),strokeWidth:parseFloat(style.borderTopWidth),radius:parseFloat(style.borderTopLeftRadius),opacity,fontSize:parseFloat(style.fontSize),lineHeight:parseFloat(style.lineHeight),fontFamily:style.fontFamily,lineCount:new Set(lines.map(l=>Math.round(l.y))).size,textBounds:{width:range.getBoundingClientRect().width,height:range.getBoundingClientRect().height}};
    });
  },{screen:screen.id,nodes:screen.nodes.map(n=>n.id),text:screen.nodes.filter(n=>n.type==='TEXT').map(n=>n.id)});
  if(!nodes)return {id:screen.id,nodes:[],missingDOM:true};
  const session=await page.context().newCDPSession(page);
  try {
    await session.send('DOM.enable'); await session.send('CSS.enable');
    const {root}=await session.send('DOM.getDocument');
    for(const n of screen.nodes.filter(n=>n.type==='TEXT')){
      const b=nodes.find(b=>b.id===n.id); if(!b?.count)continue;
      const {nodeId}=await session.send('DOM.querySelector',{nodeId:root.nodeId,selector:`[data-figma-node=${JSON.stringify(n.id)}]`});
      const {fonts}=await session.send('CSS.getPlatformFontsForNode',{nodeId});
      b.fonts=[...new Set(fonts.filter(f=>f.glyphCount>0).map(f=>f.familyName))];
    }
  } finally {await session.detach();}
  return {id:screen.id,nodes};
}

export async function verifyBrowserFidelity(page,manifest,projection,baseUrl) {
  const model=fidelityModel(projection,manifest),measurements=[];
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const screen of model.screens){
    const declared=manifest.screens.find(s=>s.id===screen.id);
    await page.goto(baseUrl+(declared.route ?? `#/screen/${screen.id}`),{waitUntil:'networkidle'});
    await page.mouse.move(0,0); await page.evaluate(()=>document.fonts.ready);
    const measured=await measureScreen(page,screen); if(measured)measurements.push(measured);
  }
  const report=analyzeFidelity(model,measurements);
  // Placement is screen-local above; modal viewport centering is a separate semantic check.
  report.overlays=[];
  for(const edge of manifest.interactions.filter(e=>e.navigation==='OVERLAY' && e.motionEvidence?.overlayPositionType==='CENTER')){
    await page.goto(baseUrl+`#/screen/${edge.sourceScreenId}`,{waitUntil:'networkidle'});
    await page.locator(`[data-figma-node=${JSON.stringify(edge.sourceId)}]`).click();
    const modal=page.locator(`[data-figma-screen=${JSON.stringify(edge.destinationId)}]`);
    await modal.waitFor({state:'visible'});
    const bounds=await modal.boundingBox(),viewport=page.viewportSize();
    const centered=bounds && Math.abs(bounds.x+bounds.width/2-viewport.width/2)<=1 && Math.abs(bounds.y+bounds.height/2-viewport.height/2)<=1;
    report.overlays.push({id:edge.destinationId,bounds,viewport,centered});
    if(!centered){report.findings.push({severity:'HIGH',code:'MODAL_CENTER',screenId:edge.destinationId,nodeId:edge.destinationId,expected:'viewport center',actual:bounds});report.SOURCE_FIDELITY='FAIL';}
  }
  sortFidelityFindings(report.findings);
  return report;
}

export const fidelityVersion = '1.3.2';
export const geometryTolerance = Object.freeze({match:1, minor:3});
export function sortFidelityFindings(findings) {
  const order=['BLOCKER','HIGH','MEDIUM','LOW','LIMITATION'];
  return findings.sort((a,b)=>order.indexOf(a.severity)-order.indexOf(b.severity)||a.screenId.localeCompare(b.screenId)||a.nodeId.localeCompare(b.nodeId)||a.code.localeCompare(b.code));
}
const finiteBounds = b => b && ['x','y','width','height'].every(k => Number.isFinite(b[k]));
export function geometryClass(a,b) {
  if (!finiteBounds(a) || !finiteBounds(b)) return 'UNVERIFIED';
  const delta = Math.max(...['x','y','width','height'].map(k => Math.abs(a[k]-b[k])));
  return delta <= geometryTolerance.match ? 'MATCH' : delta <= geometryTolerance.minor ? 'MINOR_DRIFT' : 'MAJOR_DRIFT';
}
export function solidPaint(paints) {
  const visible = paints?.filter(p => p.visible !== false);
  if (!visible?.length) return undefined;
  if (visible.length !== 1 || visible[0].type !== 'SOLID' || !['NORMAL',undefined].includes(visible[0].blendMode)) return null;
  const p = visible[0];
  return [p.color.r*255,p.color.g*255,p.color.b*255,p.opacity ?? 1];
}

// Parent-relative translations accumulate; rotated/scaled ancestors invalidate descendant bounds.
export function fidelityModel(projection,manifest) {
  const screens = [];
  for (const screen of manifest.screens ?? []) {
    const root = projection?.runtime?.children?.find(n => n.id === screen.id);
    if (!root) { screens.push({id:screen.id,nodes:[],missingSource:true}); continue; }
    const nodes = [], unsupported=[];
    function walk(n,x,y,uncertain=false,opacity=1) {
      const p=n.props ?? {}, g=n.geometry;
      if (p.visible === false) return;
      const t=p.relativeTransform;
      uncertain ||= !!p.rotation || !!t && (Math.abs(t[0][0]-1)>.0001 || Math.abs(t[1][1]-1)>.0001 || Math.abs(t[0][1])>.0001 || Math.abs(t[1][0])>.0001);
      const bounds = g ? {x:x+g.x,y:y+g.y,width:g.width,height:g.height} : null;
      const control=manifest.controls?.some(c=>c.nodeId===n.id && c.screenId===screen.id);
      const meaningful=n.id===root.id || control || ['TEXT','FRAME','INSTANCE','COMPONENT','GROUP'].includes(n.type);
      if(!meaningful)unsupported.push({id:n.id,type:n.type});
      if (meaningful) nodes.push({id:n.id,type:n.type,role:control?'CONTROL':n.id===root.id?'SCREEN':n.type,bounds:uncertain?null:bounds,text:p.characters,
        fill:solidPaint(p.fills),stroke:solidPaint(p.strokes),strokeWidth:p.strokeWeight,opacity:opacity*(p.opacity ?? 1),radius:typeof p.cornerRadius==='number'?p.cornerRadius:undefined,
        font:p.fontName,fontSize:p.fontSize,lineHeight:p.lineHeight?.unit==='PIXELS'?p.lineHeight.value:undefined,complex:(p.fills?.length && solidPaint(p.fills)===null)||p.isMask||p.effects?.length>0});
      for (const child of n.children ?? []) walk(child,bounds?.x ?? 0,bounds?.y ?? 0,uncertain,opacity*(p.opacity ?? 1));
    }
    walk({...root,geometry:{...root.geometry,x:0,y:0}},0,0);
    screens.push({id:screen.id,nodes,unsupported});
  }
  return {contractVersion:fidelityVersion,coordinateSpace:'screen-local',screens};
}

export function analyzeFidelity(model,measurements) {
  const findings=[], comparisons=[],fonts=[];
  const coverage={SCREENS_VALIDATED:0,NODES_COMPARED:0,TEXT_NODES_COMPARED:0,CONTROLS_COMPARED:0,UNSUPPORTED_PROPERTIES:0,FONT_LIMITATIONS:0};
  function issue(severity,code,screenId,nodeId,expected,actual) { findings.push({severity,code,screenId,nodeId,expected,actual}); }
  for (const s of model.screens) {
    const measured=measurements.find(m=>m.id===s.id);
    if (s.missingSource || !measured) { issue('BLOCKER','SCREEN_UNVERIFIED',s.id,s.id,'captured source and visible DOM',null); continue; }
    if(measured.missingDOM){issue('BLOCKER','SCREEN_MISSING',s.id,s.id,'visible source screen',null);continue;}
    coverage.SCREENS_VALIDATED++;
    for(const n of s.unsupported ?? []){coverage.UNSUPPORTED_PROPERTIES++;issue('LIMITATION','COMPLEX_PAINT_LIMITATION',s.id,n.id,n.type,'UNVERIFIED');}
    for (const n of s.nodes) {
      const b=measured.nodes.find(b=>b.id===n.id);
      if (!b || !b.visible || b.count!==1) { issue(n.role==='CONTROL'?'BLOCKER':'HIGH','MISSING_OR_AMBIGUOUS_NODE',s.id,n.id,1,b?.count ?? 0); continue; }
      coverage.NODES_COMPARED++; if(n.role==='CONTROL')coverage.CONTROLS_COMPARED++;
      let fallback=false;
      if(n.type==='TEXT') {
        coverage.TEXT_NODES_COMPARED++;
        const family=n.font?.family;
        const status=!family || !b.fonts?.length?'UNKNOWN':b.fonts.some(f=>f.toLowerCase()===family.toLowerCase())?'AVAILABLE_LOCAL':'FALLBACK_USED';
        fonts.push({screenId:s.id,nodeId:n.id,source:n.font,browser:b.fonts,cssStack:b.fontFamily,status,lineCount:b.lineCount,textBounds:b.textBounds});
        fallback=status!=='AVAILABLE_LOCAL';
        if(fallback){coverage.FONT_LIMITATIONS++; issue('LIMITATION','FONT_FIDELITY_LIMITATION',s.id,n.id,n.font,{status,fonts:b.fonts,lineCount:b.lineCount,textBounds:b.textBounds});}
        if(n.text!==b.text)issue('HIGH','TEXT_CONTENT',s.id,n.id,n.text,b.text);
      }
      const geometry=geometryClass(n.bounds,b.bounds);
      comparisons.push({screenId:s.id,nodeId:n.id,geometry,sourceBounds:n.bounds,browserBounds:b.bounds});
      if(geometry==='UNVERIFIED'){coverage.UNSUPPORTED_PROPERTIES++;issue('LIMITATION','GEOMETRY_UNVERIFIED',s.id,n.id,n.bounds,b.bounds);}
      else if(geometry!=='MATCH') {
        const intrinsicFallback=fallback && Math.abs(n.bounds.x-b.bounds.x)<=1 && Math.abs(n.bounds.y-b.bounds.y)<=1 && (Math.abs(n.bounds.width-b.bounds.width)<=1 || b.intrinsicWidth) && (Math.abs(n.bounds.height-b.bounds.height)<=1 || b.intrinsicHeight);
        issue(geometry==='MINOR_DRIFT'?'LOW':intrinsicFallback?'LIMITATION':'HIGH','GEOMETRY_'+geometry,s.id,n.id,n.bounds,b.bounds);
      }
      for(const key of ['fill','stroke','radius','opacity','fontSize','lineHeight','strokeWidth']) {
        if(n[key]===undefined || n[key]===null || key==='strokeWidth' && !n.stroke)continue;
        const a=Array.isArray(n[key])?n[key]:[n[key]],actual=Array.isArray(b[key])?b[key]:[b[key]];
        if(!a.every((v,i)=>Number.isFinite(actual[i]) && Math.abs(v-actual[i])<=(key==='fill'||key==='stroke'?(i===3?.005:1):.1)))issue('MEDIUM','PROPERTY_'+key,s.id,n.id,n[key],b[key]);
      }
      if(n.complex){coverage.UNSUPPORTED_PROPERTIES++;issue('LIMITATION','COMPLEX_PAINT_LIMITATION',s.id,n.id,'complex native rendering','PARTIAL');}
    }
  }
  sortFidelityFindings(findings);
  return {contractVersion:fidelityVersion,SOURCE_FIDELITY:findings.some(f=>f.code==='SCREEN_MISSING')?'FAIL':!coverage.SCREENS_VALIDATED?'UNVERIFIED':findings.some(f=>['BLOCKER','HIGH','MEDIUM'].includes(f.severity))?'FAIL':findings.length?'WARN':'PASS',BROWSER_VISUAL_REGRESSION:'UNVERIFIED',PIXEL_REGRESSION:'UNVERIFIED',NATIVE_RENDER_PARITY:'UNVERIFIED',FIGMA_PIXEL_PARITY:'UNVERIFIED',coverage,findings,comparisons,fonts};
}

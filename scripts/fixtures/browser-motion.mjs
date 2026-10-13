import { readFileSync } from 'node:fs';
import { motionTokens } from '../../rules/figma-motion-semantics.mjs';
import { browserMotion, browserMotionManifest } from '../../rules/figma-browser-motion.mjs';
import { browserMotionSource } from '../figma-browser-motion-runtime.mjs';

export const retainedScroll = JSON.parse(readFileSync(new URL('./native-scroll-live.json',import.meta.url)));
export const nativeAudit = JSON.parse(readFileSync(new URL('./figma-motion-capabilities.json',import.meta.url)));
const transition = token => { const {tolerance,types,...value} = motionTokens[token]; return structuredClone(value); };
export const browserMotionCases = [
  {name:'STATE_FAST',navigation:'CHANGE_TO',transition:transition('STATE_FAST')},
  {name:'NAV_DEFAULT',navigation:'NAVIGATE',transition:transition('NAV_DEFAULT')},
  ...motionTokens.NAV_SPATIAL.types.flatMap(type => ['LEFT','RIGHT','TOP','BOTTOM'].map(direction => ({name:`${type}_${direction}`,navigation:'NAVIGATE',transition:{type,direction,matchLayers:false,...transition('NAV_SPATIAL')}}))),
  {name:'OVERLAY_DEFAULT',navigation:'OVERLAY',transition:transition('OVERLAY_DEFAULT')},
  {name:'SCROLL_NATIVE',navigation:'SCROLL_TO',transition:null},
  {name:'SCROLL_SMOOTH',navigation:'SCROLL_TO',transition:retainedScroll.candidate.request[0].actions[0].transition},
  {name:'experimental-smart',navigation:'NAVIGATE',transition:transition('STATE_FAST')},
  {name:'experimental-match',navigation:'NAVIGATE',transition:{type:'PUSH',direction:'LEFT',matchLayers:true,...transition('NAV_SPATIAL')}},
  {name:'experimental-easing',navigation:'NAVIGATE',transition:{...transition('NAV_DEFAULT'),easing:{type:'CUSTOM_CUBIC_BEZIER',easingFunctionCubicBezier:{x1:.2,y1:0,x2:.8,y2:1}}}},
];

// Synthetic source-shaped fixtures; retained scroll evidence is historical, never live freshness.
export function browserFixture(example) {
  const scroll = example.navigation === 'SCROLL_TO', state = example.navigation === 'CHANGE_TO', overlay = example.navigation === 'OVERLAY';
  const nativeReference = scroll ? retainedScroll.candidate.request[0].actions[0] : nativeAudit.playback.find(p => p.transition?.type === example.transition?.type && p.readback)?.readback[0].actions[0];
  const nativeAction = {...structuredClone(nativeReference ?? {type:'NODE',resetVideoPosition:false}),navigation:example.navigation,destinationId:scroll ? 'fixture:target' : state ? 'fixture:hover' : 'fixture:b',transition:structuredClone(example.transition)};
  const motionEvidence = {destinationExists:true,...(state ? {sourceSetId:'fixture:set',destinationSetId:'fixture:set'} : {}),...(overlay ? {overlayPositionType:'CENTER'} : {}),...(scroll ? {scrollContext:{status:'PREPARED',containerId:'fixture:scroller',nativeOverflow:'VERTICAL',overflowAxes:['VERTICAL']}} : {})};
  const nativeReaction = {trigger:{type:state ? 'ON_HOVER' : 'ON_CLICK'},actions:[nativeAction],action:nativeAction};
  const edge = {sourceId:'fixture:control',sourceScreenId:'fixture:a',trigger:nativeReaction.trigger,action:'NODE',navigation:nativeAction.navigation,destinationId:nativeAction.destinationId,nativeReaction,nativeAction,motionEvidence,motion:browserMotion(nativeAction,motionEvidence)};
  const manifest = {version:2,systemVersion:'1.2.1',runtimeSectionId:'fixture:runtime',runtimeSectionName:'Figma Designer — Interactive App',startScreenId:'fixture:a',evidenceMode:'DETERMINISTIC_FIXTURE_NOT_LIVE_SOURCE',screens:['fixture:a','fixture:b'].map(id => ({id,route:`#/screen/${id}`})),interactions:[edge],controls:[{nodeId:edge.sourceId,screenId:edge.sourceScreenId,classification:state ? 'WORKING_STATE' : 'WORKING_ACTION'}]};
  if (overlay) {
    const nativeAction = {type:'CLOSE'}, motionEvidence = {};
    manifest.interactions.push({sourceId:'fixture:close',sourceScreenId:'fixture:b',trigger:'ON_CLICK',action:'CLOSE',nativeAction,motionEvidence,motion:browserMotion(nativeAction,motionEvidence)});
    manifest.controls.push({nodeId:'fixture:close',screenId:'fixture:b',classification:'WORKING_ACTION'});
  }
  manifest.motion = browserMotionManifest(manifest.interactions);
  const control = `<${example.navigation === 'NAVIGATE' ? 'a href="#/screen/fixture:b"' : 'button'} data-figma-node="fixture:control" data-figma-state="fixture:default" data-figma-destination="${edge.destinationId}"><span data-figma-node="fixture:label">Existing control</span></${example.navigation === 'NAVIGATE' ? 'a' : 'button'}>`;
  const nativeContainer = retainedScroll.nativeContextNodes.find(n=>n.id===retainedScroll.preparedContext.containerId);
  const nativeTarget = retainedScroll.nativeContextNodes.find(n=>n.id===retainedScroll.preparedContext.destinationId);
  const extent = Math.max(...retainedScroll.nativeContextNodes.filter(n=>n.parentId===nativeContainer.id).map(n=>n.geometry.y+n.geometry.height));
  const content = scroll ? `<div data-figma-node="fixture:scroller" style="height:${nativeContainer.geometry.height}px;width:${nativeContainer.geometry.width}px;overflow-y:auto;position:relative"><div style="height:${extent}px">${control}<div data-figma-node="fixture:target" style="position:absolute;left:${nativeTarget.geometry.x}px;top:${nativeTarget.geometry.y}px;width:${nativeTarget.geometry.width}px;height:${nativeTarget.geometry.height}px">Existing target</div></div></div>` : control;
  const html = `<!doctype html><html><head><link rel="stylesheet" href="styles.css"></head><body><main data-figma-app><section data-figma-screen="fixture:a">${content}</section><section data-figma-screen="fixture:b">Existing destination${overlay ? '<button data-figma-node="fixture:close">Close</button>' : ''}</section></main><script src="app.js"></script></body></html>`;
  const css = `[hidden]{display:none!important} [data-figma-app]{position:relative;width:800px;height:500px;overflow:hidden} [data-figma-screen]{position:absolute;inset:0;background:white} [data-figma-overlay="open"]{inset:80px;width:400px;height:260px;z-index:10!important} [data-figma-node="fixture:control"]{background-color:rgb(80,80,80);transition:background-color var(--figma-state-duration,0ms) ease-out} [data-figma-state="fixture:hover"]{background-color:rgb(150,100,100)} @media(prefers-reduced-motion:reduce){*,*::before,*::after{transition-duration:0ms!important;animation-duration:0ms!important}}`;
  return {manifest,html,css,app:browserMotionSource(manifest),expectedScrollEnd:Math.min(nativeTarget.geometry.y,extent-nativeContainer.geometry.height)};
}

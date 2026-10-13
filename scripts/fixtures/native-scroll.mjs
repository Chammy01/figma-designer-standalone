import {flowFixture} from './interaction-qa.mjs';
import {inspectScrollContext} from '../../rules/figma-motion-semantics.mjs';

export function scrollFixture({prepared=true,smooth=true,transition=null}={}) {
  const f=flowFixture();
  for(const n of f.model.nodes.filter(n=>n.type==='FRAME'))n.props.overflowDirection='NONE';
  f.find('3:1').props.overflowDirection=prepared?'VERTICAL':'NONE';
  const target=f.node('4:3','FRAME','3:1','Details',{overflowDirection:'NONE'},{x:24,y:700,width:300,height:100});
  const action={type:'NODE',navigation:'SCROLL_TO',destinationId:target.id,transition,resetVideoPosition:false};
  f.control.reactions=[{trigger:{type:'ON_CLICK'},actions:[action],action:structuredClone(action)}];
  f.model.scope.screenIds=['3:1'];
  f.model.scope.controls[0]={id:f.control.id,...(smooth?{motion:{intent:'SCROLL_SMOOTH'}}:{}),expected:{confidence:'VERIFIED',source:'Explicit fixture request: scroll to existing Details',actions:[{type:'SCROLL_TO',destinationId:target.id}]}};
  f.target=target;
  f.context=()=>inspectScrollContext({nodes:f.model.nodes,sourceId:f.control.id,destinationId:target.id,runtimeId:'1:1'});
  f.request=()=>[{reactionIndex:0,actionIndex:0,intent:smooth?'SCROLL_SMOOTH':'SCROLL',evidence:{destinationExists:true,sourceId:f.control.id,intendedDestinationId:target.id,scrollContext:f.context()}}];
  return f;
}

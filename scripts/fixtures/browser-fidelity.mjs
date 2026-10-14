// Deterministic synthetic source; no live content or external assets.
export function fidelityFixture(kind='layout') {
  const text={id:'text',type:'TEXT',geometry:{x:24,y:24,width:320,height:32},props:{visible:true,opacity:1,characters:'Local inventory',fontName:{family:'Arial',style:'Regular'},fontSize:24,lineHeight:{unit:'PIXELS',value:32},fills:[{type:'SOLID',color:{r:0.125490196,g:0.125490196,b:0.125490196}}]},children:[]};
  const control={id:'control',type:'FRAME',geometry:{x:24,y:80,width:160,height:48},props:{visible:true,opacity:1,cornerRadius:4,fills:[{type:'SOLID',color:{r:0.125490196,g:0.250980392,b:0.501960784}}]},children:[]};
  const root={id:'screen',type:'FRAME',geometry:{x:9000,y:7000,width:640,height:480},props:{visible:true,opacity:1,fills:[{type:'SOLID',color:{r:1,g:1,b:1}}]},children:[text,control]};
  if(kind==='state')control.props.fills[0].color={r:.250980392,g:.125490196,b:.501960784};
  if(kind==='destination')text.props.characters='Delivery overview';
  if(kind==='modal'){root.geometry.width=400;root.geometry.height=260;text.props.characters='Delivery details';}
  if(kind==='cards')root.children.push({id:'card',type:'FRAME',geometry:{x:224,y:80,width:240,height:180},props:{visible:true,opacity:1,cornerRadius:8,fills:[{type:'SOLID',color:{r:.941176471,g:.941176471,b:.941176471}}]},children:[]});
  if(kind==='scroll')root.children.push({id:'target',type:'FRAME',geometry:{x:24,y:720,width:200,height:60},props:{visible:true,opacity:1,fills:[{type:'SOLID',color:{r:.8,g:.8,b:.8}}]},children:[]});
  const color=p=>`rgb(${Object.values(p.fills[0].color).map(v=>Math.round(v*255)).join(',')})`;
  const node=n=>`<${n.type==='TEXT'?'span':'div'} data-figma-node="${n.id}" style="position:absolute;left:${n.geometry.x}px;top:${n.geometry.y}px;width:${n.geometry.width}px;height:${n.geometry.height}px;${n.type==='TEXT'?`font:24px/32px Arial,sans-serif;color:${color(n.props)}`:`background:${color(n.props)};border-radius:${n.props.cornerRadius??0}px`}">${n.props.characters??''}</${n.type==='TEXT'?'span':'div'}>`;
  const html=`<!doctype html><style>*{box-sizing:border-box}body{margin:0;background:#ddd}section{position:absolute;background:white;width:${root.geometry.width}px;height:${root.geometry.height}px;overflow:${kind==='scroll'?'auto':'hidden'};${kind==='modal'?'left:50%;top:50%;transform:translate(-50%,-50%)':'left:32px;top:24px'}}</style><section data-figma-screen="screen" data-figma-node="screen">${root.children.map(node).join('')}</section>`;
  return {html,projection:{runtime:{children:[root]}},manifest:{screens:[{id:'screen'}],controls:[{nodeId:'control',screenId:'screen'}],interactions:[]}};
}

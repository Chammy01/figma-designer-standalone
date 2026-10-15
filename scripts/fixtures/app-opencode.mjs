import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
export function mockOpenCode({password='fixture-private-password',delay=60}={}) {
  const calls=[],sessions=new Map(),models=[{id:'first',providerID:'fixture',name:'First model',enabled:true,status:'active',capabilities:{tools:true}},{id:'second',providerID:'fixture',name:'Second model',enabled:true,status:'active',capabilities:{tools:true}}],providers=[{id:'fixture',name:'Fixture Provider',activation:'enabled'}],integrations=[{id:'fixture',name:'Fixture Provider',methods:[{type:'key',label:'API key'},{type:'oauth',id:'browser',label:'Browser sign-in'}],connections:[{type:'credential',method:'key'}]}],selected=new Map();let sequence=0;
  const server=createServer(async(req,res)=>{
    if(req.headers.authorization!=='Basic '+Buffer.from('opencode:'+password).toString('base64')){res.writeHead(401);res.end('{}');return;}
    let text='';for await(const chunk of req)text+=chunk;const body=text?JSON.parse(text):undefined;const path=new URL(req.url,'http://localhost').pathname;
    calls.push({path,method:req.method,body});
    const send=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
    if(path==='/api/info'){send({version:'2.0.24',pid:process.pid});return;}
    if(path==='/api/location'){send({directory:process.cwd()});return;}
    if(path==='/api/provider'){send({data:providers});return;}
    if(path==='/api/model/default'){send({data:models[0]??null});return;}
    if(path==='/api/model'){send({data:models});return;}
    if(path==='/api/integration'){send({data:integrations});return;}
    if(path==='/api/location/reload'){res.writeHead(204);res.end();return;}
    if(path==='/api/experimental/generate'){send({data:{text:'OK'}});return;}
    if(path==='/api/integration/fixture/connect/key'){integrations[0].connections=[{type:'credential',method:'key'}];res.writeHead(204);res.end();return;}
    if(path==='/api/integration/fixture/connect/oauth'){send({data:{attemptID:'attempt',url:'https://provider.example/signin',mode:'auto'}});return;}
    if(path==='/api/integration/fixture/connect/oauth/attempt'){send({data:{status:'complete'}});return;}
    if(path==='/api/session'){const id='ses_mock_'+(++sequence);sessions.set(id,[]);selected.set(id,body.model);send({data:{id,agent:body.agent,location:body.location,model:body.model}});return;}
    const modelPath=path.match(/^\/api\/session\/(ses_mock_\d+)(\/model)?$/);if(modelPath){if(modelPath[2]){selected.set(modelPath[1],body.model);res.writeHead(204);res.end();}else send({data:{id:modelPath[1],model:selected.get(modelPath[1])}});return;}
    const match=path.match(/^\/api\/session\/(ses_mock_\d+)\/(context|prompt|command|interrupt)$/);
    if(!match){send({_tag:'NotFound'},404);return;}const [,id,action]=match,context=sessions.get(id);
    if(action==='context'){send({data:context});return;}
    if(action==='interrupt'){context.push({type:'idle',outcome:'interrupted'});send({interrupted:true});return;}
    if(body?.text==='provider-failure'){context.push({type:'error',error:{type:'ProviderAuthError'}},{type:'idle',outcome:'failed'});send({data:{}});return;}
    if(body?.text==='uncertain-failure'){context.push({type:'assistant',content:[{type:'tool',name:'write',state:{}}]},{type:'error',error:{type:'ProviderError'}},{type:'idle',outcome:'failed'});send({data:{}});return;}
    context.push({type:'user',text:body?.text??''});
    const result=action==='command'?`${body.name}\nFIGMA_${body.name==='figma/qa'?'INTERFACE_QA':body.name==='figma/browser-test'?'BROWSER_TEST':body.name==='figma/browser'?'BROWSER':'DOCTOR'}: PASS`:body.text.includes('vague')?'What should users do first?':'Native design created.\nFIGMA_DESIGN_V2: PASS';
    setTimeout(()=>{if(context.at(-1)?.outcome==='interrupted')return;context.push({type:'assistant',agent:'figma-designer',content:[{type:'reasoning',text:'HIDDEN_REASONING_SENTINEL'},{type:'tool',name:'private_tool',state:{input:{Authorization:'Basic secret'}}},{type:'text',text:result}]},{type:'idle',outcome:'succeeded'});},delay).unref();
    if(action==='command'){res.writeHead(204);res.end();}else send({data:{id:'message_'+context.length}});
  });
  return {server,calls,sessions,models,providers,integrations};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const mock=mockOpenCode({password:process.env.OPENCODE_PASSWORD});mock.server.listen(Number(process.argv.at(-1)),'127.0.0.1');}

import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
export function mockOpenCode({password='fixture-private-password',delay=60}={}) {
  const calls=[],sessions=new Map();let sequence=0;
  const server=createServer(async(req,res)=>{
    if(req.headers.authorization!=='Basic '+Buffer.from('opencode:'+password).toString('base64')){res.writeHead(401);res.end('{}');return;}
    let text='';for await(const chunk of req)text+=chunk;const body=text?JSON.parse(text):undefined;const path=new URL(req.url,'http://localhost').pathname;
    calls.push({path,method:req.method,body});
    const send=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
    if(path==='/api/info'){send({version:'2.0.24',pid:process.pid});return;}
    if(path==='/api/location'){send({directory:process.cwd()});return;}
    if(path==='/api/session'){const id='ses_mock_'+(++sequence);sessions.set(id,[]);send({data:{id,agent:body.agent,location:body.location}});return;}
    const match=path.match(/^\/api\/session\/(ses_mock_\d+)\/(context|prompt|command|interrupt)$/);
    if(!match){send({_tag:'NotFound'},404);return;}const [,id,action]=match,context=sessions.get(id);
    if(action==='context'){send({data:context});return;}
    if(action==='interrupt'){context.push({type:'idle',outcome:'interrupted'});send({interrupted:true});return;}
    if(body?.text==='provider-failure'){send({_tag:'ProviderAuthError'},503);return;}
    context.push({type:'user',text:body?.text??''});
    const result=action==='command'?`${body.name}\nFIGMA_${body.name==='figma/qa'?'INTERFACE_QA':body.name==='figma/browser-test'?'BROWSER_TEST':body.name==='figma/browser'?'BROWSER':'DOCTOR'}: PASS`:body.text.includes('vague')?'What should users do first?':'Native design created.\nFIGMA_DESIGN_V2: PASS';
    setTimeout(()=>{if(context.at(-1)?.outcome==='interrupted')return;context.push({type:'assistant',agent:'figma-designer',content:[{type:'reasoning',text:'HIDDEN_REASONING_SENTINEL'},{type:'tool',name:'private_tool',state:{input:{Authorization:'Basic secret'}}},{type:'text',text:result}]},{type:'idle',outcome:'succeeded'});},delay).unref();
    if(action==='command'){res.writeHead(204);res.end();}else send({data:{id:'message_'+context.length}});
  });
  return {server,calls,sessions};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const mock=mockOpenCode({password:process.env.OPENCODE_PASSWORD});mock.server.listen(Number(process.argv.at(-1)),'127.0.0.1');}

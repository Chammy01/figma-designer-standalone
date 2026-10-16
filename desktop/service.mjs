import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const root=process.env.FIGMA_DESKTOP_WORKSPACE;
if(!root||!process.send)throw Error('Desktop service requires its owned parent');
const {OpenCodeClient}=await import(pathToFileURL(join(root,'app/server/opencode-client.mjs')));
const engine=new OpenCodeClient({root,executable:process.env.OPENCODE_EXECUTABLE});
let service,closing=false;
async function close(){if(closing)return;closing=true;await service?.close();await engine.stop();process.exit(0);}
process.on('disconnect',close);process.on('SIGTERM',close);
try{
  // Import the existing service from the writable workspace so its normal root stays authoritative.
  const {createApplication:create}=await import(pathToFileURL(join(root,'app/server/index.mjs')));
  service=await create({root,engine,recoveryFile:join(root,'.figma-designer/app/recovery.json'),onPreview:url=>process.send?.({type:'preview',url}),onExternalSetup:url=>process.send?.({type:'provider-setup',url})});
  process.send({type:'ready',url:service.url});
}catch{process.send?.({type:'error',code:'APP_SERVICE_FAILED'});await close();}

export const activityVersion='1.5.0';
export const activityPhases=['IDLE','LISTENING','INSPECTING','PLANNING','DESIGNING','PROTOTYPING','CHECKING','PREVIEWING','WAITING','RECOVERING','COMPLETED','CANCELLED','BLOCKED'];
export const activityAnimations=['IDLE','LISTEN','READ','THINK','TYPE','CONNECT','CHECK','PREVIEW','TALK','WAIT','RECOVER','DONE','ALERT'];
export const activityGroups=['READ_DESIGN','WRITE_DESIGN','COMPONENTS','PROTOTYPE','EXPORT','QA','BROWSER','RECOVERY','OTHER'];
export const phaseLabels={IDLE:'Ready',LISTENING:'Listening',INSPECTING:'Reviewing',PLANNING:'Preparing',DESIGNING:'Designing',PROTOTYPING:'Connecting',CHECKING:'Checking',PREVIEWING:'Previewing',WAITING:'Your turn',RECOVERING:'Checking the last change',COMPLETED:'Finished',CANCELLED:'Stopped',BLOCKED:'Needs attention'};
const copy=(phase,animation,message,detail='')=>({phase,animation,message,detail});
// Only these owned strings reach the presence surface; never interpolate a prompt or tool payload.
export const activityCopy={
 idle:copy('IDLE','IDLE','Ready when you are.'),
 submitted:copy('LISTENING','LISTEN','I have your request.'),
 planning:copy('PLANNING','THINK',"I'm preparing the next step."),
 readStart:copy('INSPECTING','READ',"I'm checking your current design."),
 readDone:copy('INSPECTING','READ','I checked the current design.'),
 checkStart:copy('CHECKING','CHECK',"I'm checking the design after the changes."),
 checkDone:copy('CHECKING','CHECK','I checked the design after the changes.'),
 writeStart:copy('DESIGNING','TYPE',"I'm updating the interface."),
 writeDone:copy('DESIGNING','TYPE','I updated the interface.'),
 componentsStart:copy('DESIGNING','CONNECT',"I'm setting up the reusable components."),
 componentsDone:copy('DESIGNING','CONNECT','I updated the reusable components.'),
 prototypeStart:copy('PROTOTYPING','CONNECT',"I'm connecting the interactions."),
 prototypeDone:copy('PROTOTYPING','CONNECT','I updated the interactions.'),
 exportStart:copy('PREVIEWING','PREVIEW',"I'm exporting the design."),
 exportDone:copy('PREVIEWING','PREVIEW','I exported the design.'),
 qaStart:copy('CHECKING','CHECK',"I'm checking the buttons, screens and interactions."),
 qaDone:copy('COMPLETED','DONE','I finished checking the interactions.'),
 previewStart:copy('PREVIEWING','PREVIEW',"I'm preparing the interactive preview."),
 previewDone:copy('COMPLETED','DONE','The preview task is finished. Review the result below.'),
 testStart:copy('CHECKING','CHECK',"I'm testing the preview and comparing it with the design."),
 testDone:copy('COMPLETED','DONE','The preview check is finished. Review its report below.'),
 statusStart:copy('INSPECTING','READ',"I'm checking the Figma Designer connection."),
 statusDone:copy('COMPLETED','DONE','The connection check is finished.'),
 recoveryStart:copy('RECOVERING','RECOVER',"I'm checking the last change.","Figma may have finished it already, so I won't repeat it until I know."),
 receiptStart:copy('RECOVERING','RECOVER',"I'm checking the last change."),
 receiptDone:copy('RECOVERING','RECOVER','I checked the last change.'),
 committed:copy('WAITING','WAIT','The last change completed. Your existing work is preserved.','Review the result before continuing; nothing was repeated.'),
 recovered:copy('COMPLETED','DONE','The change was already completed. Your result is ready to review.'),
 prewrite:copy('BLOCKED','ALERT',"That change didn't start. It's safe to try again.",'Choose Try Again only when you want to repeat the request.'),
 partial:copy('WAITING','WAIT','Part of the change may already be in Figma.','Keep the existing work and check the result before continuing.'),
 unknown:copy('BLOCKED','ALERT',"I couldn't confirm what happened to the last change.",'Check the current result before repeating the request.'),
 integrity:copy('BLOCKED','ALERT','The design changed during a read-only check.','Review the changes before continuing.'),
 waiting:copy('WAITING','TALK','I need your input before I continue.','Reply to the question in the conversation below.'),
 cancelled:copy('CANCELLED','WAIT','The task stopped. Any completed changes remain.','Check the result before starting again.'),
 completed:copy('COMPLETED','DONE','Your design task is finished. Review the result below.'),
 restored:copy('COMPLETED','DONE','Your previous task has finished.'),
 findings:copy('COMPLETED','ALERT','The check is finished. There are findings to review.'),
 limited:copy('BLOCKED','ALERT','This task needs attention. Review the result below.'),
 failed:copy('BLOCKED','ALERT',"I couldn't finish this task. Review the recovery options below."),
 stepError:copy('PLANNING','THINK','A step needs attention. The task is checking what to do next.'),
 providerAuth:copy('BLOCKED','ALERT','I need you to reconnect your AI provider.'),
 modelUnavailable:copy('BLOCKED','ALERT',"That model isn't available right now. Choose another model to continue."),
 modelRequired:copy('BLOCKED','ALERT','Choose an available AI model before we continue.'),
 rateLimit:copy('BLOCKED','ALERT','Your AI provider needs a moment before I can continue.'),
 providerUnavailable:copy('BLOCKED','ALERT',"Your AI provider isn't available. Review the connection options below."),
 figmaDisconnected:copy('BLOCKED','ALERT',"I lost the Figma connection. Open the plugin and choose Check Again."),
 engineUnavailable:copy('BLOCKED','ALERT',"I'm waiting for the design workspace to connect."),
 runtimeUnavailable:copy('BLOCKED','ALERT','The design workspace needs a setup check before we continue.')
};
export function connectionMessage(status={}){
 if(status.runtime&&status.runtime!=='VERIFIED')return 'runtimeUnavailable';
 if(status.figma&&status.figma!=='CONNECTED'||status.mcp&&status.mcp.state!=='COMPATIBLE')return 'figmaDisconnected';
 if(status.engine&&!['READY','EXTERNAL'].includes(status.engine.state))return 'engineUnavailable';
 return ({PROVIDER_AUTH_REQUIRED:'providerAuth',PROVIDER_REQUIRED:'providerAuth',MODEL_REQUIRED:'modelRequired',MODEL_UNAVAILABLE:'modelUnavailable'})[status.ai?.state]??null;
}
export function activityView(value){
 const known=activityCopy[value?.messageId];
 if(!known)return {...activityCopy.idle,messageId:'idle',active:false,attention:false};
 return {...known,messageId:value.messageId,active:value.active===true&&!value.terminal,attention:value.attention===true,terminal:value.terminal===true};
}

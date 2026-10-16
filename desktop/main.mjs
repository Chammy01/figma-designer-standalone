import {app,BrowserWindow,ipcMain,shell,screen,dialog,Menu} from 'electron';
import {fork} from 'node:child_process';
import {readFile,mkdir,rm} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {join,delimiter} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareWorkspace,atomicJSON,restoredBounds,applicationId,externalSetupPolicy,sameOrigin,cleanupDiagnostics} from './policy.mjs';

app.setName('Figma Designer');app.setAppUserModelId(applicationId);
app.setAppLogsPath(join(app.getPath('userData'),'logs'));
app.commandLine.appendSwitch('log-file',join(app.getPath('userData'),'logs/chromium.log'));
process.env.CHROME_LOG_FILE=join(app.getPath('userData'),'logs/chromium.log');
const here=fileURLToPath(new URL('.',import.meta.url));
let window,child,serviceOrigin,previewOrigin,quitting=false;
const externalLinks=externalSetupPolicy();
if(!app.requestSingleInstanceLock()){app.quit();}else{
  app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.show();window.focus();}});
  app.on('window-all-closed',()=>app.quit());
  app.on('before-quit',event=>{if(quitting)return;event.preventDefault();quitting=true;if(child?.connected)child.disconnect();const timer=setTimeout(()=>{dialog.showErrorBox('Figma Designer is closing','The design engine is still stopping. Completed Figma changes are preserved.');},15000);timer.unref();if(!child||child.exitCode!==null||child.signalCode!==null)app.exit(0);else child.once('exit',()=>app.exit(0));});
  app.whenReady().then(async()=>{
  const data=app.getPath('userData'),payload=app.isPackaged?join(process.resourcesPath,'payload'):join(here,'../.figma-designer/desktop/payload'),workspace=join(data,'workspace');
  try{
    await mkdir(data,{recursive:true});await cleanupDiagnostics(join(app.getPath('temp'),'Figma Designer'));
    await prepareWorkspace(payload,workspace);
    let saved;try{saved=JSON.parse(await readFile(join(data,'window.json'),'utf8'));}catch{}
    window=new BrowserWindow({...restoredBounds(saved,[screen.getPrimaryDisplay(),...screen.getAllDisplays()]),minWidth:900,minHeight:650,title:'Figma Designer',show:false,webPreferences:{preload:join(here,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
    window.on('close',()=>atomicJSON(join(data,'window.json'),window.getNormalBounds()).catch(()=>{}));
    const allowed=(url,preview=false)=>sameOrigin(url,preview?previewOrigin:serviceOrigin);
    window.webContents.on('will-navigate',(e,url)=>{if(!allowed(url))e.preventDefault();});
    window.webContents.on('will-redirect',(e,url)=>{if(!allowed(url))e.preventDefault();});
    const ses=window.webContents.session;ses.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));ses.setPermissionCheckHandler(()=>false);
    window.webContents.setWindowOpenHandler(({url})=>{
      if(externalLinks.allows(url)){shell.openExternal(url);return {action:'deny'};}
      if(url!=='about:blank')return {action:'deny'};
      return {action:'allow',overrideBrowserWindowOptions:{title:'Figma Designer Preview',webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,preload:join(here,'preview-preload.cjs')}}};
    });
    window.webContents.on('did-create-window',preview=>{
      preview.webContents.setWindowOpenHandler(()=>({action:'deny'}));
      preview.webContents.on('will-navigate',(e,url)=>{if(!allowed(url,true))e.preventDefault();});
      preview.webContents.on('will-redirect',(e,url)=>{if(!allowed(url,true))e.preventDefault();});
    });
    ipcMain.handle('desktop:plugin-folder',async event=>{if(event.sender!==window.webContents||!allowed(event.senderFrame.url))throw Error('Not available');return shell.openPath(join(payload,'workspace/vendor/figma-mcp/plugin'));});
    Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'File',submenu:[{role:'quit'}]},{label:'Edit',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},{label:'View',submenu:[{role:'reload'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen'}]}]));
    const tools=join(payload,'tools'),diagnostics=join(app.getPath('temp'),'Figma Designer','run-'+randomUUID());await mkdir(diagnostics,{recursive:true});
    const serviceScript=app.isPackaged?join(process.resourcesPath,'app.asar.unpacked/desktop/service.mjs'):join(here,'service.mjs');
    child=fork(serviceScript,[],{execPath:join(tools,'node.exe'),cwd:workspace,windowsHide:true,stdio:['ignore','ignore','ignore','ipc'],env:{...process.env,FIGMA_DESKTOP_WORKSPACE:workspace,OPENCODE_EXECUTABLE:join(tools,'opencode.exe'),OPENCODE_DISABLE_AUTOUPDATE:'true',PATH:tools+delimiter+process.env.PATH,TEMP:diagnostics,TMP:diagnostics,CHROME_LOG_FILE:join(diagnostics,'chromium.log'),PLAYWRIGHT_BROWSERS_PATH:join(payload,'browsers')}});
    child.once('exit',()=>{if(diagnostics.startsWith(join(app.getPath('temp'),'Figma Designer')+'\\'))rm(diagnostics,{recursive:true,force:true}).catch(()=>{});});
    child.on('message',message=>{if(message.type==='ready'){serviceOrigin=message.url;atomicJSON(join(data,'desktop-status.json'),{pid:process.pid,servicePid:child.pid,origin:serviceOrigin,phase:'APP_SERVICE_READY'}).catch(()=>{});window.loadURL(serviceOrigin+'/#workspace');window.show();}if(message.type==='preview')previewOrigin=message.url;if(message.type==='provider-setup')externalLinks.register(message.url);if(message.type==='error')dialog.showErrorBox('Figma Designer',message.code);});
    child.on('error',()=>{dialog.showErrorBox('Figma Designer','APP_SERVICE_FAILED');app.quit();});
    child.on('exit',()=>{if(!quitting){dialog.showErrorBox('Figma Designer','APP_SERVICE_FAILED. Reopen the app; uncertain work will be checked before another request.');app.quit();}});
  }catch(error){dialog.showErrorBox('Figma Designer',error.message==='RUNTIME_HASH_MISMATCH'?'RUNTIME_HASH_MISMATCH: reinstall the approved candidate.':'Application setup failed. Reinstall the approved candidate; your Figma file was not changed.');app.quit();}
  });
}

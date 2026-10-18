const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('figmaDesktop',Object.freeze({version:'1.5.0',openPluginFolder:()=>ipcRenderer.invoke('desktop:plugin-folder')}));

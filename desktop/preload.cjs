const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('figmaDesktop',Object.freeze({version:'1.4.4',openPluginFolder:()=>ipcRenderer.invoke('desktop:plugin-folder')}));

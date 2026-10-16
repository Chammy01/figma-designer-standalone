const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('figmaDesktop',Object.freeze({openPluginFolder:()=>ipcRenderer.invoke('desktop:plugin-folder')}));

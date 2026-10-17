const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hrAPI', {
  importFile: () => ipcRenderer.invoke('import-hr-file'),
  loadLocalData: () => ipcRenderer.invoke('load-local-data'),
  clearLocalData: () => ipcRenderer.invoke('clear-local-data')
});

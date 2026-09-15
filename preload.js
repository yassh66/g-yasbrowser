/**
 * YAS Browser - Electron Preload Bridge
 * 
 * Safely bridges Main Process IPC capabilities to the Renderer process
 * through Electron's contextBridge with strict context isolation.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onWindowStateChange: (callback) => {
    ipcRenderer.on('window:state-changed', (event, data) => callback(data));
  },

  // Media Download & Engine IPC
  analyzeUrl: (url) => ipcRenderer.invoke('media:analyze', url),
  startDownload: (config) => ipcRenderer.invoke('media:start-download', config),
  cancelDownload: (downloadId) => ipcRenderer.invoke('media:cancel-download', downloadId),
  openFolder: (folderPath) => ipcRenderer.invoke('media:open-folder', folderPath),
  showInFolder: (filePath) => ipcRenderer.invoke('media:show-in-folder', filePath),
  chooseDirectory: () => ipcRenderer.invoke('dialog:choose-directory'),
  checkDependencies: () => ipcRenderer.invoke('system:check-dependencies'),
  copyToClipboard: (text) => ipcRenderer.invoke('system:copy-to-clipboard', text),
  
  // Real-time download progress listener
  onDownloadProgress: (callback) => {
    ipcRenderer.on('media:progress', (event, data) => callback(data));
  }
});

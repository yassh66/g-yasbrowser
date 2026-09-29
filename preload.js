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
  analyzeMedia: (url) => ipcRenderer.invoke('media:analyze', url),
  startDownload: (config) => ipcRenderer.invoke('media:start-download', config),
  cancelDownload: (downloadId) => ipcRenderer.invoke('media:cancel-download', downloadId),
  openFolder: (folderPath) => ipcRenderer.invoke('media:open-folder', folderPath),
  showInFolder: (filePath) => ipcRenderer.invoke('media:show-in-folder', filePath),
  chooseDirectory: () => ipcRenderer.invoke('dialog:choose-directory'),
  selectDirectory: () => ipcRenderer.invoke('dialog:choose-directory'),
  checkDependencies: () => ipcRenderer.invoke('system:check-dependencies'),
  getDiagnostics: () => ipcRenderer.invoke('system:check-dependencies'),
  runSelfTest: () => ipcRenderer.invoke('system:run-self-test'),
  runRealDownloadDiagnostic: () => ipcRenderer.invoke('media:run-diagnostic-test'),
  downloadBinaries: () => ipcRenderer.invoke('system:install-binaries'),
  getCookieBrowsers: () => ipcRenderer.invoke('system:get-cookie-browsers'),
  setCookieBrowser: (browserId) => ipcRenderer.invoke('system:set-cookie-browser', browserId),
  getCookieStatus: () => ipcRenderer.invoke('system:get-cookie-status'),
  importCookieFile: () => ipcRenderer.invoke('system:import-cookie-file'),
  saveCookieText: (text) => ipcRenderer.invoke('system:save-cookie-text', text),
  clearManualCookies: () => ipcRenderer.invoke('system:clear-manual-cookies'),
  testCookieBridge: (url) => ipcRenderer.invoke('system:test-cookie-bridge', url),
  getDiagnosticsLogs: () => ipcRenderer.invoke('system:get-diagnostics-logs'),
  clearDiagnosticsLogs: () => ipcRenderer.invoke('system:clear-diagnostics-logs'),
  copyToClipboard: (text) => ipcRenderer.invoke('system:copy-to-clipboard', text),
  
  // Context Menu & Tab IPC Bridge
  showContextMenu: (params) => ipcRenderer.invoke('context-menu:show', params),
  onOpenNewTab: (callback) => {
    ipcRenderer.on('browser:open-new-tab', (event, url) => callback(url));
  },
  onOpenMediaStudio: (callback) => {
    ipcRenderer.on('browser:open-media-studio', (event, url) => callback(url));
  },
  
  // Shields & Ad-Blocking IPC
  getShieldsStatus: () => ipcRenderer.invoke('shields:get-status'),
  toggleShields: (enabled) => ipcRenderer.invoke('shields:toggle', enabled),
  onShieldsTally: (callback) => {
    ipcRenderer.on('shields:blocked-tally', (event, data) => callback(data));
  },
  
  // Real-time download progress listener
  onDownloadProgress: (callback) => {
    ipcRenderer.on('media:progress', (event, data) => callback(data));
  }
});

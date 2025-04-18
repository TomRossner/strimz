const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    openDirectoryDialog: async () => await ipcRenderer.invoke('open-directory-dialog'),
    openFolder: (folderPath) => ipcRenderer.send('open-folder', folderPath),
    getDefaultDownloadsPath: async () => await ipcRenderer.invoke('get-default-downloads-path'),
    quitApp: () => ipcRenderer.send('quit-app'),
    restartApp: () => ipcRenderer.send('restart-app'),
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
});
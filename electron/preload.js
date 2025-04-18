const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    openDirectoryDialog: async () => await ipcRenderer.invoke('open-directory-dialog'),
    openFolder: (folderPath) => ipcRenderer.send('open-folder', folderPath),
    getDefaultDownloadsPath: async () => await ipcRenderer.invoke('get-default-downloads-path'),
    quitApp: () => ipcRenderer.send('quit-app'),
    restartApp: () => ipcRenderer.send('restart-app'),
    checkForUpdates: () => ipcRenderer.send('check-for-updates'),
    onCheckingForUpdate: (cb) => ipcRenderer.on('checking-for-update', cb),
    onUpdateAvailable: (cb) => ipcRenderer.on('update-available', cb),
    onUpdateNotAvailable: (cb) => ipcRenderer.on('update-not-available', cb),
    onDownloadProgress: (callback) => ipcRenderer.on('update-download-progress', (event, progress) => callback(progress)),
    onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', cb),
    onUpdateCheckSkipped: (cb) => ipcRenderer.on('update-check-skipped', (e, msg) => cb(msg)),
    onUpdateCheckFailed: (cb) => ipcRenderer.on('update-check-failed', (e, msg) => cb(msg)),
    installUpdateNow: () => ipcRenderer.send('install-update-now'),
});
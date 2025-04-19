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

    offCheckingForUpdate: (cb) => ipcRenderer.removeListener('checking-for-update', cb),
    offUpdateAvailable: (cb) => ipcRenderer.removeListener('update-available', cb),
    offUpdateNotAvailable: (cb) => ipcRenderer.removeListener('update-not-available', cb),
    offUpdateDownloaded: (cb) => ipcRenderer.removeListener('update-downloaded', cb),
    offUpdateCheckSkipped: (cb) => ipcRenderer.removeListener('update-check-skipped', cb),
    offUpdateCheckFailed: (cb) => ipcRenderer.removeListener('update-check-failed', cb),

    ipcRenderer: {
        send: (channel, data) => {
          // whitelist channels
          const validChannels = ['subscribe-to-updates', 'check-for-updates', 'install-update-now', /* others */];
          if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
          }
        },
        on: (channel, func) => {
          ipcRenderer.on(channel, (event, ...args) => func(...args));
        },
        removeAllListeners: (channel) => {
          ipcRenderer.removeAllListeners(channel);
        }
      }
});
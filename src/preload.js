const { contextBridge, ipcRenderer } = require('electron');

const CHANNELS = {
  SUBSCRIBE_TO_UPDATES: 'subscribe-to-updates',
  CHECK_FOR_UPDATES: 'check-for-updates', 
  INSTALL_UPDATE_NOW: 'install-update-now',
  QUIT_APP: 'quit-app',
  RESTART_APP: 'restart-app',
  OPEN_FOLDER: 'open-folder',
  UPDATE_AUTO_INSTALL_SETTING: 'update-auto-install-setting',
  UPDATE_CLEAR_ON_EXIT_SETTING: 'update-clear-on-exit-setting',
  SAVE_SETTING: 'save-setting',
  EXTERNAL_TORRENT: 'external-torrent',
}

contextBridge.exposeInMainWorld('electronAPI', {
  openFolder: (folderPath) => ipcRenderer.send(CHANNELS.OPEN_FOLDER, folderPath),
  quitApp: () => ipcRenderer.send(CHANNELS.QUIT_APP),
  restartApp: () => ipcRenderer.send(CHANNELS.RESTART_APP),
  checkForUpdates: () => ipcRenderer.send(CHANNELS.CHECK_FOR_UPDATES),
  installUpdateNow: () => ipcRenderer.send(CHANNELS.INSTALL_UPDATE_NOW),
  updateAutoInstallSetting: (value) => ipcRenderer.send(CHANNELS.UPDATE_AUTO_INSTALL_SETTING, value),
  updateClearOnExitSetting: (value) => ipcRenderer.send(CHANNELS.UPDATE_CLEAR_ON_EXIT_SETTING, value),
  saveSetting: (key, value) => ipcRenderer.send(CHANNELS.SAVE_SETTING, key, value),
  
  openDirectoryDialog: async () => await ipcRenderer.invoke('open-directory-dialog'),
  openSubtitleFileDialog: async () => await ipcRenderer.invoke('open-subtitle-file-dialog'),
  getDefaultDownloadsPath: async () => await ipcRenderer.invoke('get-default-downloads-path'),
  getAutoInstallSetting: async () => await ipcRenderer.invoke('get-auto-install-setting'),
  getClearOnExitSetting: async () => await ipcRenderer.invoke('get-clear-on-exit-setting'),
  getDownloadsFolderPath: async () => await ipcRenderer.invoke('get-downloads-folder-path'),
  getSettings: async () => await ipcRenderer.invoke('get-settings'),
  checkVpnConnection: async () => await ipcRenderer.invoke('check-vpn-connection'),
  checkDiskSpace: async () => await ipcRenderer.invoke('check-disk-space'),
  readSubtitleFile: async (filePath) => await ipcRenderer.invoke('read-subtitle-file', filePath),

  onCheckingForUpdate: (cb) => ipcRenderer.on('checking-for-update', cb),
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', cb),
  onUpdateNotAvailable: (cb) => ipcRenderer.on('update-not-available', cb),
  onDownloadProgress: (cb) => ipcRenderer.on('update-download-progress', (_, progress) => cb(progress)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', cb),
  onUpdateCheckSkipped: (cb) => ipcRenderer.on('update-check-skipped', (_, msg) => cb(msg)),
  onUpdateCheckFailed: (cb) => ipcRenderer.on('update-check-failed', (_, msg) => cb(msg)),
  onExternalTorrent: (cb) => ipcRenderer.on(CHANNELS.EXTERNAL_TORRENT, (_, filePath) => cb(filePath)),

  offCheckingForUpdate: (cb) => ipcRenderer.removeListener('checking-for-update', cb),
  offUpdateAvailable: (cb) => ipcRenderer.removeListener('update-available', cb),
  offUpdateNotAvailable: (cb) => ipcRenderer.removeListener('update-not-available', cb),
  offUpdateDownloaded: (cb) => ipcRenderer.removeListener('update-downloaded', cb),
  offUpdateCheckSkipped: (cb) => ipcRenderer.removeListener('update-check-skipped', cb),
  offUpdateCheckFailed: (cb) => ipcRenderer.removeListener('update-check-failed', cb),
  offDownloadProgress: (cb) => ipcRenderer.removeListener('update-download-progress', cb),

  ipcRenderer: {
      send: (channel, data) => {
        if (Object.values(CHANNELS).includes(channel)) {
          ipcRenderer.send(channel, data);
        }
      },
      on: (channel, func) => {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      },
      removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
      },
      invoke: async (channel, ...args) => await ipcRenderer.invoke(channel, ...args),
  }
});
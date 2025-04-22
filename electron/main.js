const { app, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const log = require('electron-log');
const { store, DEFAULT_DOWNLOADS_PATH } = require('./store');
const { createMainWindow } = require('./main/window');
const { startBackend, waitForBackendReady } = require('./main/backend');
const { attachUpdateListeners } = require('./main/updater');
const { setupIpcHandlers } = require('./main/ipc-handlers');
const { setupAppLifecycle } = require('./main/lifecycle');
const { clearDownloadFolderAsync, ensureDefaultDownloadPath } = require('./main/utils');
const { autoUpdater } = require('electron-updater');

const isDev = !app.isPackaged;
const nodeBinary = isDev ? process.execPath : path.join(process.resourcesPath, 'node', 'node.exe');
const backendRelativePath = isDev ? './strimz-backend/dist/index.js' : path.join(process.resourcesPath, 'backend', 'index.js');

let backendProcess;

ensureDefaultDownloadPath(store, DEFAULT_DOWNLOADS_PATH);
setupIpcHandlers(ipcMain, store, dialog, shell, autoUpdater);

app.whenReady().then(async () => {
  if (!process.env.IS_BACKEND_PROCESS) {
    log.info("Starting backend...");
    backendProcess = startBackend(nodeBinary, backendRelativePath, isDev);

    try {
      await waitForBackendReady();
      const mainWindow = createMainWindow(isDev);

      if (!isDev) {
        attachUpdateListeners(mainWindow, store);
        autoUpdater.checkForUpdatesAndNotify();
      }
    } catch (err) {
      log.error("Failed to start backend:", err);
      dialog.showErrorBox('Startup Error', 'Backend failed to start.');
      app.quit();
    }
  }
});

setupAppLifecycle(app, backendProcess, store, clearDownloadFolderAsync, DEFAULT_DOWNLOADS_PATH);
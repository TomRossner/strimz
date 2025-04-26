import { app, BrowserWindow, dialog } from 'electron';
import { createMainWindow } from './modules/mainWindow.js';
import { startBackend, waitForBackendReady } from './modules/backend.js';
import { attachIPCHandlers } from './modules/ipcHandlers.js';
import { setupAutoUpdater } from './modules/autoUpdater.js';
import { clearDownloadFolderAsync, ensureDefaultDownloadPath } from './modules/utils.js';
import log from 'electron-log';
import store from './store.js';
import electronUpdater from "electron-updater";

const { autoUpdater } = electronUpdater;
const isDev = !app.isPackaged;

let mainWindow;
let backendProcess;

let updateState = { downloaded: false };

app.whenReady().then(async () => {
  ensureDefaultDownloadPath();
  attachIPCHandlers(isDev);

  if (!process.env.IS_BACKEND_PROCESS) {
    log.info("Starting backend process...");
    backendProcess = startBackend();

    try {
      await waitForBackendReady();
      mainWindow = createMainWindow(isDev);

      if (!isDev) {
        setupAutoUpdater(mainWindow, updateState);
        autoUpdater.autoInstallOnAppQuit = store.get("autoInstallOnQuit");
        log.info("Checking for updates...");
        autoUpdater.checkForUpdatesAndNotify();
      }
    } catch (error) {
      log.error("Error waiting for backend:", error);
      dialog.showErrorBox('Backend Startup Error', 'The backend application failed to start. Please check the logs for more information.');
      app.quit();
    }
  } else {
    log.warn("Running as backend process (this should not happen in main.js).");
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow(isDev);
  });
});

app.on('before-quit', () => {
  if (backendProcess) {
    log.info("Killing backend process...");
    backendProcess.kill();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', async (event) => {
  const downloadsFolderPath = store.get('downloadsFolderPath');
  const shouldClear = store.get('clearOnExit', false);

  const autoInstallOnQuit = store.get('autoInstallOnQuit');
  log.info("Auto install on quit: ", autoInstallOnQuit);

  if (shouldClear && downloadsFolderPath) {
    event.preventDefault();
    try {
      await clearDownloadFolderAsync(downloadsFolderPath);
      
      if (autoInstallOnQuit && updateState.downloaded) {
        autoUpdater.quitAndInstall();
      }
    } finally {
      app.exit();
    }
  }
});
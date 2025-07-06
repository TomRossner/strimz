import { app, BrowserWindow, dialog, globalShortcut } from 'electron';
import { createMainWindow } from './modules/mainWindow.js';
import { startBackend, waitForBackendReady } from './modules/backend.js';
import { attachIPCHandlers } from './modules/ipcHandlers.js';
import { setupAutoUpdater } from './modules/autoUpdater.js';
import { clearDownloadFolderAsync, ensureDefaultDownloadPath } from './modules/utils.js';
import log from 'electron-log';
import store from './store.js';
import electronUpdater from "electron-updater";

app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-direct-composition');
app.commandLine.appendSwitch('enable-features', 'DirectCompositionOverlays');

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

      const torrentArg = process.argv.find(arg => arg.endsWith(".torrent"));

      if (torrentArg) {
        const win = mainWindow;

        win.webContents.once('dom-ready', () => {
          const timeout = setTimeout(() => {
            win.webContents.send('external-torrent', torrentArg);
            clearTimeout(timeout);
          }, 2000);
        });
      }

      if (!isDev) {
        setupAutoUpdater(mainWindow, updateState);
        autoUpdater.autoInstallOnAppQuit = store.get("autoInstallOnQuit");
        log.info("Checking for updates...");
        autoUpdater.checkForUpdatesAndNotify();
      } else {
        globalShortcut.register('CommandOrControl+Shift+G', () => {
          const gpuWindow = new BrowserWindow({
            width: 900,
            height: 700,
          });

          gpuWindow.loadURL('chrome://gpu');
        });
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
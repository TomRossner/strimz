const http = require('http');
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require("path");
const { autoUpdater } = require("electron-updater");
const { spawn } = require("child_process");
const log = require('electron-log');

// ===========================
// Config
// ===========================

const isDev = !app.isPackaged;

const nodeBinary = isDev
  ? process.execPath
  : path.join(process.resourcesPath, 'node', 'node.exe');

const backendRelativePath = isDev ? './strimz-backend/dist/index.js' : path.join(process.resourcesPath, 'backend', 'index.js');

let mainWindow;
let backendProcess;

let currentDialog = null;

async function showSingleDialog(options) {
  if (currentDialog) {
    try {
      currentDialog.close();
    } catch (err) {
      log.error(err);
    }
  }

  const focusedWindow = BrowserWindow.getFocusedWindow();

  currentDialog = dialog.showMessageBox(focusedWindow, options);
  await currentDialog;
  currentDialog = null;
}

// ===========================
// Create Main Window
// ===========================
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, "assets", "strimzicon.ico"),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: !isDev,
  });

  const url = isDev
    ? 'http://localhost:5173'
    : `file://${path.resolve(__dirname, '../strimz-client/dist/index.html')}`;

  mainWindow.loadURL(url);

  mainWindow.on("ready-to-show", () => mainWindow.show());

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`Failed to load: ${errorDescription}`);
  });

  return mainWindow;
}

// ===========================
// Launch Backend Process
// ===========================

async function waitForBackendReady(retries = 20, interval = 500) {
  return new Promise((resolve, reject) => {
    const check = () => {
      http.get('http://localhost:3003/api/ping', res => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          retry();
        }
      }).on('error', retry);
    };

    const retry = () => {
      if (--retries === 0) return reject(new Error('Backend not ready after multiple retries.'));
      setTimeout(check, interval);
    };

    check();
  });
}

function startBackend() {
  backendProcess = spawn(
    nodeBinary,
    [backendRelativePath],
    {
      stdio: 'pipe',
      detached: false,
      env: {
        ...process.env,
        IS_BACKEND_PROCESS: 'true',
        PORT: '3003',
      },
    }
  );

  backendProcess.on('error', (err) => {
    log.error("Backend Process Error:", err);
    console.error("Backend Process Error:", err);
  });

  backendProcess.stderr.on("data", (data) => {
    console.error(`[Backend STDERR]: ${data.toString().trim()}`);
    log.error(`[Backend STDERR]: ${data.toString().trim()}`);
  });
}


// ===========================
// Auto Updater
// ===========================
autoUpdater.on('update-available', async () => {
  log.info("New update available");
  
  log.info("autoDownload: ", autoUpdater.autoDownload);
  if (!autoUpdater.autoDownload) {
    autoUpdater.downloadUpdate();
  }

  const result = await dialog.showMessageBox(focusedWindow, {
    type: 'info',
    title: 'Update available',
    message: 'A new update is available. Do you want to install it now?',
    buttons: ['Install now', 'Later'],
    defaultId: 0,
    cancelId: 1,
  });

  mainWindow.webContents.send('update-available');

  if (result.response === 0) {
    autoUpdater.quitAndInstall();
  } else {
    log.info("User chose to install later.");
  }

});

// ===========================
// IPC Handlers
// ===========================
ipcMain.on('check-for-updates', (event) => {
  const win = BrowserWindow.getFocusedWindow();

  if (isDev) {
    console.log('Skipping update check: app is in development');
    win.webContents.send('update-check-skipped', 'Update check skipped in development mode.');
    return;
  }

  win.webContents.send('checking-for-update');

  autoUpdater.checkForUpdates().catch((err) => {
    console.error('Error while checking for updates:', err);
    win.webContents.send('update-check-failed', err.message || 'Unknown error');
  });
});

// From autoUpdater to renderer
autoUpdater.on('checking-for-update', () => {
  mainWindow.webContents.send('checking-for-update');
});

autoUpdater.on('update-not-available', () => {
  mainWindow.webContents.send('update-not-available');
});

autoUpdater.on('download-progress', (progress) => {
  const win = BrowserWindow.getFocusedWindow();

  const prog = {
    percent: progress.percent,
    transferred: progress.transferred,
    total: progress.total,
    bytesPerSecond: progress.bytesPerSecond,
  }

  log.info(`Downloading - ${prog.percent.toFixed(1)}%`);

  win.webContents.send('update-download-progress', prog);
});

autoUpdater.on('update-downloaded', async () => {
  const win = BrowserWindow.getFocusedWindow();
  log.info("Update downloaded");

  win.webContents.send('update-downloaded');

  const result = await dialog.showMessageBox(win, {
    type: 'info',
    title: 'Update ready',
    message: 'The update has been downloaded. Do you want to install it now?',
    buttons: ['Install now', 'Later'],
    defaultId: 0,
    cancelId: 1,
  });

  if (result.response === 0) {
    autoUpdater.quitAndInstall();
  } else {
    log.info("User chose to install later.");
  }
});

ipcMain.handle('open-directory-dialog', async () => {
  const res = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });

  return res.canceled ? null : res.filePaths[0];
});

ipcMain.handle('get-default-downloads-path', () => {
  return app.getPath('downloads');
});

ipcMain.on('open-folder', (event, folderPath) => {
  if (folderPath) shell.openPath(folderPath);
});

ipcMain.on('quit-app', () => {
  app.quit();
});

ipcMain.on('restart-app', () => {
  app.relaunch();
  app.exit();
});

ipcMain.on('install-update-now', () => {
  console.log('Installing update and quitting...');
  autoUpdater.quitAndInstall();
});

// ===========================
// App Lifecycle
// ===========================
app.whenReady().then(async () => {
  if (!process.env.IS_BACKEND_PROCESS) {
    console.log("Starting backend process...");
    log.info("Starting backend process...");
    startBackend();

    try {
      await waitForBackendReady();
      createMainWindow();
      if (!isDev) {
        log.info("Checking for updates...");
        autoUpdater.checkForUpdatesAndNotify();
      }
    } catch (error) {
      console.error("Error waiting for backend:", error);
      log.error("Error waiting for backend:", error);

      dialog.showErrorBox('Backend Startup Error', 'The backend application failed to start. Please check the logs for more information.');
      app.quit();
    }
  } else {
    console.log("Running as backend process (this should not happen in main.js).");
    log.warn("Running as backend process (this should not happen in main.js).");
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('before-quit', () => {
  if (backendProcess) {
    console.log("Killing backend process...");
    log.info("Killing backend process...");
    backendProcess.kill();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
const http = require('http');
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require("path");
const fs = require("fs");
const fsPromises = require("fs/promises");
const { autoUpdater } = require("electron-updater");
const { spawn } = require("child_process");
const log = require('electron-log');
const { store, DEFAULT_DOWNLOADS_PATH } = require("./store");

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
      shell: false,
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

  if (isDev) {
    backendProcess.stdout.on("data", (data) => {
      console.log(`[Backend STDOUT]: ${data.toString().trim()}`);
      log.info(`[Backend STDOUT]: ${data.toString().trim()}`);
    });
  }
}


// ===========================
// Auto Updater
// ===========================
function attachUpdateListeners(win) {
  autoUpdater.setFeedURL({
    provider: "github",
    owner: "TomRossner",
    repo: "strimz",
  });

  autoUpdater.on('update-available', async () => {
    log.info("New update available");

    win.webContents.send('update-available');
    
    if (!autoUpdater.autoDownload) {
      autoUpdater.downloadUpdate();
    }

    const result = await dialog.showMessageBox(win, {
      type: 'info',
      title: 'Update available',
      message: 'A new update is available. Do you want to install it now?',
      buttons: ['Install now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });
  
    if (result.response === 0) {
      setTimeout(() => {
        autoUpdater.quitAndInstall();
      }, 1000);
    } else {
      log.info("User chose to install later.");
    }
  });
  
  autoUpdater.on('checking-for-update', () => {
    win.webContents.send('checking-for-update');
  });
  
  autoUpdater.on('update-not-available', () => {
    win.webContents.send('update-not-available');
  });
  
  autoUpdater.on('download-progress', (progressData) => {
    log.info(`Downloading - ${progressData.percent.toFixed(1)}%`);
    
    win.webContents.send('update-download-progress', progressData);
  });
  
  autoUpdater.on('update-downloaded', () => {
    log.info("Update downloaded");
  
    win.webContents.send('update-downloaded');
  });
  
  autoUpdater.on('error', (error) => {
    log.error('Auto updater error:', error);
  });
}

// ===========================
// IPC Handlers
// ===========================

ipcMain.handle('get-auto-install-setting', () => {
  return store.get("autoInstallOnQuit");
});

ipcMain.handle('get-clear-on-exit-setting', () => {
  return store.get("clearOnExit");
});

ipcMain.handle('open-directory-dialog', async () => {
  const res = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });

  if (res.canceled || res.filePaths.length === 0) return null;

  const selectedPath = res.filePaths[0];
  const isStrimzAlready = path.basename(selectedPath).toLowerCase() === 'strimz';

  const finalPath = isStrimzAlready
    ? selectedPath
    : path.join(selectedPath, 'strimz');

  if (!fs.existsSync(finalPath)) {
    fs.mkdirSync(finalPath, { recursive: true });
  }

  store.set('downloadsFolderPath', finalPath);

  return finalPath;
});

ipcMain.handle('get-downloads-folder-path', () => {
  return store.get('downloadsFolderPath');
});

ipcMain.handle('get-default-downloads-path', () => {
  if (!fs.existsSync(DEFAULT_DOWNLOADS_PATH)) {
    fs.mkdirSync(DEFAULT_DOWNLOADS_PATH, { recursive: true });
  }

  return DEFAULT_DOWNLOADS_PATH;
});

ipcMain.handle('get-settings', () => {
  return store.store;
});

ipcMain.on('save-setting', (event, key, value) => {
  store.set(key, value);
});

ipcMain.on("update-auto-install-setting", (event, value) => {
  store.set("autoInstallOnQuit", value);
  autoUpdater.autoInstallOnAppQuit = value;
});

ipcMain.on("update-clear-on-exit-setting", (event, value) => {
  store.set("clearOnExit", value);
});

ipcMain.on('subscribe-to-updates', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  attachUpdateListeners(win);
});

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

  setTimeout(() => {
    autoUpdater.quitAndInstall();
  }, 1000);
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
        autoUpdater.autoInstallOnAppQuit = store.get("autoInstallOnQuit");

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

app.on('will-quit', async (event) => {
  const downloadsFolderPath = store.get('downloadsFolderPath', DEFAULT_DOWNLOADS_PATH);
  const shouldClear = store.get('clearOnExit', false);

  if (!shouldClear || !downloadsFolderPath) return;

  event.preventDefault();

  try {
    await clearDownloadFolderAsync(downloadsFolderPath);
  } finally {
    app.exit();
  }
});

async function clearDownloadFolderAsync(folderPath) {
  try {
    const files = await fsPromises.readdir(folderPath);

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stat = await fsPromises.lstat(filePath);

      if (stat.isDirectory()) {
        await fsPromises.rm(filePath, { recursive: true, force: true });
      } else {
        await fsPromises.unlink(filePath);
      }
    }
  } catch (err) {
    console.error('Error clearing folder:', err);
    log.error('Error clearing folder:', err);
  }
}

function ensureDefaultDownloadPath() {
  if (!fs.existsSync(DEFAULT_DOWNLOADS_PATH)) {
    fs.mkdirSync(DEFAULT_DOWNLOADS_PATH, { recursive: true });
  }

  if (!store.get('downloadsFolderPath')) {
    store.set('downloadsFolderPath', DEFAULT_DOWNLOADS_PATH);
  }
}

ensureDefaultDownloadPath();
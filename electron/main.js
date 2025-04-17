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
autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall();
});

// ===========================
// IPC Handlers
// ===========================
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
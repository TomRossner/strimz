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
const backendRelativePath = isDev
  ? path.join(__dirname, '../strimz-backend/dist/index.js')
  : path.join(process.resourcesPath, 'backend/index.js');

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
  });

  const url = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../strimz-client/dist/index.html')}`;

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

function waitForBackendReady(retries = 20, interval = 500) {
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
      if (--retries === 0) return reject(new Error('Backend not ready'));
      setTimeout(check, interval);
    };

    check();
  });
}

function startBackend() {
  backendProcess = spawn(
    process.execPath,
    [backendRelativePath],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        IS_BACKEND_PROCESS: 'true',
        PORT: '3003',
      },
    }
  );
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
  console.log("Is BE process: ", process.env.IS_BACKEND_PROCESS)
  if (process.env.IS_BACKEND_PROCESS === undefined && !isDev) {
    console.log("Starting backend")
    startBackend();
    await waitForBackendReady();
  }

  createMainWindow();
  
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('before-quit', () => {
  if (backendProcess) backendProcess.kill();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});



log.info('App starting...');
log.error('Something failed');
log.debug('backendRelativePath =', backendRelativePath);
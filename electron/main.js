const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require("path");
const { autoUpdater } = require("electron-updater");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, "assets", "strimzicon.ico"),
    webPreferences: {
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  const isDev = !app.isPackaged;
  // const frontendUrl = isDev
  //   ? 'http://localhost:3000'
  //   : `file://${__dirname}/strimz-frontend/out/index.html`;

  // mainWindow.loadURL('http://localhost:3000');

  mainWindow.on("ready-to-show", () => mainWindow.show());

  const loadURL = async () => {
    if (isDev) {
      mainWindow.loadURL("http://localhost:5147");
    } else {
      try {
        require(path.join(__dirname, '../strimz-backend/dist/index.js'));
        const port = await startNextJSServer();
        console.log("Next.js server started on port:", port);
        mainWindow.loadURL(`http://localhost:${port}`);
      } catch (error) {
        console.error("Error starting Next.js server:", error);
      }
    }
  };

  loadURL();
  return mainWindow;
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  autoUpdater.checkForUpdatesAndNotify();
});

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});


ipcMain.handle('open-directory-dialog', async () => {
  const res = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });

  if (res.canceled) {
    return null;
  }

  return res.filePaths[0];
});

ipcMain.on('open-folder', (event, folderPath) => {
  if (folderPath) {
    shell.openPath(folderPath);
  }
});

ipcMain.handle('get-default-downloads-path', () => {
  return app.getPath('downloads');
});

ipcMain.on('quit-app', () => {
  app.quit();
});

ipcMain.on('restart-app', () => {
  app.relaunch();
  app.exit();
});

const startNextJSServer = async () => {
  try {
    const nextJSPort = 3000;
    const webDir = path.join(app.getAppPath(), "frontend");

    await startServer({
      dir: webDir,
      isDev: false,
      hostname: "localhost",
      port: nextJSPort,
      customServer: true,
      allowRetry: false,
      keepAliveTimeout: 5000,
      minimalMode: true,
    });

    return nextJSPort;
  } catch (error) {
    console.error("Error starting Next.js server:", error);
    throw error;
  }
};
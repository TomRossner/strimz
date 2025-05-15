import { ipcMain, dialog, shell, BrowserWindow, app } from 'electron';
import store from '../store.js';
import path from 'path';
import fs from 'fs';
import { DEFAULT_DOWNLOADS_PATH } from '../constants.js';
import electronUpdater from 'electron-updater';
import { setupAutoUpdater } from './autoUpdater.js';
import { checkVpn } from './checkVpn.js';
import { checkDisk } from './checkDiskSpace.js';

const { autoUpdater } = electronUpdater;

export function attachIPCHandlers(isDev) {
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
  
  ipcMain.handle('check-vpn-connection', () => {
    return checkVpn(isDev);
  });
  
  ipcMain.handle('check-disk-space', () => {
    return checkDisk(store.get('downloadsFolderPath'));
  });

  ipcMain.on('subscribe-to-updates', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    setupAutoUpdater(win);
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
}
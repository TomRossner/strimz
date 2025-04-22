const { autoUpdater } = require("electron-updater");
const { dialog } = require("electron");
const log = require('electron-log');

function attachUpdateListeners(win, store) {
  autoUpdater.setFeedURL({
    provider: "github",
    owner: "TomRossner",
    repo: "strimz",
  });

  autoUpdater.autoInstallOnAppQuit = store.get("autoInstallOnQuit");

  autoUpdater.on('update-available', async () => {
    win.webContents.send('update-available');
    
    if (!autoUpdater.autoDownload) autoUpdater.downloadUpdate();

    const { response } = await dialog.showMessageBox(win, {
      type: 'info',
      title: 'Update available',
      message: 'A new update is available. Do you want to install it now?',
      buttons: ['Install now', 'Later'],
    });

    if (response === 0) setTimeout(() => autoUpdater.quitAndInstall(), 1000);
  });

  autoUpdater.on('checking-for-update', () => win.webContents.send('checking-for-update'));
  autoUpdater.on('update-not-available', () => win.webContents.send('update-not-available'));
  autoUpdater.on('update-downloaded', () => win.webContents.send('update-downloaded'));

  autoUpdater.on('download-progress', (progress) => {
    win.webContents.send('update-download-progress', progress);
  });

  autoUpdater.on('error', error => log.error('Auto updater error:', error));
}

module.exports = { attachUpdateListeners };

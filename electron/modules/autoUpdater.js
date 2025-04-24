import electronUpdater from 'electron-updater';
import { dialog } from 'electron';
import log from 'electron-log';

const { autoUpdater } = electronUpdater;

export function setupAutoUpdater(win) {
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
import electronUpdater from 'electron-updater';
import log from 'electron-log';

const { autoUpdater } = electronUpdater;

export function setupAutoUpdater(win, updateState) {
  autoUpdater.removeAllListeners();

  const send = (channel, ...args) => {
    if (!win.isDestroyed()) win.webContents.send(channel, ...args);
  };

  autoUpdater.on('update-available', () => {
    log.info("New update available");
    if (updateState) updateState.available = true;
    send('update-available');

    if (!autoUpdater.autoDownload) {
      autoUpdater.downloadUpdate();
    }
  });

  autoUpdater.on('checking-for-update', () => {
    send('checking-for-update');
  });

  autoUpdater.on('update-not-available', () => {
    send('update-not-available');
  });

  autoUpdater.on('download-progress', (progressData) => {
    log.info(`Downloading - ${progressData.percent.toFixed(1)}%`);
    send('update-download-progress', progressData);
  });

  autoUpdater.on('update-downloaded', () => {
    log.info("Update downloaded");
    if (updateState) updateState.downloaded = true;
    send('update-downloaded');
  });

  autoUpdater.on('error', (error) => {
    log.error('Auto updater error:', error);
    send('update-check-failed', error?.message || 'Update check failed');
  });

  // The startup check can finish before the renderer subscribes: replay what is already known.
  if (updateState?.downloaded) {
    send('update-downloaded');
  } else if (updateState?.available) {
    send('update-available');
  }
}

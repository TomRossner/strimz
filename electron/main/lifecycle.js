const { createMainWindow } = require('./window');

function setupAppLifecycle(app, backendProcess, store, clearDownloadFolderAsync, DEFAULT_DOWNLOADS_PATH) {
    app.on('before-quit', () => backendProcess?.kill());
  
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit();
    });
  
    app.on('will-quit', async (event) => {
      const path = store.get('downloadsFolderPath', DEFAULT_DOWNLOADS_PATH);
      if (!store.get('clearOnExit') || !path) return;
  
      event.preventDefault();

      await clearDownloadFolderAsync(path);
      
      app.exit();
    });
  
    app.on('activate', () => {
      if (require('electron').BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
}
  
module.exports = { setupAppLifecycle };
  
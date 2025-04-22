const fs = require("fs");
const fsPromises = require("fs/promises");

async function clearDownloadFolderAsync(folderPath) {
  try {
    const files = await fsPromises.readdir(folderPath);
    
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stat = await fsPromises.lstat(filePath);

      stat.isDirectory()
        ? await fsPromises.rm(filePath, { recursive: true, force: true })
        : await fsPromises.unlink(filePath);
    }
  } catch (err) {
    console.error('Error clearing folder:', err);
  }
}

function ensureDefaultDownloadPath(store, defaultPath) {
    if (!fs.existsSync(defaultPath)) {
        fs.mkdirSync(defaultPath, { recursive: true });
    }

    if (!store.get('downloadsFolderPath')) {
        store.set('downloadsFolderPath', defaultPath);
    }
}

module.exports = { clearDownloadFolderAsync, ensureDefaultDownloadPath };

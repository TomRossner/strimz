import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { DEFAULT_DOWNLOADS_PATH } from '../constants.js';
import store from '../store.js';
import log from 'electron-log';

export function ensureDefaultDownloadPath() {
  if (!fs.existsSync(DEFAULT_DOWNLOADS_PATH)) {
    fs.mkdirSync(DEFAULT_DOWNLOADS_PATH, { recursive: true });
  }

  if (!store.get('downloadsFolderPath')) {
    store.set('downloadsFolderPath', DEFAULT_DOWNLOADS_PATH);
  }
}

export async function clearDownloadFolderAsync(folderPath) {
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
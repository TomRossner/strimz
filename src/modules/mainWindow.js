import { BrowserWindow } from 'electron';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { CLIENT_URL } from '../constants.js';
import { getServerUrl } from './staticServer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createMainWindow(isDev) {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, "..", "assets", "strimzicon.ico"),
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: !isDev,
  });

  let url;
  if (isDev) {
    url = CLIENT_URL;
  } else {
    // Use HTTP server in production to fix YouTube embed referrer issues
    const serverUrl = getServerUrl();
    if (serverUrl) {
      url = serverUrl;
    } else {
      // Fallback to file:// if server not ready yet
      url = `file://${path.resolve(__dirname, '../../strimz-client/dist/index.html')}`;
    }
  }

  mainWindow.loadURL(url);

  mainWindow.on("ready-to-show", () => mainWindow.show());

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`Failed to load: ${errorDescription}`);
  });

  return mainWindow;
}
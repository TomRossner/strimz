import ElectronStore from "electron-store";
import { DEFAULT_DOWNLOADS_PATH } from "./constants.js";

const store = new ElectronStore({
    defaults: {
        downloadsFolderPath: DEFAULT_DOWNLOADS_PATH,
        // Empty means "<downloadsFolderPath>/subtitles"
        subtitlesFolderPath: '',
        autoInstallOnQuit: false,
        clearOnExit: false,
        loadOnScroll: false,
        maxConcurrentDownloads: 2,
        maxDownloadKbps: 0,
        maxUploadKbps: 0,
        maxConnections: 55,
        hardwareAcceleration: true,
        reopenLastTitle: false,
        alwaysOnTop: false,
    },
});

// Settings that were removed from the app
for (const key of ['startMinimized', 'closeToTray']) {
    if (store.has(key)) store.delete(key);
}

export default store;
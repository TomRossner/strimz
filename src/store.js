import ElectronStore from "electron-store";
import { DEFAULT_DOWNLOADS_PATH } from "./constants.js";

const store = new ElectronStore({
    defaults: {
        downloadsFolderPath: DEFAULT_DOWNLOADS_PATH,
        autoInstallOnQuit: false,
        clearOnExit: false,
        loadOnScroll: false,
        maxConcurrentDownloads: 2,
        maxDownloadKbps: 0,
        maxUploadKbps: 0,
        maxConnections: 55,
        hardwareAcceleration: true,
        startMinimized: false,
        reopenLastTitle: false,
        closeToTray: false,
        alwaysOnTop: false,
    },
});

export default store;
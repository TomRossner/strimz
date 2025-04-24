import ElectronStore from "electron-store";
import { DEFAULT_DOWNLOADS_PATH } from "./constants.js";

const store = new ElectronStore({
    defaults: {
        downloadsFolderPath: DEFAULT_DOWNLOADS_PATH,
        autoInstallOnQuit: false,
        clearOnExit: false,
        loadOnScroll: false,
        theme: 'dark',
    },
});

export default store;
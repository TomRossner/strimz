const Store = require("electron-store").default;
const path = require("path");
const { app } = require("electron");

const DEFAULT_DOWNLOADS_PATH = path.join(app.getPath('downloads'), 'strimz');

const store = new Store({
    defaults: {
        downloadsFolderPath: DEFAULT_DOWNLOADS_PATH,
        autoInstallOnQuit: false,
        clearOnExit: false,
        loadOnScroll: false,
        theme: 'dark',
    },
});

module.exports = {
    store,
    DEFAULT_DOWNLOADS_PATH,
}
import { app } from "electron";
import path from "path";

const DEFAULT_DOWNLOADS_PATH = path.join(app.getPath('downloads'), 'strimz');

export {
    DEFAULT_DOWNLOADS_PATH,
}
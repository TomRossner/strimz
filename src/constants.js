import { app } from "electron";
import path from "path";

const BACKEND_PORT = 3003;
const API_URL = `http://localhost:${BACKEND_PORT}/api`;
const CLIENT_URL = 'http://localhost:5173';
const DEFAULT_DOWNLOADS_PATH = path.join(app.getPath('downloads'), 'strimz');

export {
    BACKEND_PORT,
    API_URL,
    CLIENT_URL,
    DEFAULT_DOWNLOADS_PATH,
}
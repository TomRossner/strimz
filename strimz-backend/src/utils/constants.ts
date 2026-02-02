import path from "path";
import os from "os";
import { Limits } from "../yts/yts.js";
import { config } from "dotenv";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { dirname } from "path";
import { fileURLToPath } from "url";
config({ path: path.join(__dirname, "../../.env") });

const PAGE_NUMBER: number = 1;

const FETCH_LIMIT: number = Limits.MAX; // 50 IS THE MAX VALUE

const CATEGORIES: {[key: string]: string} = {
    TITLE: 'title',
    YEAR: 'year',
    RATING: 'rating',
    PEERS: 'peers',
    SEEDS: 'seeds',
    DOWNLOAD_COUNT: 'download_count',
    LIKE_COUNT: 'like_count',
    DATE_ADDED: 'date_added'
}

const QUALITIES: {[key: string | number]: string} = {
    'ALL': 'All',
    '720P': '720p',
    '1080P': '1080p',
    '2160P': '2160p',
    '3D': '3D'
}

const TRACKERS: {[key: string]: string} = {
    tracker1: 'udp://open.demonii.com:1337/announce',
    tracker2: 'udp://tracker.openbittorrent.com:80',
    tracker3: 'udp://tracker.coppersurfer.tk:6969',
    tracker4: 'udp://glotorrents.pw:6969/announce',
    tracker5: 'udp://tracker.opentrackr.org:1337/announce',
    tracker6: 'udp://torrent.gresille.org:80/announce',
    tracker7: 'udp://p4p.arenabg.com:1337',
    tracker8: 'udp://tracker.leechers-paradise.org:6969'
}

enum VideoExtensions {
    MP4 = '.mp4',
    MKV = '.mkv'
}

const BYTE_SIZE: number = 1_048_576; // Bytes

const CLIENT_URL: string = process.env.CLIENT_URL as string;

const BASE_DIR = path.join(os.homedir(), "Downloads", "strimz");

const MIN_TORRENT_PROGRESS: number = 0.15;

const TMDB_BASE: string = process.env.TMDB_BASE as string;
const TMDB_API_KEY: string = process.env.TMDB_API_KEY as string;
const TMDB_READ_ACCESS_TOKEN: string = process.env.TMDB_READ_ACCESS_TOKEN as string;

export {
    BYTE_SIZE,
    CATEGORIES,
    CLIENT_URL,
    FETCH_LIMIT,
    PAGE_NUMBER,
    QUALITIES,
    TRACKERS,
    VideoExtensions,
    BASE_DIR,
    MIN_TORRENT_PROGRESS,
    TMDB_BASE,
    TMDB_API_KEY,
    TMDB_READ_ACCESS_TOKEN,
}
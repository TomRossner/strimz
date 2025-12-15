import { config } from "dotenv";
config();

export const YTS_API_URLS: string[] = [
    'https://yts.lt/api/v2/',
    'https://yts.unblockninja.com/api/v2/',
]

export const YTS_BASE_URL: string = YTS_API_URLS[0];
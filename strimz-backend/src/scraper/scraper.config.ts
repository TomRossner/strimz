import { config } from "dotenv";
config();

export const YTS_BASE_URL: string = process.env.YTS_URL as string || 'https://yts.mx/api/v2/';
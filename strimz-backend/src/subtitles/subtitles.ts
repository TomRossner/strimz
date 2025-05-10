import {config} from "dotenv";
config();
import axios from "axios";

export const searchSubtitles = async (id: string, lang: string) => {
    const options = {
        method: 'GET',
        url: process.env.SUBTITLES_API_URL,
        params: {
            imdb_id: id,
            languages: lang
        },
        headers: {
          'x-rapidapi-key': process.env.SUBTITLES_API_KEY,
          'x-rapidapi-host': process.env.SUBTITLES_API_HOST,
        }
    }

    return await axios.request(options);
}
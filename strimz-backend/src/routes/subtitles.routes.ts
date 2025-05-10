import { Router } from "express";
import { searchSubtitles } from "../subtitles/subtitles.js";

const subtitlesRouter = Router();

subtitlesRouter.get('/', async (req, res) => {
    try {
        const {imdb_code, language} = req.query;

        if (!imdb_code) return res.status(400).json("IMDb code not provided");

        const response = await searchSubtitles(imdb_code as string, language as string);

        console.log(response.data);
        res.status(200).json(response.data);
    } catch (error) {
        console.error(error);
        res.status(400).json("Subtitles search failed");
    }
});

export default subtitlesRouter;
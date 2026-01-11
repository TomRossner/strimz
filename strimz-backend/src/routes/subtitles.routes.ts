import { Router } from "express";
import { searchSubtitlesByImdb, downloadSubtitleFromOpenSubtitlesApi } from "../controllers/subtitles.controller.js";

const subtitlesRouter = Router();

subtitlesRouter.get('/search-by-imdb', searchSubtitlesByImdb);
subtitlesRouter.post('/download-from-api', downloadSubtitleFromOpenSubtitlesApi);

export default subtitlesRouter;
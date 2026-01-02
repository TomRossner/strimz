import { Router } from "express";
import { checkAvailability, downloadSubtitles, fetchAvailableSubtitles } from "../controllers/subtitles.controller.js";

const subtitlesRouter = Router();

subtitlesRouter.get('/fetch-available-subtitles', fetchAvailableSubtitles);
subtitlesRouter.post('/download-subtitles', downloadSubtitles);
subtitlesRouter.post('/check-availability', checkAvailability);

export default subtitlesRouter;
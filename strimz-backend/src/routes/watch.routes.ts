
import { Router } from "express";
import { handleTorrentFromPath, pauseMovieStream, watchMovieStream } from "../controllers/watch.controller.js";

const WatchRouter = Router();

WatchRouter.get('/:slug', watchMovieStream);
WatchRouter.post('/get-torrent-data', handleTorrentFromPath);
WatchRouter.post('/pause/:hash', pauseMovieStream);

export default WatchRouter;
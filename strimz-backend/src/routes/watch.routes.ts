
import { Router } from "express";
import { pauseMovieStream, watchMovieStream } from "../controllers/watch.controller.js";

const WatchRouter = Router();

WatchRouter.get('/:slug', watchMovieStream);
WatchRouter.post('/pause/:hash', pauseMovieStream);

export default WatchRouter;
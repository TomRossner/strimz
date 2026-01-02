import { Router } from "express";
import { handleNewTorrent } from "../controllers/stream.controller.js";

const torrentsRouter = Router();

torrentsRouter.get('/:slug', handleNewTorrent);

export default torrentsRouter;
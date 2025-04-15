import { Router } from "express";
import { watchMovieStatus } from "../controllers/watch.controller.js";

const sseRouter = Router();

sseRouter.get('/status/:slug', watchMovieStatus);

export default sseRouter;
import express from 'express';
import { getCast, getMovies, searchMovies } from "../controllers/movies.controller.js";

const moviesRouter = express.Router();

moviesRouter.get('/', searchMovies);
moviesRouter.post('/', getMovies);
moviesRouter.get('/:movieId/cast', getCast);

export default moviesRouter;
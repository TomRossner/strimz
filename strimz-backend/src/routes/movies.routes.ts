import express from 'express';
import { getCast, getMovies, searchMovies } from "../controllers/movies.controller.js";

const MoviesRouter = express.Router();

MoviesRouter.get('/', searchMovies);
MoviesRouter.post('/', getMovies);
MoviesRouter.get('/:movieId/cast', getCast);

export default MoviesRouter;
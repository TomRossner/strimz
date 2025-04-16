import express from 'express';
import { getCast, searchMovies } from "../controllers/movies.controller.js";

const MoviesRouter = express.Router();

MoviesRouter.get('/', searchMovies);
MoviesRouter.get('/:movieId/cast', getCast);

export default MoviesRouter;
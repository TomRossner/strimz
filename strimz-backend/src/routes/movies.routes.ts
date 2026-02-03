import express from 'express';
import { getCast, getMovieMetadata, getMovies, searchMovies } from "../controllers/movies.controller.js";

const moviesRouter = express.Router();

moviesRouter.get('/', searchMovies);
moviesRouter.post('/', getMovies);
moviesRouter.get('/metadata/:imdbCode', getMovieMetadata);
moviesRouter.get('/credits/:imdbCode', getCast);

export default moviesRouter;
import express from 'express';
import { getCast, getMovieMetadata, getMovies, getMoviesInTheatres, searchMovies } from "../controllers/movies.controller.js";

const moviesRouter = express.Router();

moviesRouter.get('/', searchMovies);
moviesRouter.get('/in-theatres', getMoviesInTheatres);
moviesRouter.post('/', getMovies);
moviesRouter.get('/metadata/:imdbCode', getMovieMetadata);
moviesRouter.get('/credits/:imdbCode', getCast);

export default moviesRouter;
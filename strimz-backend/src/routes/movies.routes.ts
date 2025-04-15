import express from 'express';
import {
    getCast,
    handleFetchMovies,
    // handleStream,
    searchMovies,
} from "../controllers/movies.controllers.js";

const MoviesRouter = express.Router();

// MoviesRouter.get('/', handleFetchMovies);
MoviesRouter.get('/', searchMovies);
// MoviesRouter.get(`/:movieId`, handleStream);
MoviesRouter.get('/:movieId/cast', getCast);

export default MoviesRouter;
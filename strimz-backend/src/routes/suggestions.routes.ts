import express from 'express';
import { getMovieSuggestions } from '../controllers/suggestions.controller.js';

const suggestionsRouter = express.Router();

suggestionsRouter.get('/:movieId', getMovieSuggestions);

export default suggestionsRouter;



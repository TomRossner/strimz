import { Request, Response } from "express";
import { Filters, getAllMovies, getMovieCast } from "../scraper/scraper.js";
import { FETCH_LIMIT, PAGE_NUMBER } from "../utils/constants.js";
import { yts } from "../yts/yts.js";
import { getCorrected } from "../utils/spell.js";

export const getCast = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const {movieId} = req.params;

        const {
            data: {
                movie: {
                    cast,
                }
            }
        } = await getMovieCast(movieId);

        return res.status(200).send(cast);
    } catch (error) {
        return res.status(400).send({error: 'Failed fetching cast and images'});
    }
}

export const handleFetchMovies = async (req: Request, res: Response): Promise<void | Response<any, Record<string, any>>> => {
    try {
        const {genre, sortBy, orderBy} = req.query;

        const languages = Array.isArray(req.query.languages) ? req.query.languages : [];

        const languagesMap = new Map();

        for (const lang of languages) {
            if (!languagesMap.has(lang)) {
                languagesMap.set(lang, true);
            }
        }

        const minRating = req.query.minRating ? parseInt(req.query.minRating.toString()) : 0;
        const page = req.query.pageNum ? parseInt(req.query.pageNum.toString()) : PAGE_NUMBER;
        const limit = req.query.fetchLimit ? parseInt(req.query.fetchLimit.toString()) : FETCH_LIMIT;
        const query_term = req.query.query_term;

        const filters: Filters = {
            genre: genre as string,
            minRating,
            orderBy: orderBy as string,
            sortBy: sortBy as string
        }

        if (!filters) {
            return res.sendStatus(400);
        }
        
        const moviesResponseObject = await getAllMovies(filters, page, limit, query_term as string);

        const filteredMovies = moviesResponseObject.data.movies.filter(
            (m: Record<string, unknown>) => languagesMap.has(m.language)
        );

        res.status(200).send({
            ...moviesResponseObject,
            data: {
                ...moviesResponseObject.data,
                movies: filteredMovies.length ? filteredMovies : moviesResponseObject.data.movies
            }
        });
    } catch (error) {
        console.error(error)
        res.status(400).send(error);
    }
}

export const searchMovies = async (req: Request, res: Response): Promise<void | Response<any, Record<string, any>>> => {
    try {
        const { genre, sort_by, order_by } = req.query;

        const languages = Array.isArray(req.query.languages) ? req.query.languages : [];

        const languagesMap = new Map();
        for (const lang of languages) {
            if (!languagesMap.has(lang)) {
                languagesMap.set(lang, true);
            }
        }

        const minRating = req.query.minimum_rating ? parseInt(req.query.minimum_rating.toString()) : 0;
        const page = req.query.page ? parseInt(req.query.page.toString()) : PAGE_NUMBER;
        const limit = req.query.limit ? parseInt(req.query.limit.toString()) : FETCH_LIMIT;
        const originalQueryTerm = req.query.query_term?.toString() || '';
        const correctedQueryTerm = getCorrected(originalQueryTerm);

        const filters: Filters = {
            genre: genre as string,
            minRating,
            orderBy: order_by as string,
            sortBy: sort_by as string
        };

        const [originalResponse, correctedResponse] = await Promise.all([
            getAllMovies(filters, page, limit, originalQueryTerm),
            (correctedQueryTerm.length && (correctedQueryTerm !== originalQueryTerm))
                ? getAllMovies(filters, page, limit, correctedQueryTerm)
                : Promise.resolve({ data: { movies: [] } })
        ]);

        const movieMap = new Map<string, Record<string, unknown>>();

        for (const movie of originalResponse.data.movies || []) {
            movieMap.set(movie.id, movie);
        }

        for (const movie of correctedResponse.data.movies || []) {
            movieMap.set(movie.id, movie);
        }

        const allMovies = Array.from(movieMap.values());

        const filteredMovies = allMovies.filter(
            (m: Record<string, unknown>) => !languages.length || languagesMap.has(m.language)
        );

        res.status(200).json({
            ...originalResponse,
            data: {
                ...originalResponse.data,
                movies: filteredMovies
            }
        });
    } catch (error) {
        console.error(error);
        if ((error as Error).message) {
            return res.status(400).send((error as Error).message);
        }

        res.status(400).send(error);
    }
}

export const getMovies = async (req: Request, res: Response) => {
    try {
        const {ids} = req.body;

        if (!ids.length) {
            return res.status(200).json([]);
        }

        let movies: object[] = [];

        for (const movieId of ids) {
            const response = await yts.getMovie({movieId, withCast: false, withImages: true});

            if (response) {
                movies = [...movies, response.data.movie];
            }
        }

        return res.status(200).json({movies});
    } catch (error) {
        console.error(error);
        if ((error as Error).message) {
            return res.status(400).send((error as Error).message);
        }
        
        res.status(400).send(error);
    }
}
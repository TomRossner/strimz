import { Request, Response } from "express";
import axios from "axios";
import { Filters, getAllMovies, getMovieCast } from "../scraper/scraper.js";
import { FETCH_LIMIT, PAGE_NUMBER } from "../utils/constants.js";
import { yts } from "../yts/yts.js";
import { getCorrected } from "../utils/spell.js";
import { AxiosError } from "axios";
import { TMDB_BASE, TMDB_READ_ACCESS_TOKEN } from "../utils/constants.js";

export const getMovieMetadata = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const { imdbCode } = req.params;
        if (!imdbCode?.startsWith("tt")) {
            return res.status(400).json({ error: "Invalid IMDb code" });
        }

        // Validate environment variables are set
        if (!TMDB_BASE || !TMDB_READ_ACCESS_TOKEN) {
            console.error("TMDB configuration missing:", { 
                hasTmdbBase: !!TMDB_BASE, 
                hasTmdbToken: !!TMDB_READ_ACCESS_TOKEN 
            });
            return res.status(503).json({ 
                error: "TMDB service not configured", 
                runtime: undefined, 
                rating: undefined, 
                summary: undefined, 
                yt_trailer_code: undefined,
                genres: []
            });
        }

        const findOptions = {
            method: 'GET',
            url: `${TMDB_BASE}/find/${imdbCode}?external_source=imdb_id&language=en-US`,
            headers: {
              accept: 'application/json',
              Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN}`
            }
        };

        const findRes = await axios.request<{ movie_results?: { id: number }[] }>(findOptions);
        const movieResults = findRes.data?.movie_results;
        const tmdbId = movieResults?.[0]?.id;
        if (tmdbId == null) {
            return res.status(404).json({ error: "Movie not found on TMDB", runtime: undefined, rating: undefined, summary: undefined, yt_trailer_code: undefined, genres: [] });
        }
        
        const detailsOptions = {
            method: 'GET',
            url: `${TMDB_BASE}/movie/${tmdbId}?language=en-US`,
            headers: {
              accept: 'application/json',
              Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN as string}`
            }
        };

        const [detailsRes, videosRes] = await Promise.all([
            axios.request<{ runtime?: number; vote_average?: number; overview?: string; genres?: { id: number; name: string }[] }>(detailsOptions),
            axios.request<{ results?: { site: string; type: string; key: string }[] }>({
                method: 'GET',
                url: `${TMDB_BASE}/movie/${tmdbId}/videos?language=en-US`,
                headers: {
                    accept: 'application/json',
                    Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN as string}`
                }
            })
        ]);

        const videos = videosRes.data?.results ?? [];
        const trailer = videos.find(
            (v) => v.site === 'YouTube' && (v.type === 'Trailer')
        );
        const yt_trailer_code = trailer?.key;
        const rawGenres = detailsRes.data.genres ?? [];
        const genres = rawGenres.map((g: { id?: number; name: string }) => (g && typeof g.name === 'string' ? g.name : '')).filter(Boolean);

        return res.status(200).json({ 
            runtime: detailsRes.data.runtime, 
            rating: detailsRes.data.vote_average,
            summary: detailsRes.data.overview,
            yt_trailer_code,
            genres
        });
    } catch (error) {
        console.error("TMDB metadata error:", error instanceof Error ? error.message : error);
        
        if (axios.isAxiosError(error)) {
            const status = error.response?.status || 502;
            const message = error.response?.data?.status_message || error.message || "TMDB request failed";
            return res.status(status).json({
                error: message,
                runtime: undefined,
                rating: undefined,
                summary: undefined,
                yt_trailer_code: undefined,
                genres: []
            });
        }
        
        // Handle non-Axios errors (network issues, timeouts, etc.)
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch movie metadata";
        return res.status(502).json({ 
            error: errorMessage, 
            runtime: undefined, 
            rating: undefined, 
            summary: undefined, 
            yt_trailer_code: undefined,
            genres: []
        });
    }
};

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

        const toNum = (v: unknown): number | undefined => {
            if (v == null) return undefined;
            const n = typeof v === 'number' ? v : Number(v);
            return Number.isFinite(n) ? n : undefined;
        };
        const normalizeMovie = (m: Record<string, unknown>) => {
            const rating = toNum(m.rating ?? (m as Record<string, unknown>).Rating ?? (m as Record<string, unknown>).imdb_rating);
            const runtime = toNum(m.runtime ?? (m as Record<string, unknown>).Runtime ?? (m as Record<string, unknown>).runtime_minutes);
            return { ...m, rating, runtime };
        };

        const normalizedMovies = filteredMovies.map((m: Record<string, unknown>) => normalizeMovie(m));

        res.status(200).json({
            ...originalResponse,
            data: {
                ...originalResponse.data,
                movies: normalizedMovies
            }
        });
    } catch (error) {
        if ((error as Error).message) {
            return res
                .status((error as AxiosError).response?.status === 403 ? 403 : 400)
                .send(
                    (error as AxiosError).response?.status === 403
                        ? `${(error as Error).message}. Try connecting through a different VPN country.`
                        : (error as Error).message
                );
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

        const toNum = (v: unknown): number | undefined => {
            if (v == null) return undefined;
            const n = typeof v === 'number' ? v : Number(v);
            return Number.isFinite(n) ? n : undefined;
        };
        const normalizeGenres = (m: Record<string, unknown>): string[] => {
            const raw = m.genres ?? (m as Record<string, unknown>).Genres ?? m.genre ?? (m as Record<string, unknown>).Genre;
            if (Array.isArray(raw) && raw.length > 0) {
                const first = raw[0];
                if (typeof first === 'string') return raw as string[];
                if (typeof first === 'object' && first !== null && 'name' in first) {
                    return (raw as { name: string }[]).map((g) => g.name);
                }
            }
            if (typeof raw === 'string' && raw.trim()) {
                const split = raw.split(/[,/]/).map((s) => s.trim()).filter(Boolean);
                if (split.length > 0) return split;
                return [raw.trim()];
            }
            return [];
        };
        const normalizeMovie = (m: Record<string, unknown>) => {
            const rating = toNum(m.rating ?? (m as Record<string, unknown>).Rating ?? (m as Record<string, unknown>).imdb_rating);
            const runtime = toNum(m.runtime ?? (m as Record<string, unknown>).Runtime ?? (m as Record<string, unknown>).runtime_minutes);
            const genres = normalizeGenres(m);
            return { ...m, rating, runtime, genres };
        };

        for (const movieId of ids) {
            const response = await yts.getMovie({movieId, withCast: false, withImages: true});

            if (response?.data?.movie) {
                movies = [...movies, normalizeMovie(response.data.movie as Record<string, unknown>)];
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
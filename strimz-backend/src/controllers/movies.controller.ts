import { Request, Response } from "express";
import axios from "axios";
import { Filters, getAllMovies } from "../scraper/scraper.js";
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

type TmdbCastMember = { name: string; character?: string; profile_path?: string | null };
type TmdbCrewMember = { name: string; job?: string; profile_path?: string | null; known_for_department?: string };

export const getCast = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const { imdbCode } = req.params;

        if (!imdbCode?.startsWith("tt")) {
            return res.status(400).json({ error: "Invalid IMDb code" });
        }

        if (!TMDB_BASE || !TMDB_READ_ACCESS_TOKEN) {
            return res.status(503).json({ error: "TMDB service not configured" });
        }

        const findRes = await axios.request<{ movie_results?: { id: number }[] }>({
            method: "GET",
            url: `${TMDB_BASE}/find/${imdbCode}?external_source=imdb_id&language=en-US`,
            headers: {
                accept: "application/json",
                Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN}`,
            },
        });

        const tmdbId = findRes.data?.movie_results?.[0]?.id;
        if (tmdbId == null) {
            return res.status(404).json({ error: "Movie not found on TMDB" });
        }

        const creditsRes = await axios.request<{ cast?: TmdbCastMember[]; crew?: TmdbCrewMember[] }>({
            method: "GET",
            url: `${TMDB_BASE}/movie/${tmdbId}/credits`,
            headers: {
                accept: "application/json",
                Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN}`,
            },
        });

        const rawCast = creditsRes.data?.cast ?? [];
        const cast = rawCast
            .slice(0, 10)
            .map((c) => ({
                name: c.name,
                character_name: c.character,
                profile_path: c.profile_path ?? undefined,
            }));

        const rawCrew = creditsRes.data?.crew ?? [];
        const directors = rawCrew
            .filter((c) => c.known_for_department === "Directing" || c.job === "Director")
            .filter((c, i, arr) => arr.findIndex((d) => d.name === c.name) === i)
            .slice(0, 5)
            .map((c) => ({
                name: c.name,
                profile_path: c.profile_path ?? undefined,
            }));

        const writers = rawCrew
            .filter((c) => c.known_for_department === "Writing" || c.job === "Writer" || c.job === "Screenplay" || c.job === "Novel")
            .filter((c, i, arr) => arr.findIndex((d) => d.name === c.name) === i)
            .slice(0, 3)
            .map((c) => ({
                name: c.name,
                profile_path: c.profile_path ?? undefined,
            }));

        return res.status(200).json({ cast, directors, writers });
    } catch (error) {
        console.error("TMDB credits error:", error instanceof Error ? error.message : error);
        const status = axios.isAxiosError(error) ? (error.response?.status ?? 502) : 400;
        return res.status(status).json({ error: "Failed fetching cast" });
    }
};

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

        const emptyMovieList = { data: { movies: [] as Record<string, unknown>[], movie_count: 0 } };
        const loadCatalog = (query: string) => getAllMovies(filters, page, limit, query).catch((error: unknown) => {
            console.error(
                "Movie search catalog failed:",
                error instanceof Error ? error.message : error
            );
            return emptyMovieList;
        });

        const [originalResponse, correctedResponse] = await Promise.all([
            loadCatalog(originalQueryTerm),
            (correctedQueryTerm.length && (correctedQueryTerm !== originalQueryTerm))
                ? loadCatalog(correctedQueryTerm)
                : Promise.resolve(emptyMovieList)
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
        const normalizeMovie = (m: Record<string, unknown>): Record<string, unknown> => {
            const rating = toNum(m.rating ?? (m as Record<string, unknown>).Rating ?? (m as Record<string, unknown>).imdb_rating);
            const runtime = toNum(m.runtime ?? (m as Record<string, unknown>).Runtime ?? (m as Record<string, unknown>).runtime_minutes);
            return { ...m, rating, runtime };
        };

        const normalizedMovies = filteredMovies.map((m: Record<string, unknown>) => normalizeMovie(m));
        const queryForTheatres = originalQueryTerm.trim();

        if (queryForTheatres && page === PAGE_NUMBER) {
            try {
                const inTheatres = await ensureInTheatresMovies();
                const inTheatresKeys = new Set(
                    inTheatres.map((movie) => String(movie.imdb_code || movie.id).toLowerCase())
                );
                const genreFilter = typeof genre === "string" ? genre.trim().toLowerCase() : "";

                for (const movie of normalizedMovies) {
                    const key = String(movie.imdb_code || movie.id).toLowerCase();
                    if (inTheatresKeys.has(key)) {
                        movie.in_theatres = true;
                    }
                }

                const seen = new Set(
                    normalizedMovies.map((movie) => String(movie.imdb_code || movie.id).toLowerCase())
                );
                const theatreMatches = inTheatres.filter((movie) => {
                    const key = String(movie.imdb_code || movie.id).toLowerCase();
                    if (seen.has(key) || !matchesInTheatresQuery(movie, queryForTheatres)) return false;
                    if (genreFilter) {
                        const genres = Array.isArray(movie.genres)
                            ? movie.genres.map((entry) => String(entry).toLowerCase())
                            : [];
                        if (genres.length > 0 && !genres.includes(genreFilter)) return false;
                    }
                    if (minRating > 0 && Number(movie.rating ?? 0) < minRating) return false;
                    return true;
                });

                normalizedMovies.unshift(...theatreMatches);
            } catch (theatreError) {
                console.error(
                    "In theatres search merge failed:",
                    theatreError instanceof Error ? theatreError.message : theatreError
                );
            }
        }

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

type TmdbNowPlayingMovie = {
    id: number;
    title?: string;
    overview?: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
    release_date?: string;
    vote_average?: number;
};

type TmdbNowPlayingResponse = {
    page?: number;
    total_pages?: number;
    results?: TmdbNowPlayingMovie[];
};

type TmdbExternalIdsResponse = {
    imdb_id?: string | null;
};

type InTheatresCache = {
    expiresAt: number;
    movies: Record<string, unknown>[];
};

const IN_THEATRES_CACHE_MS = 30 * 60 * 1000;
const IN_THEATRES_LOOKUP_CONCURRENCY = 6;
const IN_THEATRES_MAX_PAGES = 5;
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

let inTheatresCache: InTheatresCache | null = null;

const mapWithConcurrency = async <T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T) => Promise<R>
): Promise<R[]> => {
    const results = new Array<R>(items.length);
    let nextIndex = 0;

    const worker = async () => {
        while (nextIndex < items.length) {
            const current = nextIndex;
            nextIndex += 1;
            results[current] = await mapper(items[current]);
        }
    };

    await Promise.all(
        Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
    );

    return results;
};

const tmdbHeaders = () => ({
    accept: "application/json",
    Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN}`,
});

const toListedNumber = (value: unknown): number | undefined => {
    if (value == null) return undefined;
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeListedMovie = (movie: Record<string, unknown>) => ({
    ...movie,
    rating: toListedNumber(movie.rating ?? movie.Rating ?? movie.imdb_rating),
    runtime: toListedNumber(movie.runtime ?? movie.Runtime ?? movie.runtime_minutes),
});

const tmdbImage = (path: string | null | undefined, size: string): string => {
    if (!path) return "";
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

const toTheatricalMovie = (movie: TmdbNowPlayingMovie, imdbId?: string): Record<string, unknown> => {
    const year = Number(movie.release_date?.slice(0, 4));
    const title = movie.title ?? "";

    return {
        id: String(movie.id),
        title,
        slug: imdbId || String(movie.id),
        year: Number.isFinite(year) ? year : 0,
        rating: toListedNumber(movie.vote_average),
        summary: movie.overview ?? "",
        yt_trailer_code: "",
        language: "",
        genres: [],
        background_image: tmdbImage(movie.backdrop_path, "w1280"),
        background_image_original: tmdbImage(movie.backdrop_path, "original"),
        small_cover_image: tmdbImage(movie.poster_path, "w185"),
        medium_cover_image: tmdbImage(movie.poster_path, "w342"),
        large_cover_image: tmdbImage(movie.poster_path, "w500"),
        torrents: [],
        imdb_code: imdbId ?? "",
    };
};

const findYtsMovieByImdb = async (imdbId: string): Promise<Record<string, unknown> | null> => {
    const response = await yts.getMovies({
        query_term: imdbId,
        limit: 5,
        page: 1,
    });

    const candidates = (response?.data?.movies ?? []) as Record<string, unknown>[];
    const match = candidates.find((movie) => movie.imdb_code === imdbId);

    if (!match) return null;
    if (!Array.isArray(match.torrents) || match.torrents.length === 0) return null;

    return normalizeListedMovie(match);
};

const fetchNowPlayingPage = async (page: number): Promise<TmdbNowPlayingResponse> => {
    const response = await axios.request<TmdbNowPlayingResponse>({
        method: "GET",
        url: `${TMDB_BASE}/movie/now_playing?language=en-US&page=${page}`,
        headers: tmdbHeaders(),
    });

    return response.data ?? {};
};

const normalizeSearchText = (value: string): string => {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
};

const matchesInTheatresQuery = (movie: Record<string, unknown>, query: string): boolean => {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return false;

    const imdbCode = String(movie.imdb_code ?? "").toLowerCase();
    if (imdbCode && (imdbCode === normalizedQuery || normalizedQuery.includes(imdbCode))) {
        return true;
    }

    const titleWords = normalizeSearchText(String(movie.title ?? "")).split(" ").filter(Boolean);
    const queryWords = normalizedQuery.split(" ").filter(Boolean);
    if (!titleWords.length || !queryWords.length) return false;

    return queryWords.every((word) => titleWords.some((titleWord) => titleWord === word || titleWord.startsWith(word)));
};

let inTheatresRequest: Promise<Record<string, unknown>[]> | null = null;

async function loadMoviesInTheatres(): Promise<Record<string, unknown>[]> {
    if (!TMDB_BASE || !TMDB_READ_ACCESS_TOKEN) {
        throw new Error("TMDB service not configured");
    }

    const firstPage = await fetchNowPlayingPage(1);
        const totalPages = Math.min(Math.max(firstPage.total_pages ?? 1, 1), IN_THEATRES_MAX_PAGES);
        const remainingPages = totalPages > 1
            ? await Promise.all(
                Array.from({ length: totalPages - 1 }, (_, index) => fetchNowPlayingPage(index + 2))
            )
            : [];

        const playing = [firstPage, ...remainingPages]
            .flatMap((page) => page.results ?? [])
            .filter((movie) => Number.isFinite(movie.id));

        const movies = await mapWithConcurrency(playing, IN_THEATRES_LOOKUP_CONCURRENCY, async (movie): Promise<Record<string, unknown>> => {
            let imdbId: string | undefined;

            try {
                const externalIds = await axios.request<TmdbExternalIdsResponse>({
                    method: "GET",
                    url: `${TMDB_BASE}/movie/${movie.id}/external_ids`,
                    headers: tmdbHeaders(),
                });

                if (externalIds.data?.imdb_id?.startsWith("tt")) {
                    imdbId = externalIds.data.imdb_id;
                }
            } catch (error) {
                console.error(
                    `In theatres IMDb lookup failed for "${movie.title ?? movie.id}":`,
                    error instanceof Error ? error.message : error
                );
            }

            if (imdbId) {
                try {
                    const streamable = await findYtsMovieByImdb(imdbId);
                    if (streamable) return { ...streamable, in_theatres: true };
                } catch (error) {
                    console.error(
                        `In theatres stream lookup failed for "${movie.title ?? movie.id}":`,
                        error instanceof Error ? error.message : error
                    );
                }
            }

            return { ...toTheatricalMovie(movie, imdbId), in_theatres: true };
        });

        const uniqueMovies = Array.from(
            new Map(movies.map((movie) => [String(movie.imdb_code || movie.id), movie])).values()
        );
        const streamableCount = uniqueMovies.filter((movie) => Array.isArray(movie.torrents) && movie.torrents.length > 0).length;

        inTheatresCache = {
            movies: uniqueMovies,
            expiresAt: Date.now() + IN_THEATRES_CACHE_MS,
        };

        console.log(`In theatres: ${uniqueMovies.length} titles, ${streamableCount} available to stream`);

        return uniqueMovies;
}

async function ensureInTheatresMovies(): Promise<Record<string, unknown>[]> {
    if (inTheatresCache && inTheatresCache.expiresAt > Date.now()) {
        return inTheatresCache.movies;
    }

    if (!inTheatresRequest) {
        inTheatresRequest = loadMoviesInTheatres().finally(() => {
            inTheatresRequest = null;
        });
    }

    return inTheatresRequest;
}

export const getMoviesInTheatres = async (_req: Request, res: Response): Promise<Response | void> => {
    try {
        const movies = await ensureInTheatresMovies();
        return res.status(200).json({ movies });
    } catch (error) {
        console.error("In theatres error:", error instanceof Error ? error.message : error);
        const status = error instanceof Error && error.message === "TMDB service not configured"
            ? 503
            : axios.isAxiosError(error) ? (error.response?.status ?? 502) : 502;
        return res.status(status).json({
            error: error instanceof Error ? error.message : "Failed fetching movies in theatres",
            movies: [],
        });
    }
};

export const getMovies = async (req: Request, res: Response) => {
    try {
        const {ids} = req.body;

        if (!Array.isArray(ids) || !ids.length) {
            return res.status(200).json({ movies: [] });
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

        const findSavedMovie = async (movieId: string): Promise<Record<string, unknown> | null> => {
            const key = movieId.trim().toLowerCase();
            if (!key) return null;

            if (!Number.isNaN(Number(key))) {
                try {
                    const response = await yts.getMovie({ movieId: movieId.trim(), withCast: false, withImages: true });
                    const listed = response?.data?.movie as Record<string, unknown> | undefined;
                    if (response?.status !== "error" && listed && String(listed.id) === movieId.trim()) {
                        return normalizeMovie(listed);
                    }
                } catch (error) {
                    console.error(
                        `Movie lookup failed for "${movieId}":`,
                        error instanceof Error ? error.message : error
                    );
                }
            }

            const inTheatres = await ensureInTheatresMovies().catch(() => []);
            return inTheatres.find((movie) => {
                const id = String(movie.id ?? "").toLowerCase();
                const imdbCode = String(movie.imdb_code ?? "").toLowerCase();
                const slug = String(movie.slug ?? "").toLowerCase();
                return id === key || imdbCode === key || slug === key;
            }) ?? null;
        };

        for (const movieId of ids) {
            const movie = await findSavedMovie(String(movieId));
            if (movie) movies = [...movies, movie];
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
import { Settings } from "../store/settings/settings.slice";

// Settings

export const saveSettings = (settings: Settings) => {
    return localStorage.setItem('user_settings', JSON.stringify(settings));
}

export const clearSettings = () => {
    if (localStorage.getItem('user_settings')) {
        return localStorage.removeItem('user_settings');
    }
}

export const getSettings = (): Settings | null => {
    const settings = localStorage.getItem('user_settings');
    
    return settings ? JSON.parse(settings) : null;
}



// Favorites

export const saveFavorites = (favorites: string[]) => {
    return localStorage.setItem('user_favorites', JSON.stringify(favorites));
}

export const clearFavorites = () => {
    if (localStorage.getItem('user_favorites')) {
        return localStorage.removeItem('user_favorites');
    }
}

export const removeFromFavorites = (movieId: string) => {
    if (localStorage.getItem('user_favorites')) {
        const userFavorites: string [] = JSON.parse(localStorage.getItem('user_favorites') as string);
        const updatedUserFavorites: string[] = userFavorites.filter(f => f !== movieId);

        return localStorage.setItem('user_favorites', JSON.stringify(updatedUserFavorites));
    }
}

export const addToFavorites = (movieId: string) => {
    if (localStorage.getItem('user_favorites')) {
        const userFavorites: string [] = JSON.parse(localStorage.getItem('user_favorites') as string);
        const updatedUserFavorites: string[] = [...userFavorites, movieId];

        return localStorage.setItem('user_favorites', JSON.stringify(updatedUserFavorites));
    }
    
    return localStorage.setItem('user_favorites', JSON.stringify([movieId]));
}

export const getFavorites = (): string[] => {
    const favorites = localStorage.getItem('user_favorites');
    
    return favorites ? JSON.parse(favorites) : [];
}

const FAVORITE_MOVIES_KEY = 'user_favorite_movies';
const WATCH_LIST_MOVIES_KEY = 'user_watch_list_movies';

const readStoredMovies = (key: string): Record<string, Record<string, unknown>> => {
    const raw = localStorage.getItem(key);
    if (!raw) return {};

    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        return parsed as Record<string, Record<string, unknown>>;
    } catch {
        return {};
    }
}

export const getFavoriteMovies = (): Record<string, Record<string, unknown>> => {
    return readStoredMovies(FAVORITE_MOVIES_KEY);
}

export const saveFavoriteMovie = (movie: { id: string }) => {
    const stored = getFavoriteMovies();
    stored[String(movie.id)] = movie as Record<string, unknown>;
    localStorage.setItem(FAVORITE_MOVIES_KEY, JSON.stringify(stored));
}

export const removeFavoriteMovie = (movieId: string) => {
    const stored = getFavoriteMovies();
    delete stored[String(movieId)];
    localStorage.setItem(FAVORITE_MOVIES_KEY, JSON.stringify(stored));
}

export const getWatchListMovies = (): Record<string, Record<string, unknown>> => {
    return readStoredMovies(WATCH_LIST_MOVIES_KEY);
}

export const saveWatchListMovie = (movie: { id: string }) => {
    const stored = getWatchListMovies();
    stored[String(movie.id)] = movie as Record<string, unknown>;
    localStorage.setItem(WATCH_LIST_MOVIES_KEY, JSON.stringify(stored));
}

export const removeWatchListMovie = (movieId: string) => {
    const stored = getWatchListMovies();
    delete stored[String(movieId)];
    localStorage.setItem(WATCH_LIST_MOVIES_KEY, JSON.stringify(stored));
}



export type SavedMovieKind = 'favorites' | 'watchList';

const SAVED_MOVIE_KEYS: Record<SavedMovieKind, { ids: string; movies: string }> = {
    favorites: { ids: 'user_favorites', movies: FAVORITE_MOVIES_KEY },
    watchList: { ids: 'user_watch_list', movies: WATCH_LIST_MOVIES_KEY },
};

/**
 * Rewrites saved favorites / watch list ids + snapshots with fresher movie data.
 * `replacements` maps a previously saved id to the up-to-date movie, which may carry a new id
 * (e.g. a title saved from "In Theatres" under its TMDB id that is now streamable on YTS).
 */
export const refreshSavedMovies = (
    kind: SavedMovieKind,
    replacements: Map<string, { id: string | number }>
) => {
    if (!replacements.size) return;
    const keys = SAVED_MOVIE_KEYS[kind];

    let ids: string[] = [];
    try {
        const parsed = JSON.parse(localStorage.getItem(keys.ids) ?? '[]') as unknown;
        ids = Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
        ids = [];
    }

    const stored = readStoredMovies(keys.movies);
    const nextIds: string[] = [];

    for (const id of ids) {
        const movie = replacements.get(id);
        const nextId = movie ? String(movie.id) : id;
        if (movie) {
            if (nextId !== id) delete stored[id];
            stored[nextId] = movie as unknown as Record<string, unknown>;
        }
        if (!nextIds.includes(nextId)) nextIds.push(nextId);
    }

    localStorage.setItem(keys.ids, JSON.stringify(nextIds));
    localStorage.setItem(keys.movies, JSON.stringify(stored));
}



// Watch list

export const saveWatchList = (list: string[]) => {
    return localStorage.setItem('user_watch_list', JSON.stringify(list));
}

export const clearWatchList = () => {
    if (localStorage.getItem('user_watch_list')) {
        return localStorage.removeItem('user_watch_list');
    }
}

export const removeFromWatchList = (movieId: string) => {
    if (localStorage.getItem('user_watch_list')) {
        const userWatchList: string [] = JSON.parse(localStorage.getItem('user_watch_list') as string);
        const updatedUserWatchList: string[] = userWatchList.filter(id => id !== movieId);

        return localStorage.setItem('user_watch_list', JSON.stringify(updatedUserWatchList));
    }
}

export const addToWatchList = (movieId: string) => {
    if (localStorage.getItem('user_watch_list')) {
        const userWatchList: string [] = JSON.parse(localStorage.getItem('user_watch_list') as string);
        const updatedUserWatchList: string[] = [...userWatchList, movieId];

        return localStorage.setItem('user_watch_list', JSON.stringify(updatedUserWatchList));
    }
    
    return localStorage.setItem('user_watch_list', JSON.stringify([movieId]));
}

export const getWatchList = (): string[] => {
    const list = localStorage.getItem('user_watch_list');
    
    return list ? JSON.parse(list) : [];
}
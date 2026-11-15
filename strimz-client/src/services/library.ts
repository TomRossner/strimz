import { Movie } from '@/components/MovieCard';
import { getMoviesByIds } from '@/services/movies';

const titleFromReleaseName = (name: string) => {
    const base = name.replace(/\.[a-z0-9]{2,4}$/i, '').replace(/[._]+/g, ' ').trim();
    const yearMatch = base.match(/^(.*?)\s*[\[(]((?:19|20)\d{2})[)\]]/);
    return (yearMatch?.[1] || base.split('[')[0] || base).replace(/\s+/g, ' ').trim();
};

export type WatchHistoryItem = {
    key: string;
    title: string;
    poster: string;
    year?: number;
    slug?: string;
    hash?: string;
    position: number;
    duration: number;
    watched: boolean;
    updatedAt: number;
    kind: 'movie' | 'episode';
    movie?: Movie | null;
    fileName?: string;
};

export type CustomList = {
    id: string;
    name: string;
    createdAt: number;
    movies: Movie[];
};

const HISTORY_KEY = 'watch_history';
const LISTS_KEY = 'custom_lists';
const RECENT_SEARCHES_KEY = 'recent_searches';

type LibrarySnapshot = {
    history: WatchHistoryItem[];
    lists: CustomList[];
    recentSearches: string[];
};

const listeners = new Set<() => void>();

const readJson = <T>(key: string, fallback: T): T => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
};

let snapshot: LibrarySnapshot = {
    history: readJson<WatchHistoryItem[]>(HISTORY_KEY, []),
    lists: readJson<CustomList[]>(LISTS_KEY, []),
    recentSearches: readJson<string[]>(RECENT_SEARCHES_KEY, []),
};

const persist = () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(snapshot.history));
    localStorage.setItem(LISTS_KEY, JSON.stringify(snapshot.lists));
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(snapshot.recentSearches));
    listeners.forEach((listener) => listener());
};

export const subscribeLibrary = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

export const getLibrarySnapshot = () => snapshot;

export const isMostlyWatched = (item: { position: number; duration: number; watched?: boolean }) => {
    if (item.watched) return true;
    if (!Number.isFinite(item.duration) || item.duration < 60 || item.position <= 0) return false;
    const remaining = item.duration - item.position;
    return item.position / item.duration >= 0.9 || remaining <= 180;
};

export const recordWatchProgress = (item: Omit<WatchHistoryItem, 'updatedAt' | 'watched'> & { watched?: boolean }) => {
    const previous = snapshot.history.find((entry) => entry.key === item.key);
    const duration = Number.isFinite(item.duration) && item.duration > 0
        ? item.duration
        : (previous?.duration || 0);
    const next: WatchHistoryItem = {
        ...previous,
        ...item,
        poster: item.poster || previous?.poster || '',
        fileName: item.fileName || previous?.fileName,
        hash: item.hash || previous?.hash,
        slug: item.slug || previous?.slug,
        movie: item.movie ?? previous?.movie,
        year: item.year || previous?.year,
        duration,
        watched: item.watched ?? previous?.watched ?? false,
        updatedAt: Date.now(),
    };
    const without = snapshot.history.filter((entry) => entry.key !== item.key);
    snapshot = {
        ...snapshot,
        history: [next, ...without].slice(0, 200),
    };
    persist();
};

export const markWatched = (key: string) => {
    snapshot = {
        ...snapshot,
        history: snapshot.history.map((entry) => (
            entry.key === key ? { ...entry, watched: true, updatedAt: Date.now() } : entry
        )),
    };
    persist();
};

export const removeHistoryItem = (key: string) => {
    snapshot = {
        ...snapshot,
        history: snapshot.history.filter((entry) => entry.key !== key),
    };
    persist();
};

export const removeHistoryForDownload = ({ hash, titles = [] }: { hash?: string; titles?: string[] }) => {
    const hashLower = hash?.trim().toLowerCase();
    const titleSet = new Set<string>();
    if (!hashLower) {
        titles.forEach((name) => {
            const trimmed = name.trim().toLowerCase();
            if (trimmed.length > 1) titleSet.add(trimmed);
            const parsed = titleFromReleaseName(name).trim().toLowerCase();
            if (parsed.length > 1) titleSet.add(parsed);
        });
    }

    const next = snapshot.history.filter((entry) => {
        if (hashLower && (entry.hash?.toLowerCase() === hashLower || entry.key.toLowerCase() === hashLower)) {
            return false;
        }
        if (titleSet.size > 0 && titleSet.has(entry.title.trim().toLowerCase())) {
            return false;
        }
        return true;
    });
    if (next.length === snapshot.history.length) return;
    snapshot = { ...snapshot, history: next };
    persist();
};

export const clearHistory = () => {
    snapshot = { ...snapshot, history: [] };
    persist();
};

export const createCustomList = (name: string): CustomList => {
    const list: CustomList = {
        id: `${Date.now()}`,
        name: name.trim(),
        createdAt: Date.now(),
        movies: [],
    };
    snapshot = { ...snapshot, lists: [list, ...snapshot.lists] };
    persist();
    return list;
};

export const renameCustomList = (id: string, name: string) => {
    snapshot = {
        ...snapshot,
        lists: snapshot.lists.map((list) => list.id === id ? { ...list, name: name.trim() } : list),
    };
    persist();
};

export const deleteCustomList = (id: string) => {
    snapshot = {
        ...snapshot,
        lists: snapshot.lists.filter((list) => list.id !== id),
    };
    persist();
};

export const addMovieToList = (listId: string, movie: Movie) => {
    snapshot = {
        ...snapshot,
        lists: snapshot.lists.map((list) => {
            if (list.id !== listId) return list;
            if (list.movies.some((entry) => entry.id === movie.id)) return list;
            return { ...list, movies: [movie, ...list.movies] };
        }),
    };
    persist();
};

/**
 * List entries are full movie snapshots, so a title added while it was only in theatres
 * (no torrents, TMDB id) would stay unstreamable forever. Look those up again by IMDb code
 * and swap in the streamable release once one exists.
 */
export const refreshUnstreamableListMovies = async () => {
    const pending = new Map<string, Movie>();
    for (const list of snapshot.lists) {
        for (const movie of list.movies) {
            const streamable = Array.isArray(movie.torrents) && movie.torrents.length > 0;
            if (!streamable && movie.imdb_code) pending.set(String(movie.id), movie);
        }
    }
    if (!pending.size) return;

    let found: Record<string, unknown>[] = [];
    try {
        const response = await getMoviesByIds(
            Array.from(pending.values()).map((movie) => ({ id: String(movie.id), imdb_code: movie.imdb_code }))
        );
        found = (response.data?.movies ?? []) as Record<string, unknown>[];
    } catch (error) {
        console.error(error);
        return;
    }

    const replacements = new Map<string, Movie>();
    for (const raw of found) {
        const savedId = String(raw.saved_id ?? '');
        const previous = pending.get(savedId);
        const torrents = Array.isArray(raw.torrents) ? raw.torrents as object[] : [];
        if (!previous || !torrents.length || raw.imdb_code !== previous.imdb_code) continue;
        const movie = { ...previous, ...raw, id: String(raw.id), torrents } as Movie & Record<string, unknown>;
        delete movie.saved_id;
        delete movie.in_theatres;
        replacements.set(savedId, movie);
    }
    if (!replacements.size) return;

    snapshot = {
        ...snapshot,
        lists: snapshot.lists.map((list) => {
            const seen = new Set<string>();
            const movies = list.movies
                .map((movie) => replacements.get(String(movie.id)) ?? movie)
                .filter((movie) => {
                    const key = String(movie.id);
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
            return { ...list, movies };
        }),
    };
    persist();
};

export const removeMovieFromList = (listId: string, movieId: string) => {
    snapshot = {
        ...snapshot,
        lists: snapshot.lists.map((list) => (
            list.id === listId
                ? { ...list, movies: list.movies.filter((movie) => String(movie.id) !== String(movieId)) }
                : list
        )),
    };
    persist();
};

export const rememberSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const without = snapshot.recentSearches.filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase());
    snapshot = {
        ...snapshot,
        recentSearches: [trimmed, ...without].slice(0, 8),
    };
    persist();
};

export const clearRecentSearches = () => {
    snapshot = { ...snapshot, recentSearches: [] };
    persist();
};

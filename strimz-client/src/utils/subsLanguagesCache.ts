// Available subtitles languages caching

interface CachedSubs {
    available: string[];
    unavailable: string[];
    ts: number;
}

const SUBS_CACHE_KEY = 'subsCache';
export const CACHE_TTL = 1000 * 60 * 60 * 24; // 24h

export const getSubsCache = (): Record<string, CachedSubs> => {
    const raw = localStorage.getItem(SUBS_CACHE_KEY);
    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

export const setSubsCache = (
    key: string,
    available: string[],
    unavailable: string[]
) => {
    const cache = getSubsCache();

    cache[key] = {
        available,
        unavailable,
        ts: Date.now(),
    };

    localStorage.setItem(SUBS_CACHE_KEY, JSON.stringify(cache));
}

export const updateSubsCache = (
    key: string,
    langId: string,
    isAvailable: boolean
) => {
    const cache = getSubsCache();

    const entry: CachedSubs = cache[key] ?? {
        available: [],
        unavailable: [],
        ts: Date.now(),
    };

    if (isAvailable) {
        entry.available = [...new Set([...entry.available, langId])];
        entry.unavailable = entry.unavailable.filter(l => l !== langId);
    } else {
        entry.unavailable = [...new Set([...entry.unavailable, langId])];
    }

    entry.ts = Date.now();
    cache[key] = entry;

    localStorage.setItem(SUBS_CACHE_KEY, JSON.stringify(cache));
};
export type PlayerPrefs = {
    volume: number;
    muted: boolean;
    playbackRate: number;
    subtitleLang: string | null;
    subtitleSize: number;
    subtitleDelay: number;
    subtitleColor: string;
    subtitleBackground: string;
    subtitleFont: string;
};

export const DEFAULT_PLAYER_PREFS: PlayerPrefs = {
    volume: 100,
    muted: false,
    playbackRate: 1,
    subtitleLang: null,
    subtitleSize: 30,
    subtitleDelay: 0,
    subtitleColor: '#ffffff',
    subtitleBackground: 'transparent',
    subtitleFont: 'Arial, Helvetica, sans-serif',
};

const STORAGE_KEY = 'player_prefs';

const listeners = new Set<() => void>();

let cache: PlayerPrefs = readPlayerPrefs();

function readPlayerPrefs(): PlayerPrefs {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_PLAYER_PREFS };
        const parsed = JSON.parse(raw) as Partial<PlayerPrefs>;
        return { ...DEFAULT_PLAYER_PREFS, ...parsed };
    } catch {
        return { ...DEFAULT_PLAYER_PREFS };
    }
}

export const getPlayerPrefs = (): PlayerPrefs => cache;

export const subscribePlayerPrefs = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

export const savePlayerPrefs = (partial: Partial<PlayerPrefs>) => {
    cache = { ...cache, ...partial };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    listeners.forEach((listener) => listener());
};

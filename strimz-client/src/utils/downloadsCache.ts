import { Torrent } from './types';

export interface CachedDownloadInfo {
    hash: string;
    slug: string;
    title: string;
    quality: string;
    size: number;
    sizeBytes: number;
    subtitleFilePath: string | null;
    subtitleLang: string | null;
    poster?: string;
    isCompleted: boolean;
    timestamp: number;
    // Download progress info (cached for better UX)
    progress?: number;
    speed?: number;
    peers?: number;
    downloaded?: number;
    timeRemaining?: number;
    paused?: boolean;
    // Video playback position (for resume functionality)
    lastPlayedPosition?: number;
    lastPlayedTimestamp?: number;
}

const DOWNLOADS_CACHE_KEY = 'downloadsCache';

export const getDownloadsCache = (): Record<string, CachedDownloadInfo> => {
    const raw = localStorage.getItem(DOWNLOADS_CACHE_KEY);
    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
};

export const saveDownloadInfo = (hash: string, info: Omit<CachedDownloadInfo, 'hash' | 'timestamp'>) => {
    const cache = getDownloadsCache();
    cache[hash.toLowerCase()] = {
        ...info,
        hash: hash.toLowerCase(),
        timestamp: Date.now(),
    };
    localStorage.setItem(DOWNLOADS_CACHE_KEY, JSON.stringify(cache));
};

export const getDownloadInfo = (hash: string): CachedDownloadInfo | null => {
    const cache = getDownloadsCache();
    return cache[hash.toLowerCase()] || null;
};

export const updateDownloadCompletion = (hash: string, isCompleted: boolean) => {
    const cache = getDownloadsCache();
    const info = cache[hash.toLowerCase()];
    if (info) {
        info.isCompleted = isCompleted;
        info.timestamp = Date.now();
        localStorage.setItem(DOWNLOADS_CACHE_KEY, JSON.stringify(cache));
    }
};

export const updateDownloadProgress = (
    hash: string,
    progress: number,
    speed: number,
    peers: number,
    downloaded: number,
    timeRemaining: number,
    paused: boolean
) => {
    const cache = getDownloadsCache();
    const info = cache[hash.toLowerCase()];
    if (info) {
        info.progress = progress;
        info.speed = speed;
        info.peers = peers;
        info.downloaded = downloaded;
        info.timeRemaining = timeRemaining;
        info.paused = paused;
        info.timestamp = Date.now();
        
        // If progress reaches 100% (1.0), mark as completed
        if (progress >= 1.0) {
            info.isCompleted = true;
        }
        
        localStorage.setItem(DOWNLOADS_CACHE_KEY, JSON.stringify(cache));
    }
};

export const updatePlaybackPosition = (hash: string, position: number) => {
    const cache = getDownloadsCache();
    const info = cache[hash.toLowerCase()];
    if (info) {
        info.lastPlayedPosition = position;
        info.lastPlayedTimestamp = Date.now();
        localStorage.setItem(DOWNLOADS_CACHE_KEY, JSON.stringify(cache));
    }
};

export const getPlaybackPosition = (hash: string): number | null => {
    const cache = getDownloadsCache();
    const info = cache[hash.toLowerCase()];
    // Return position if it exists and is recent (within 30 days)
    if (info?.lastPlayedPosition !== undefined && info.lastPlayedTimestamp) {
        const daysSincePlayback = (Date.now() - info.lastPlayedTimestamp) / (1000 * 60 * 60 * 24);
        if (daysSincePlayback < 30) {
            // Return position a few seconds before to account for context
            return Math.max(0, info.lastPlayedPosition - 5);
        }
    }
    return null;
};

export const removeDownloadInfo = (hash: string) => {
    const cache = getDownloadsCache();
    delete cache[hash.toLowerCase()];
    localStorage.setItem(DOWNLOADS_CACHE_KEY, JSON.stringify(cache));
};

export const getDownloadInfoByPath = (filePath: string, downloadsDir: string): CachedDownloadInfo | null => {
    const cache = getDownloadsCache();
    // Find download info by matching file path patterns
    // This is a simple implementation - you might need to refine based on your file naming conventions
    for (const info of Object.values(cache)) {
        // Check if the file path contains the download folder name
        const folderName = filePath.split(/[/\\]/)[0];
        // Try to match by folder name or title
        if (filePath.includes(info.title) || folderName === info.title) {
            return info;
        }
    }
    return null;
};

/**
 * Validates and updates the downloads cache based on backend data
 * This should be called after fetching downloads from the backend
 * to sync cache completion status with actual backend state
 * @returns true if the cache was updated, false otherwise
 */
export const validateDownloadsCache = (
    backendDownloads: Array<{ hash: string; done: boolean; progress: number; paused: boolean }>,
    downloadedFiles?: Array<{ path: string; size: number }>
): boolean => {
    const cache = getDownloadsCache();
    let cacheUpdated = false;

    // Update cache based on backend download data
    backendDownloads.forEach((backendDownload) => {
        const hashLower = backendDownload.hash.toLowerCase();
        const cachedInfo = cache[hashLower];

        if (cachedInfo) {
            // Update completion status if backend says it's done
            if (backendDownload.done && !cachedInfo.isCompleted) {
                cachedInfo.isCompleted = true;
                cachedInfo.progress = 1.0;
                cachedInfo.paused = true; // Completed downloads are paused
                cacheUpdated = true;
            }

            // Update progress and paused state from backend
            if (backendDownload.progress !== undefined) {
                cachedInfo.progress = backendDownload.progress;
                // If progress is 100%, mark as completed
                if (backendDownload.progress >= 1.0 && !cachedInfo.isCompleted) {
                    cachedInfo.isCompleted = true;
                    cacheUpdated = true;
                }
            }

            if (backendDownload.paused !== undefined) {
                cachedInfo.paused = backendDownload.paused;
            }

            cachedInfo.timestamp = Date.now();
        }
    });

    // Validate file-only downloads by checking if files exist and match expected size
    if (downloadedFiles) {
        Object.values(cache).forEach((cachedInfo) => {
            // Skip if already completed or if we have backend data for it
            if (cachedInfo.isCompleted || backendDownloads.some(d => d.hash.toLowerCase() === cachedInfo.hash.toLowerCase())) {
                return;
            }

            // Try to find matching files on disk
            const matchingFiles = downloadedFiles.filter(file => {
                const folderName = file.path.split(/[/\\]/)[0];
                return folderName === cachedInfo.title || file.path.includes(cachedInfo.title);
            });

            if (matchingFiles.length > 0) {
                // Find the largest file (main video file)
                const mainFile = matchingFiles.reduce((prev, current) => 
                    current.size > prev.size ? current : prev
                );

                // If file size matches or exceeds expected size, mark as completed
                if (cachedInfo.sizeBytes && mainFile.size >= cachedInfo.sizeBytes) {
                    if (!cachedInfo.isCompleted) {
                        cachedInfo.isCompleted = true;
                        cachedInfo.progress = 1.0;
                        cacheUpdated = true;
                    }
                } else if (cachedInfo.sizeBytes) {
                    // Update progress based on file size
                    const progress = mainFile.size / cachedInfo.sizeBytes;
                    cachedInfo.progress = progress;
                    cacheUpdated = true;
                }
            }
        });
    }

    if (cacheUpdated) {
        localStorage.setItem(DOWNLOADS_CACHE_KEY, JSON.stringify(cache));
    }

    return cacheUpdated;
};


import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import Container from '@/components/Container';
import LoadingIcon from '@/components/LoadingIcon';
import Page from '@/components/Page';
import PageDescription from '@/components/PageDescription';
import PageTitle from '@/components/PageTitle';
import { deleteDownload, pauseDownload, playTorrent, resumeDownload } from '@/services/movies';
import { updateDownloadCompletion, removeDownloadInfo, updateDownloadProgress, validateDownloadsCache } from '@/utils/downloadsCache';
import { selectCompleted, selectDownloads, selectDownloadedFiles } from '@/store/downloads/downloads.selectors';
import { setCompleted, fetchDownloadedFilesAsync, removeDownload, removeDownloadedFile, fetchAllDownloadsAsync } from '@/store/downloads/downloads.slice';
import { getDownloadsCache, CachedDownloadInfo } from '@/utils/downloadsCache';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectSettings } from '@/store/settings/settings.selectors';
import { selectSocket } from '@/store/socket/socket.selectors';
import { formatBytesPerSecond, formatBytes } from '@/utils/bytes';
import { DownloadProgressData } from '@/utils/types';
import { msToReadableTime } from '@/utils/formatTime';
import { API_URL } from '@/utils/constants';
import throttle from 'lodash.throttle';
import React, { useCallback, useEffect, useRef, useState, useMemo, ChangeEvent, FormEvent } from 'react';
import { BsPause, BsPlay, BsTrash } from 'react-icons/bs';
import { BiSearch } from 'react-icons/bi';
import { MdFileDownloadDone } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';

// Module-level flag to track if initial restore has been attempted (persists across component mounts)
let hasCompletedInitialRestore = false;

type CombinedDownload = {
    hash?: string;
    title: string;
    name: string;
    slug?: string;
    isActive: boolean;
    isFileOnly: boolean;
    filePath?: string;
    fileSize?: number;
    isPendingVerification?: boolean; // True for cache entries waiting for backend verification
    poster?: string; // Movie poster image URL
}

const DownloadsPage = () => {
    const downloads = useAppSelector(selectDownloads);
    const completed = useAppSelector(selectCompleted);
    const downloadedFiles = useAppSelector(selectDownloadedFiles);
    const socket = useAppSelector(selectSocket);
    const [downloadsStatus, setDownloadsStatus] = useState<DownloadProgressData[]>([]);
    const [cacheValidationVersion, setCacheValidationVersion] = useState(0); // Track cache updates to trigger re-renders
    const [searchQuery, setSearchQuery] = useState<string>(''); // Search query for filtering downloads
    const completedFetchedRef = useRef<Set<string>>(new Set()); // Track which completed downloads we've already fetched for
    const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Track pending fetch timeout
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const settings = useAppSelector(selectSettings);

    const bufferWidth = useCallback((hash: string) => {
        const dl = downloadsStatus.find(d => d.hash === hash);

        return dl ? Number((dl.progress * 100).toFixed(2)) : 0;
    }, [downloadsStatus]);
    const isDownloading = useCallback((hash: string) => {
        const dl = downloadsStatus.find(d => d.hash === hash);

        return dl ? !dl.done && !dl.paused : false;
    }, [downloadsStatus]);
    const downloadSpeed = useCallback((hash: string) => {
        const dl = downloadsStatus.find(d => d.hash === hash);

        return dl ? formatBytesPerSecond(dl?.speed ?? 0) : 0;
    }, [downloadsStatus]);
    const isPaused = useCallback((hash: string) => {
        const dl = downloadsStatus.find(d => d.hash === hash);

        return dl?.paused || false;
    }, [downloadsStatus]);

    // Fetch downloaded files when component mounts or settings change
    useEffect(() => {
        if (settings.downloadsFolderPath) {
            dispatch(fetchDownloadedFilesAsync(settings.downloadsFolderPath));
        }
    }, [settings.downloadsFolderPath, dispatch]);

    // Track which torrents we've attempted to restore (persists across component re-renders)
    const restoredTorrentsRef = useRef<Set<string>>(new Set());
    // Track in-flight restore operations to prevent concurrent restores of the same torrent
    const restoringTorrentsRef = useRef<Set<string>>(new Set());

    // Restore in-progress downloads to client on mount (only once per app session)
    useEffect(() => {
        if (!socket?.id || !settings.downloadsFolderPath) {
            console.log('[Downloads] Restore skipped: missing socket.id or downloadsFolderPath', { 
                socketId: socket?.id, 
                folderPath: settings.downloadsFolderPath 
            });
            return;
        }
        
        // Only restore once per app session using module-level flag
        // This persists across component unmounts/remounts
        if (hasCompletedInitialRestore) {
            console.log('[Downloads] Restore skipped: already completed initial restore');
            return;
        }
        
        console.log('[Downloads] Starting initial restore...');
        // Mark as started immediately to prevent concurrent executions
        hasCompletedInitialRestore = true;

        const restoreInProgressDownloads = async () => {
            try {
                const cache = getDownloadsCache();
                const { restoreTorrent } = await import('@/services/movies');

                // Find all in-progress downloads (not completed)
                // IMPORTANT: Only restore downloads that are NOT completed
                // Completed downloads can be played from disk and don't need to be in the client
                const inProgressDownloads = (Object.values(cache) as CachedDownloadInfo[]).filter(info => {
                    // Only restore if explicitly marked as not completed
                    return info.isCompleted === false;
                });

                // If no in-progress downloads, nothing to do
                if (inProgressDownloads.length === 0) {
                    console.log('[Downloads] No in-progress downloads to restore');
                    return;
                }

                console.log(`[Downloads] Found ${inProgressDownloads.length} in-progress downloads to restore`);

                // Process each download sequentially to prevent race conditions
                for (const info of inProgressDownloads) {
                    const hashLower = info.hash.toLowerCase();
                    
                    // Double-check: Skip if somehow marked as completed (shouldn't happen due to filter above)
                    if (info.isCompleted) {
                        console.log(`[Downloads] Skipping ${info.title} - marked as completed`);
                        continue;
                    }
                    
                    // Skip if we've already successfully restored this torrent
                    if (restoredTorrentsRef.current.has(hashLower)) {
                        console.log(`[Downloads] Skipping ${info.title} - already restored`);
                        continue;
                    }

                    // Skip if currently being restored (prevents concurrent restores)
                    if (restoringTorrentsRef.current.has(hashLower)) {
                        console.log(`[Downloads] Skipping ${info.title} - restore in progress`);
                        continue;
                    }

                    // Check if download is already in active downloads (from backend)
                    // If it's already active, we don't need to restore it
                    let exists = downloads.find(d => d.hash.toLowerCase() === hashLower);
                    if (!exists && downloads.length === 0) {
                        // Downloads might still be loading, wait a bit
                        await new Promise(resolve => setTimeout(resolve, 500));
                        // Re-check after waiting
                        exists = downloads.find(d => d.hash.toLowerCase() === hashLower);
                    }
                    
                    if (exists) {
                        // Check if it's already completed - if so, skip restoration (can be played from disk)
                        // The 'done' property should be available if the download is completed
                        if (exists.done) {
                            console.log(`[Downloads] Skipping ${info.title} - already completed in client`);
                            restoredTorrentsRef.current.add(hashLower);
                            continue;
                        }
                        
                        // Already active but not completed - mark as restored and skip
                        console.log(`[Downloads] Skipping ${info.title} - already active in client`);
                        restoredTorrentsRef.current.add(hashLower);
                        continue;
                    }

                    // Mark as currently being restored BEFORE making the API call
                    restoringTorrentsRef.current.add(hashLower);
                    console.log(`[Downloads] Restoring ${info.title} (${hashLower})...`);

                    try {
                        // Restore torrent to client
                        if (socket.id) {
                            const restoreResponse = await restoreTorrent({
                                hash: info.hash,
                                slug: info.slug,
                                title: info.title,
                                dir: settings.downloadsFolderPath!,
                                sid: socket.id,
                            });
                            
                            // If restore was successful (status 200), pause the download
                            if (restoreResponse?.status === 200) {
                                // Mark as successfully restored
                                restoredTorrentsRef.current.add(hashLower);
                                console.log(`[Downloads] Successfully restored ${info.title}`);
                                
                                // Wait a bit to ensure the torrent is fully registered in activeTorrents
                                // Then pause the download to prevent it from continuing to download
                                await new Promise(resolve => setTimeout(resolve, 500));
                                
                                try {
                                    await pauseDownload(info.hash);
                                    console.log(`[Downloads] Paused ${info.title} after restore`);
                                } catch (pauseError) {
                                    console.error(`[Downloads] Failed to pause ${info.title} after restore:`, pauseError);
                                    // Retry pause after another short delay
                                    setTimeout(async () => {
                                        try {
                                            await pauseDownload(info.hash);
                                            console.log(`[Downloads] Paused ${info.title} after restore (retry)`);
                                        } catch (retryError) {
                                            console.error(`[Downloads] Failed to pause ${info.title} after restore (retry):`, retryError);
                                        }
                                    }, 1000);
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`[Downloads] Failed to restore download ${info.title} (${hashLower}):`, error);
                        // Remove from restored set on error so it can be retried later
                        restoredTorrentsRef.current.delete(hashLower);
                    } finally {
                        // Always remove from in-flight set when done
                        restoringTorrentsRef.current.delete(hashLower);
                    }
                }
                
                console.log(`[Downloads] Initial restore completed. Processed ${inProgressDownloads.length} in-progress downloads`);
                
                // Refetch downloads after restore to get newly restored torrents in the UI
                // Wait a bit to allow backend to add them to activeTorrents
                setTimeout(() => {
                    dispatch(fetchAllDownloadsAsync());
                }, 1000);
            } catch (error) {
                console.error('[Downloads] Error in restore function:', error);
                // Reset flag on error so we can retry later (after app restart)
                hasCompletedInitialRestore = false;
            }
        };

        restoreInProgressDownloads();
        // Note: Module-level hasCompletedInitialRestore flag ensures we only restore once per app session
        // This persists across component unmounts/remounts and prevents duplicate restore attempts
        // We check isLoading as a guard but don't include it in deps to avoid re-triggering
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket?.id, settings.downloadsFolderPath]);

    // Sync cache with backend data when backend data arrives
    useEffect(() => {
        if (downloads.length > 0 || downloadedFiles.length > 0) {
            // Validate and sync cache with backend data
            // This ensures cache completion status matches backend state
            const cacheUpdated = validateDownloadsCache(
                downloads.map(d => ({
                    hash: d.hash,
                    done: d.done || false,
                    progress: d.progress || 0,
                    paused: d.paused || false,
                })),
                downloadedFiles
            );
            
            // If cache was updated, increment version to trigger re-render
            if (cacheUpdated) {
                setCacheValidationVersion(prev => prev + 1);
            }
        }
    }, [downloads, downloadedFiles]);

    // Build downloads list with backend data as source of truth
    // Priority: Backend data (source of truth) → Cache entries (pending verification) → File-only downloads
    const { uncompletedDownloads, completedDownloads } = useMemo(() => {
        const cache = getDownloadsCache();
        const uncompleted: CombinedDownload[] = [];
        const completedList: CombinedDownload[] = [];
        const addedHashes = new Set<string>(); // Track which hashes we've already added
        const usedFolderNames = new Set<string>(); // Track which folder names are already used by downloads
        
        // Group downloaded files by folder name (parent directory)
        const filesByFolder = new Map<string, Array<{ name: string; path: string; size: number; extension: string }>>();
        
        downloadedFiles.forEach(file => {
            const folderName = file.path.split(/[/\\]/)[0] || file.path || '';
            if (!filesByFolder.has(folderName)) {
                filesByFolder.set(folderName, []);
            }
            filesByFolder.get(folderName)!.push(file);
        });

        // Build a set of backend hashes for fast lookup
        const backendHashes = new Set(downloads.map(d => d.hash.toLowerCase()));

        // STEP 1: Process backend downloads FIRST (source of truth)
        // Backend data always takes precedence and replaces any cache entries
        downloads.forEach(download => {
            const hashLower = download.hash.toLowerCase();
            const cachedInfo = cache[hashLower];
            
            // Use backend completion status as source of truth
            // But also check cache if backend doesn't explicitly mark it as done
            const backendDone = download.done === true;
            const backendProgressComplete = download.progress !== undefined && download.progress >= 1.0;
            const backendCompleted = backendDone || backendProgressComplete;
            // If backend doesn't mark it as completed but cache says it's completed, trust the cache
            // This handles the case where download completes but backend hasn't updated yet
            const cacheCompleted = cachedInfo?.isCompleted === true;
            const isCompleted = backendCompleted || (cacheCompleted && !backendCompleted);
            
            // Find file path for all downloads (for "Watch now" button)
            let filePath: string | undefined = undefined;
            let fileSize: number | undefined = undefined;
            
            // Try to find the file path from downloadedFiles
            if (filesByFolder.size > 0) {
                const matchingFiles = Array.from(filesByFolder.values()).flat().filter(file => {
                    const folderName = file.path.split(/[/\\]/)[0];
                    return folderName === download.name;
                });
                
                if (matchingFiles.length > 0) {
                    // Find the largest file (main video file)
                    const mainFile = matchingFiles.reduce((prev, current) => 
                        current.size > prev.size ? current : prev
                    );
                    filePath = mainFile.path;
                    fileSize = mainFile.size;
                }
            }

            const downloadItem: CombinedDownload = {
                hash: download.hash,
                title: cachedInfo?.title || download.title,
                name: download.name,
                slug: cachedInfo?.slug || download.slug,
                isActive: true, // From backend, so it's active
                isFileOnly: false,
                filePath: filePath,
                fileSize: fileSize,
                isPendingVerification: false, // Backend data is verified
                poster: cachedInfo?.poster,
            };

            // Remove any existing entry from either list (prevents duplicates)
            const existingCompletedIndex = completedList.findIndex(d => d.hash?.toLowerCase() === hashLower);
            const existingUncompletedIndex = uncompleted.findIndex(d => d.hash?.toLowerCase() === hashLower);
            
            if (existingCompletedIndex >= 0) {
                completedList.splice(existingCompletedIndex, 1);
            }
            if (existingUncompletedIndex >= 0) {
                uncompleted.splice(existingUncompletedIndex, 1);
            }
            
            // Add the entry to the correct list based on backend status
            if (isCompleted) {
                completedList.push(downloadItem);
            } else {
                uncompleted.push(downloadItem);
            }

            addedHashes.add(hashLower);
            // Track the folder name so we don't add it as file-only in STEP 3
            if (download.name) {
                usedFolderNames.add(download.name.toLowerCase());
            }
        });

        // STEP 2: Process cache entries that are NOT in backend downloads
        // These are "pending verification" - show them with loading state
        Object.values(cache).forEach((cachedInfo: CachedDownloadInfo) => {
            const hashLower = cachedInfo.hash.toLowerCase();
            
            // Skip if already added (in backend) or if no hash (will be handled as file-only)
            if (addedHashes.has(hashLower) || backendHashes.has(hashLower) || !cachedInfo.hash) {
                return;
            }

            // Check if there's a matching file on disk (if downloadedFiles has loaded)
            let matchingFolder: string | null = null;
            let matchingFiles: Array<{ name: string; path: string; size: number; extension: string }> | null = null;
            let filePath: string | undefined = undefined;
            let fileSize: number | undefined = undefined;

            if (filesByFolder.size > 0) {
                for (const [folderName, files] of filesByFolder.entries()) {
                    if (folderName === cachedInfo.title || folderName.includes(cachedInfo.title) || cachedInfo.title.includes(folderName)) {
                        matchingFolder = folderName;
                        matchingFiles = files;
                        break;
                    }
                }

                if (matchingFiles && matchingFiles.length > 0) {
                    const mainFile = matchingFiles.reduce((prev, current) => 
                        current.size > prev.size ? current : prev
                    );
                    filePath = mainFile.path;
                    fileSize = mainFile.size;
                    matchingFolder = matchingFolder || cachedInfo.title;
                }
            } else {
                matchingFolder = cachedInfo.title;
            }

            // For cache entries, use cache's isCompleted status
            // But mark as pending verification if incomplete (waiting for backend to verify)
            const isCompleted = cachedInfo.isCompleted ?? false;
            const isPendingVerification = !isCompleted; // Only incomplete cache entries are pending

            const downloadItem: CombinedDownload = {
                hash: cachedInfo.hash,
                title: cachedInfo.title,
                name: matchingFolder || cachedInfo.title,
                slug: cachedInfo.slug,
                isActive: false, // Not in backend, so not active
                isFileOnly: false,
                filePath: filePath,
                fileSize: fileSize,
                isPendingVerification: isPendingVerification,
                poster: cachedInfo.poster,
            };

            addedHashes.add(hashLower);

            // Add to appropriate list based on cache completion status
            if (isCompleted) {
                completedList.push(downloadItem);
            } else {
                uncompleted.push(downloadItem);
            }
            
            // Track the folder name so we don't add it as file-only in STEP 3
            const folderNameToTrack = matchingFolder || cachedInfo.title;
            if (folderNameToTrack) {
                usedFolderNames.add(folderNameToTrack.toLowerCase());
            }
        });

        // STEP 3: Add file-only downloads (files not in cache or backend)
        filesByFolder.forEach((files, folderName) => {
            // Skip if this folder name is already used by a download in STEP 1 or STEP 2
            if (usedFolderNames.has(folderName.toLowerCase())) {
                return;
            }
            
            // Skip if already added (has a hash that was processed) - redundant check but kept for safety
            if (addedHashes.has(folderName.toLowerCase())) {
                return;
            }
            
            // Check if this folder matches any cache entry by title (without hash match)
            let hasHashMatch = false;
            for (const info of Object.values(cache) as CachedDownloadInfo[]) {
                if (folderName === info.title || folderName.includes(info.title) || info.title.includes(folderName)) {
                    // If it has a hash and was already added, skip
                    if (info.hash && addedHashes.has(info.hash.toLowerCase())) {
                        hasHashMatch = true;
                        break;
                    }
                }
            }
            
            if (hasHashMatch) {
                return;
            }
            
            const mainFile = files.reduce((prev, current) => 
                current.size > prev.size ? current : prev
            );
            
            // Check if we have cached info for this file
            let cachedInfo: CachedDownloadInfo | null = null;
            for (const info of Object.values(cache) as CachedDownloadInfo[]) {
                if (folderName === info.title || mainFile.path.includes(info.title)) {
                    cachedInfo = info;
                    break;
                }
            }
            
            // If cache entry exists with a hash, skip it
            // It's a real download that should be handled in STEP 2, not as file-only
            // This prevents in-progress downloads from appearing as file-only in completed list
            if (cachedInfo && cachedInfo.hash) {
                return;
            }
            
            // If cache entry exists without hash but is incomplete, skip it
            // It's an in-progress download that shouldn't be treated as file-only
            if (cachedInfo && cachedInfo.isCompleted === false) {
                return;
            }
            
            // Use cache's isCompleted flag - if not in cache, assume completed (legacy file)
            const isCompleted = cachedInfo?.isCompleted ?? true;
            
            const downloadItem: CombinedDownload = {
                title: cachedInfo?.title || folderName,
                name: folderName,
                isActive: false,
                isFileOnly: true,
                filePath: mainFile.path,
                fileSize: mainFile.size,
                isPendingVerification: false, // File-only downloads don't need verification
                poster: cachedInfo?.poster,
            };
            
            if (isCompleted) {
                completedList.push(downloadItem);
            } else {
                uncompleted.push(downloadItem);
            }
        });

        // Sort within each group for stable ordering
        const sortByKey = (a: CombinedDownload, b: CombinedDownload) => {
            const aKey = a.hash || a.name;
            const bKey = b.hash || b.name;
            return aKey.localeCompare(bKey);
        };
        
        uncompleted.sort(sortByKey);
        completedList.sort(sortByKey);

        return { uncompletedDownloads: uncompleted, completedDownloads: completedList };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [downloads, downloadedFiles, cacheValidationVersion]); // Recalculates when downloads, downloadedFiles, or cache validation changes

    // Filter downloads based on search query
    const filteredUncompletedDownloads = useMemo(() => {
        if (!searchQuery.trim()) {
            return uncompletedDownloads;
        }
        const query = searchQuery.toLowerCase().trim();
        return uncompletedDownloads.filter(download => {
            const displayTitle = download.title?.toLowerCase() || download.name?.toLowerCase() || '';
            const name = download.name?.toLowerCase() || '';
            return displayTitle.includes(query) || name.includes(query);
        });
    }, [uncompletedDownloads, searchQuery]);

    const filteredCompletedDownloads = useMemo(() => {
        if (!searchQuery.trim()) {
            return completedDownloads;
        }
        const query = searchQuery.toLowerCase().trim();
        return completedDownloads.filter(download => {
            const displayTitle = download.title?.toLowerCase() || download.name?.toLowerCase() || '';
            const name = download.name?.toLowerCase() || '';
            return displayTitle.includes(query) || name.includes(query);
        });
    }, [completedDownloads, searchQuery]);

    const throttledSetDownloadInfo = useRef(
        throttle((data: DownloadProgressData) => {
            setDownloadsStatus(prev => {
                const existing = prev.find(dl => dl.hash === data.hash);

                return [
                    ...prev.filter(dl => dl.hash !== data.hash),
                    {
                        ...existing,
                        ...data,
                        paused: data.paused ?? existing?.paused ?? false,
                        done: data.done ?? existing?.done ?? false,
                    },
                ];
            });
        }, 500)
    ).current;

    const pauseDownloadHandler = async (hash: string) => {
        setDownloadsStatus(prev =>
            prev.map(d =>
                d.hash === hash ? { ...d, paused: true } : d
            )
        );
        await pauseDownload(hash);
    }

    const resumeDownloadHandler = async (hash: string) => {
        setDownloadsStatus(prev =>
            prev.map(d =>
                d.hash === hash ? { ...d, paused: false } : d
            )
        );
        await resumeDownload(hash);
    }

    const clearTorrentHandler = async (hash: string, dir: string) => {
        try {
            // Remove from local state
            setDownloadsStatus(prev =>
                prev.filter(d => d.hash !== hash)
            );
            
            // Remove from Redux downloads state
            dispatch(removeDownload(hash));
            
            // Remove from completed state (already handled by removeDownload)
            // But ensure it's also removed from completed array
            dispatch(setCompleted(completed.filter(c => c !== hash.toLowerCase())));
            
            // Remove from cache
            removeDownloadInfo(hash);
            
            // Delete from backend (this removes from activeTorrents and deletes directory)
            await deleteDownload(hash, dir);
            
            // Refresh downloaded files to reflect deletion
            if (settings.downloadsFolderPath) {
                dispatch(fetchDownloadedFilesAsync(settings.downloadsFolderPath));
            }
        } catch (error) {
            console.error('Error deleting download:', error);
        }
    }

    const handlePlay = async (slug: string | undefined, hash: string | undefined, title: string, background_image: string, filePath?: string, folderName?: string) => {
        if (!hash) {
            console.warn('Cannot play download without hash');
            return;
        }

        // Check if download is completed (100%) - if so, play from disk
        const cache = getDownloadsCache();
        const cachedInfo = cache[hash.toLowerCase()];
        const isCompleted = cachedInfo?.isCompleted || false;

        if (isCompleted && filePath && folderName) {
            // Play from disk for completed downloads
            await handlePlayFileOnly(filePath, folderName, title);
            return;
        }

        // For in-progress downloads, play via stream
        if (!slug) {
            // For downloads-in-progress that don't have slug yet, we might still be able to play
            // if they're active torrents. Let's try with a generic slug or wait for it.
            console.warn('Slug not available for download, attempting to play anyway');
        }
        
        const res = await playTorrent(hash);
        if (res.status === 200 && slug) {
            navigate(`/stream/${slug}?hash=${hash}&title=${title}&poster=${background_image}`, {
                state: {
                    from: '/downloads'
                }
            });
        }
    }

    const handlePlayFileOnly = async (filePath: string, folderName: string, title: string) => {
        // For file-only downloads, stream directly from file path using the backend endpoint
        const fullPath = `${settings.downloadsFolderPath}/${filePath}`;
        const streamUrl = `${API_URL}/stream/file/stream?path=${encodeURIComponent(fullPath)}`;
        
        // Navigate to watch page with the stream URL and navigation state
        navigate(`/watch-file?src=${encodeURIComponent(streamUrl)}&title=${encodeURIComponent(title)}`, {
            state: {
                from: '/downloads'
            }
        });
    }

    const handleDeleteFileOnly = async (folderName: string) => {
        try {
            // Find the file in downloadedFiles
            const fileToDelete = downloadedFiles.find(f => {
                const folderNameFromPath = f.path.split(/[/\\]/)[0] || f.path;
                return folderNameFromPath === folderName;
            });
            
            // Remove from downloadedFiles state
            if (fileToDelete) {
                // Remove all files in this folder
                downloadedFiles.forEach(file => {
                    const folderNameFromPath = file.path.split(/[/\\]/)[0] || file.path;
                    if (folderNameFromPath === folderName) {
                        dispatch(removeDownloadedFile(file.path));
                    }
                });
            }
            
            // Check cache for any matching download info
            const cache = getDownloadsCache();
            for (const [hash, info] of Object.entries(cache)) {
                if (info.title === folderName) {
                    removeDownloadInfo(hash);
                }
            }
            
            // Delete the directory from disk via backend
            const dirToDelete = `${settings.downloadsFolderPath}/${folderName}`;
            await deleteDownload('', dirToDelete); // Empty hash for file-only deletes
            
            // Refresh downloaded files to reflect deletion
            if (settings.downloadsFolderPath) {
                dispatch(fetchDownloadedFilesAsync(settings.downloadsFolderPath));
            }
        } catch (error) {
            console.error('Error deleting file-only download:', error);
        }
    }

    useEffect(() => {
        if (!socket?.id) return;

        const handleProgress = (data: DownloadProgressData) => {
            // Check if download is completed (100% or done flag)
            const isCompleted = data.done || (data.progress !== undefined && data.progress >= 1.0);
            const hashLower = data.hash.toLowerCase();
            
            if (isCompleted) {
                // Only process completion once per download
                if (!completedFetchedRef.current.has(hashLower)) {
                    completedFetchedRef.current.add(hashLower);
                    
                    dispatch(setCompleted([...completed.filter(c => c !== hashLower), hashLower]));
                    // Update cache to mark as completed
                    updateDownloadCompletion(data.hash, true);
                    // Trigger re-render to reflect cache update
                    setCacheValidationVersion(prev => prev + 1);
                    
                    // Debounce fetch to avoid multiple rapid calls
                    // Clear any existing timeout
                    if (fetchTimeoutRef.current) {
                        clearTimeout(fetchTimeoutRef.current);
                    }
                    // Schedule fetch after a short delay (only if not already pending)
                    fetchTimeoutRef.current = setTimeout(() => {
                        dispatch(fetchAllDownloadsAsync());
                        fetchTimeoutRef.current = null;
                    }, 500); // Small delay to batch multiple completions
                }
            }

            // Cache download progress for better UX (persists across page reloads)
            updateDownloadProgress(
                data.hash,
                data.progress || 0,
                data.speed || 0,
                data.peers || 0,
                data.downloaded || 0,
                data.timeRemaining || 0,
                data.paused || false
            );

            throttledSetDownloadInfo({
                ...data,
                downloaded: data.downloaded || 0,
                peers: data.peers || 0,
                timeRemaining: data.timeRemaining || 0,
                fileName: data.fileName || '',
                done: isCompleted, // Use computed isCompleted
                paused: data.paused || false,
            } satisfies DownloadProgressData);
        }

        const handleNewDownload = () => {
            // When a new download is added (including restored downloads), refetch the downloads list
            // This ensures the UI shows the newly restored download
            dispatch(fetchAllDownloadsAsync());
        }

        socket.on('downloadProgress', handleProgress);
        socket.on('downloadDone', (data: DownloadProgressData) => {
            // downloadDone event also triggers handleProgress, which handles completion logic
            // So we don't need to duplicate the logic here
            handleProgress(data);
        });
        socket.on('newDownload', handleNewDownload);

        return () => {
            socket.off('downloadProgress', handleProgress);
            socket.off('downloadDone', handleProgress);
            socket.off('newDownload', handleNewDownload);
            // Clear any pending fetch timeout
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current);
                fetchTimeoutRef.current = null;
            }
        }
    }, [
        socket,
        throttledSetDownloadInfo,
        completed,
        dispatch,
    ]);

  return (
    <Page>
        <Container id='downloadsPage' className='grow'>
            <PageTitle>
                <BackButton cb={() => navigate (-1)} />
                <span className='grow -mt-1'>Downloads</span>
            </PageTitle>

            <PageDescription>All your active and completed downloads in one place. Track progress, and start streaming when ready.</PageDescription>

            {/* Search Bar */}
            <form
                onSubmit={(ev: FormEvent<HTMLFormElement>) => {
                    ev.preventDefault();
                }}
                className='flex items-center w-full md:w-fit justify-end mb-4'
            >
                <input
                    type="search"
                    id='downloadsSearchInput'
                    autoComplete='off'
                    placeholder='Search downloads...'
                    className='text-black text-sm font-semibold px-1 py-1 placeholder:opacity-75 outline-none rounded-l-sm bg-white w-full md:w-[200px] md:focus:w-[320px] lg:w-[320px] lg:focus:w-[440px] transition-all duration-100'
                    value={searchQuery}
                    onChange={(ev: ChangeEvent<HTMLInputElement>) => setSearchQuery(ev.target.value)}
                />

                <Button
                    type='submit'
                    title='Search'
                    disabled={!searchQuery.length}
                    className={twMerge(`
                        bg-gray-50
                        hover:bg-blue-400
                        hover:text-white
                        border-stone-200
                        text-stone-800
                        p-1
                        text-xl
                        rounded-tl-none
                        rounded-bl-none
                        disabled:bg-gray-300
                        disabled:hover:bg-gray-300
                        disabled:hover:text-stone-500
                        disabled:text-stone-500
                    `)}
                >
                    <BiSearch />
                </Button>
            </form>

            <hr className='lg:w-1/2 md:w-3/4 w-full' />
            {(filteredUncompletedDownloads.length > 0 || filteredCompletedDownloads.length > 0)
                ?   <div className='flex flex-col gap-6 lg:w-1/2 md:w-3/4 w-full'>
                        {/* Uncompleted Downloads Section */}
                        {filteredUncompletedDownloads.length > 0 && (
                            <div className='flex flex-col gap-3'>
                                <h2 className='text-xl font-semibold text-stone-300'>In Progress ({filteredUncompletedDownloads.length})</h2>
                                <div className='flex flex-col gap-2'>
                                    {filteredUncompletedDownloads.map((d) => {
                                        // Render function for download item
                                        const renderDownloadItem = (download: typeof d, isCompleted: boolean) => {
                                            const key = download.hash || `file-${download.name}`;
                                            const hasHash = !!download.hash;
                                            const fileOnly = download.isFileOnly;
                                            
                                            const cache = getDownloadsCache();
                                            let cachedInfo: CachedDownloadInfo | null = null;
                                            
                                            if (download.hash) {
                                                cachedInfo = cache[download.hash.toLowerCase()];
                                            }
                                            
                                            if (!cachedInfo) {
                                                for (const info of Object.values(cache) as CachedDownloadInfo[]) {
                                                    if (download.name === info.title || 
                                                        download.title === info.title || 
                                                        download.name.includes(info.title) ||
                                                        info.title.includes(download.name)) {
                                                        cachedInfo = info;
                                                        break;
                                                    }
                                                }
                                            }
                                            
                                            let fileProgress = 100;
                                            if (cachedInfo) {
                                                if (fileOnly && download.fileSize && cachedInfo.sizeBytes) {
                                                    fileProgress = download.fileSize >= cachedInfo.sizeBytes ? 100 : (download.fileSize / cachedInfo.sizeBytes) * 100;
                                                }
                                            }
                                            
                                            const displayTitle = cachedInfo?.title || download.title || download.name;
                                            let progress = hasHash ? bufferWidth(download.hash!) : fileProgress;
                                            // Use cache progress if available (especially for completed downloads)
                                            // This handles cases where download completes and is removed from active downloads
                                            if (hasHash) {
                                                if (progress === 0 && cachedInfo?.progress !== undefined) {
                                                    progress = cachedInfo.progress * 100;
                                                } else if (isCompleted && cachedInfo?.isCompleted && cachedInfo.progress !== undefined) {
                                                    // If marked as completed in cache, ensure progress shows 100%
                                                    progress = Math.max(progress, cachedInfo.progress * 100);
                                                }
                                            }
                                            
                                            const downloading = hasHash ? isDownloading(download.hash!) : false;
                                            let paused = hasHash ? isPaused(download.hash!) : false;
                                            if (hasHash && paused === false) {
                                                const liveStatus = downloadsStatus.find(s => s.hash === download.hash);
                                                if (!liveStatus && cachedInfo?.paused !== undefined) {
                                                    paused = cachedInfo.paused;
                                                }
                                            }
                                            let speed = hasHash ? downloadSpeed(download.hash!) : null;
                                            if (hasHash && !speed && cachedInfo?.speed !== undefined && cachedInfo.speed > 0) {
                                                speed = formatBytesPerSecond(cachedInfo.speed);
                                            }
                                            
                                            // Get peers and time remaining from live status or cache
                                            const liveStatusForInfo = hasHash ? downloadsStatus.find(s => s.hash === download.hash) : null;
                                            const peers = liveStatusForInfo?.peers ?? cachedInfo?.peers ?? null;
                                            const timeRemaining = liveStatusForInfo?.timeRemaining ?? cachedInfo?.timeRemaining ?? null;

                                            const isPendingVerification = download.isPendingVerification === true;
                                            const posterUrl = cachedInfo?.poster || download.poster;

                                            return (
                                                <div 
                                                    key={key} 
                                                    className={twMerge(
                                                        'flex gap-4 w-full bg-stone-800 rounded-sm p-4 transition-opacity duration-200',
                                                        (posterUrl || isPendingVerification) ? 'relative' : '',
                                                        isPendingVerification 
                                                            ? 'opacity-50 pointer-events-none' 
                                                            : 'opacity-80 hover:opacity-100 hover:bg-zinc-800'
                                                    )}
                                                >
                                                    {/* Loading overlay when pending verification */}
                                                    {isPendingVerification && (
                                                        <div className='absolute inset-0 flex flex-col items-center justify-center z-10 bg-stone-900/80 rounded-sm'>
                                                            <LoadingIcon size={30} className='!opacity-100' />
                                                            <p className='text-sm text-white font-medium mt-2 opacity-100'>Loading...</p>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Poster Image */}
                                                    {posterUrl && (
                                                        <div className='flex-shrink-0'>
                                                            <img
                                                                src={posterUrl}
                                                                alt={displayTitle}
                                                                className='aspect-[2/3] w-[100px] md:w-[150px] object-cover rounded-sm'
                                                            />
                                                        </div>
                                                    )}
                                                    
                                                    {/* Download Info */}
                                                    <div className='flex flex-col gap-1 flex-1 min-w-0'>
                                                    <div className='flex justify-between w-full'>
                                                        <p className='text-stone-300 font-medium text-lg flex justify-between'>
                                                            {displayTitle}
                                                        </p>
                                                        
                                                        <div className='flex gap-1 items-start'>
                                                            {isCompleted
                                                                ?   <Button className='aspect-square cursor-default' title='Download complete'><MdFileDownloadDone /></Button>
                                                                :   <>
                                                                        {paused
                                                                            ?   <Button
                                                                                    className='aspect-square hover:bg-stone-600'
                                                                                    title='Resume download'
                                                                                    onClick={() => download.hash && resumeDownloadHandler(download.hash)}
                                                                                    disabled={isPendingVerification}
                                                                                >
                                                                                    <BsPlay />
                                                                                </Button>
                                                                            :   <Button
                                                                                    className='aspect-square hover:bg-stone-600'
                                                                                    title='Pause download'
                                                                                    onClick={() => download.hash && pauseDownloadHandler(download.hash)}
                                                                                    disabled={isPendingVerification}
                                                                                >
                                                                                    <BsPause />
                                                                                </Button>
                                                                        }
                                                                    </>
                                                            }
                                                            <Button
                                                                className='aspect-square hover:bg-stone-600'
                                                                title='Clear download'
                                                                onClick={() => {
                                                                    if (hasHash && download.hash) {
                                                                        clearTorrentHandler(download.hash, `${settings.downloadsFolderPath}/${download.name}`);
                                                                    } else {
                                                                        handleDeleteFileOnly(download.name);
                                                                    }
                                                                }}
                                                                disabled={isPendingVerification}
                                                            >
                                                                <BsTrash />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <p className='text-sm font-light italic text-stone-500'>{download.name}</p>
                                                    {fileOnly && download.fileSize && (
                                                        <p className='text-xs font-light italic text-stone-400'>
                                                            File size: {formatBytes(download.fileSize)}
                                                            {cachedInfo?.sizeBytes && (
                                                                <span> / {formatBytes(cachedInfo.sizeBytes)}</span>
                                                            )}
                                                        </p>
                                                    )}

                                                    {(hasHash || (fileOnly && !isCompleted)) && (
                                                        <div className='w-full flex flex-col gap-0.5'>
                                                            <div className='relative w-full bg-stone-900 h-1'>
                                                                <div
                                                                    className={twMerge(`absolute left-0 top-0 h-1 transition-colors duration-150 ${paused ? 'bg-blue-300' : 'bg-blue-500'}`)}
                                                                    style={{
                                                                        width: `${Math.min(progress, 100)}%`,
                                                                        willChange: 'width',
                                                                    }}
                                                                />
                                                            </div>
                                                            <p className='text-xs italic text-stone-200 font-light flex justify-between'>
                                                                <span>
                                                                    {!isCompleted
                                                                        ? `In progress (${progress.toFixed(0)}%)`
                                                                        : 'Completed'
                                                                    }
                                                                </span>
                                                                {downloading && speed ? <span>{speed}</span> : !isCompleted && paused && <span>Paused</span>}
                                                            </p>
                                                            {/* Show peers and time remaining when downloading (not paused) */}
                                                            {!isCompleted && downloading && !paused && hasHash && (
                                                                <div className='flex flex-col gap-0.5 text-xs font-light text-stone-400'>
                                                                    {peers !== null && (
                                                                        <p>Active peers: {peers}</p>
                                                                    )}
                                                                    {timeRemaining !== null && timeRemaining > 0 && (
                                                                        <p>Time remaining: {msToReadableTime(timeRemaining)}</p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {fileOnly && isCompleted && (
                                                        <p className='text-xs italic text-stone-400 font-light'>Completed (file only)</p>
                                                    )}

                                                    {/* Buttons - positioned at bottom right when poster exists, otherwise normal flow */}
                                                    <div className={twMerge(
                                                        'flex gap-2 pt-2',
                                                        posterUrl 
                                                            ? 'absolute bottom-4 right-4' 
                                                            : 'w-full justify-end'
                                                    )}>
                                                        <Button 
                                                            onClick={() => window.electronAPI.openFolder(`${settings.downloadsFolderPath}/${download.name}`)} 
                                                            className='text-stone-400 hover:text-stone-200 bg-transparent hover:bg-stone-700 text-sm'
                                                            disabled={isPendingVerification}
                                                        >
                                                            Open folder
                                                        </Button>
                                                        {hasHash && download.hash && (
                                                            <Button 
                                                                onClick={() => handlePlay(download.slug, download.hash, download.title, '', download.filePath, download.name)} 
                                                                className='text-blue-500 hover:text-blue-400 font-medium text-sm'
                                                                disabled={!download.slug || isPendingVerification}
                                                                title={!download.slug ? 'Slug not available yet' : 'Watch now'}
                                                            >
                                                                Watch now
                                                            </Button>
                                                        )}
                                                        {fileOnly && download.filePath && !download.hash && isCompleted && (
                                                            <Button 
                                                                onClick={() => handlePlayFileOnly(download.filePath!, download.name, download.title)} 
                                                                className='text-blue-500 hover:text-blue-400 font-medium text-sm'
                                                                disabled={isPendingVerification}
                                                            >
                                                                Watch now
                                                            </Button>
                                                        )}
                                                    </div>
                                                    </div>
                                                </div>
                                            );
                                        };

                                        return renderDownloadItem(d, false);
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Completed Downloads Section */}
                        {filteredCompletedDownloads.length > 0 && (
                            <div className='flex flex-col gap-3'>
                                <h2 className='text-xl font-semibold text-stone-300'>Completed ({filteredCompletedDownloads.length})</h2>
                                <div className='flex flex-col gap-2'>
                                    {filteredCompletedDownloads.map((d) => {
                                        // Render function for download item
                                        const renderDownloadItem = (download: typeof d, isCompleted: boolean) => {
                                            const key = download.hash || `file-${download.name}`;
                                            const hasHash = !!download.hash;
                                            const fileOnly = download.isFileOnly;
                                            
                                            const cache = getDownloadsCache();
                                            let cachedInfo: CachedDownloadInfo | null = null;
                                            
                                            if (download.hash) {
                                                cachedInfo = cache[download.hash.toLowerCase()];
                                            }
                                            
                                            if (!cachedInfo) {
                                                for (const info of Object.values(cache) as CachedDownloadInfo[]) {
                                                    if (download.name === info.title || 
                                                        download.title === info.title || 
                                                        download.name.includes(info.title) ||
                                                        info.title.includes(download.name)) {
                                                        cachedInfo = info;
                                                        break;
                                                    }
                                                }
                                            }
                                            
                                            let fileProgress = 100;
                                            if (cachedInfo) {
                                                if (fileOnly && download.fileSize && cachedInfo.sizeBytes) {
                                                    fileProgress = download.fileSize >= cachedInfo.sizeBytes ? 100 : (download.fileSize / cachedInfo.sizeBytes) * 100;
                                                }
                                            }
                                            
                                            const displayTitle = cachedInfo?.title || download.title || download.name;
                                            let progress = hasHash ? bufferWidth(download.hash!) : fileProgress;
                                            // Use cache progress if available (especially for completed downloads)
                                            // This handles cases where download completes and is removed from active downloads
                                            if (hasHash) {
                                                if (progress === 0 && cachedInfo?.progress !== undefined) {
                                                    progress = cachedInfo.progress * 100;
                                                } else if (isCompleted && cachedInfo?.isCompleted && cachedInfo.progress !== undefined) {
                                                    // If marked as completed in cache, ensure progress shows 100%
                                                    progress = Math.max(progress, cachedInfo.progress * 100);
                                                }
                                            }
                                            
                                            const downloading = hasHash ? isDownloading(download.hash!) : false;
                                            let paused = hasHash ? isPaused(download.hash!) : false;
                                            if (hasHash && paused === false) {
                                                const liveStatus = downloadsStatus.find(s => s.hash === download.hash);
                                                if (!liveStatus && cachedInfo?.paused !== undefined) {
                                                    paused = cachedInfo.paused;
                                                }
                                            }
                                            let speed = hasHash ? downloadSpeed(download.hash!) : null;
                                            if (hasHash && !speed && cachedInfo?.speed !== undefined && cachedInfo.speed > 0) {
                                                speed = formatBytesPerSecond(cachedInfo.speed);
                                            }
                                            
                                            // Get peers and time remaining from live status or cache
                                            const liveStatusForInfo = hasHash ? downloadsStatus.find(s => s.hash === download.hash) : null;
                                            const peers = liveStatusForInfo?.peers ?? cachedInfo?.peers ?? null;
                                            const timeRemaining = liveStatusForInfo?.timeRemaining ?? cachedInfo?.timeRemaining ?? null;

                                            const isPendingVerification = download.isPendingVerification === true;
                                            const posterUrl = cachedInfo?.poster || download.poster;

                                            return (
                                                <div 
                                                    key={key} 
                                                    className={twMerge(
                                                        'flex gap-4 w-full bg-stone-800 rounded-sm p-4 transition-opacity duration-200',
                                                        (posterUrl || isPendingVerification) ? 'relative' : '',
                                                        isPendingVerification 
                                                            ? 'opacity-50 pointer-events-none' 
                                                            : 'opacity-80 hover:opacity-100 hover:bg-zinc-800'
                                                    )}
                                                >
                                                    {/* Loading overlay when pending verification */}
                                                    {isPendingVerification && (
                                                        <div className='absolute inset-0 flex flex-col items-center justify-center z-10 bg-stone-900/80 rounded-sm'>
                                                            <LoadingIcon size={30} className='!opacity-100' />
                                                            <p className='text-sm text-white font-medium mt-2 opacity-100'>Loading...</p>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Poster Image */}
                                                    {posterUrl && (
                                                        <div className='flex-shrink-0'>
                                                            <img
                                                                src={posterUrl}
                                                                alt={displayTitle}
                                                                className='aspect-[2/3] w-[100px] md:w-[150px] object-cover rounded-sm'
                                                            />
                                                        </div>
                                                    )}
                                                    
                                                    {/* Download Info */}
                                                    <div className='flex flex-col gap-1 flex-1 min-w-0'>
                                                    <div className='flex justify-between w-full'>
                                                        <p className='text-stone-300 font-medium text-lg flex justify-between'>
                                                            {displayTitle}
                                                        </p>
                                                        
                                                        <div className='flex gap-1 items-start'>
                                                            {isCompleted
                                                                ?   <Button className='aspect-square cursor-default' title='Download complete'><MdFileDownloadDone /></Button>
                                                                :   <>
                                                                        {paused
                                                                            ?   <Button
                                                                                    className='aspect-square hover:bg-stone-600'
                                                                                    title='Resume download'
                                                                                    onClick={() => download.hash && resumeDownloadHandler(download.hash)}
                                                                                    disabled={isPendingVerification}
                                                                                >
                                                                                    <BsPlay />
                                                                                </Button>
                                                                            :   <Button
                                                                                    className='aspect-square hover:bg-stone-600'
                                                                                    title='Pause download'
                                                                                    onClick={() => download.hash && pauseDownloadHandler(download.hash)}
                                                                                    disabled={isPendingVerification}
                                                                                >
                                                                                    <BsPause />
                                                                                </Button>
                                                                        }
                                                                    </>
                                                            }
                                                            <Button
                                                                className='aspect-square hover:bg-stone-600'
                                                                title='Clear download'
                                                                onClick={() => {
                                                                    if (hasHash && download.hash) {
                                                                        clearTorrentHandler(download.hash, `${settings.downloadsFolderPath}/${download.name}`);
                                                                    } else {
                                                                        handleDeleteFileOnly(download.name);
                                                                    }
                                                                }}
                                                                disabled={isPendingVerification}
                                                            >
                                                                <BsTrash />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <p className='text-sm font-light italic text-stone-500'>{download.name}</p>
                                                    {fileOnly && download.fileSize && (
                                                        <p className='text-xs font-light italic text-stone-400'>
                                                            File size: {formatBytes(download.fileSize)}
                                                            {cachedInfo?.sizeBytes && (
                                                                <span> / {formatBytes(cachedInfo.sizeBytes)}</span>
                                                            )}
                                                        </p>
                                                    )}

                                                    {(hasHash || (fileOnly && !isCompleted)) && (
                                                        <div className='w-full flex flex-col gap-0.5'>
                                                            <div className='relative w-full bg-stone-900 h-1'>
                                                                <div
                                                                    className={twMerge(`absolute left-0 top-0 h-1 transition-colors duration-150 ${paused ? 'bg-blue-300' : 'bg-blue-500'}`)}
                                                                    style={{
                                                                        width: `${Math.min(progress, 100)}%`,
                                                                        willChange: 'width',
                                                                    }}
                                                                />
                                                            </div>
                                                            <p className='text-xs italic text-stone-200 font-light flex justify-between'>
                                                                <span>
                                                                    {!isCompleted
                                                                        ? `In progress (${progress.toFixed(0)}%)`
                                                                        : 'Completed'
                                                                    }
                                                                </span>
                                                                {downloading && speed ? <span>{speed}</span> : !isCompleted && paused && <span>Paused</span>}
                                                            </p>
                                                            {/* Show peers and time remaining when downloading (not paused) */}
                                                            {!isCompleted && downloading && !paused && hasHash && (
                                                                <div className='flex flex-col gap-0.5 text-xs font-light text-stone-400'>
                                                                    {peers !== null && (
                                                                        <p>Active peers: {peers}</p>
                                                                    )}
                                                                    {timeRemaining !== null && timeRemaining > 0 && (
                                                                        <p>Time remaining: {msToReadableTime(timeRemaining)}</p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {fileOnly && isCompleted && (
                                                        <p className='text-xs italic text-stone-400 font-light'>Completed (file only)</p>
                                                    )}

                                                    {/* Buttons - positioned at bottom right when poster exists, otherwise normal flow */}
                                                    <div className={twMerge(
                                                        'flex gap-2 pt-2',
                                                        posterUrl 
                                                            ? 'absolute bottom-4 right-4' 
                                                            : 'w-full justify-end'
                                                    )}>
                                                        <Button 
                                                            onClick={() => window.electronAPI.openFolder(`${settings.downloadsFolderPath}/${download.name}`)} 
                                                            className='text-stone-400 hover:text-stone-200 bg-transparent hover:bg-stone-700 text-sm'
                                                            disabled={isPendingVerification}
                                                        >
                                                            Open folder
                                                        </Button>
                                                        {hasHash && download.hash && (
                                                            <Button 
                                                                onClick={() => handlePlay(download.slug, download.hash, download.title, '', download.filePath, download.name)} 
                                                                className='text-blue-500 hover:text-blue-400 font-medium text-sm'
                                                                disabled={!download.slug || isPendingVerification}
                                                                title={!download.slug ? 'Slug not available yet' : 'Watch now'}
                                                            >
                                                                Watch now
                                                            </Button>
                                                        )}
                                                        {fileOnly && download.filePath && !download.hash && isCompleted && (
                                                            <Button 
                                                                onClick={() => handlePlayFileOnly(download.filePath!, download.name, download.title)} 
                                                                className='text-blue-500 hover:text-blue-400 font-medium text-sm'
                                                                disabled={isPendingVerification}
                                                            >
                                                                Watch now
                                                            </Button>
                                                        )}
                                                    </div>
                                                    </div>
                                                </div>
                                            );
                                        };

                                        return renderDownloadItem(d, true);
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                : <p className='text-stone-600 font-semibold italic'>No downloads</p>}
        </Container>
    </Page>
  )
}

export default DownloadsPage;
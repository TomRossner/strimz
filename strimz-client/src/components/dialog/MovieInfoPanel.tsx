import React, { useEffect, useMemo, useRef, useState } from 'react';
import throttle from 'lodash.throttle';
import { AnimatePresence, motion } from 'framer-motion';
import TitleWrapper from './TitleWrapper';
import CloseButton from '../CloseButton';
import { Movie } from '../MovieCard';
import { DiskSpaceInfo, DownloadProgressData, Torrent } from '../../utils/types';
import { formatBytes, formatBytesPerSecond } from '@/utils/bytes';
import { msToReadableTime } from '@/utils/formatTime';
import QualitySelector from './QualitySelector';
import TorrentSelector from './TorrentSelector';
import FileSize from './FileSize';
import PlayButton from './PlayButton';
import MobileCoverSpacer from './MobileCoverSpacer';
import Metadata from './Metadata';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setAvailableSubtitlesLanguages, setSelectedMovie, setSelectedTorrent, setSubtitleFilePath, setSubtitleLang, setUnavailableSubtitlesLanguages, setSelectedSubtitleFileId, setIsSubtitlesEnabled } from '@/store/movies/movies.slice';
import { closeModal } from '@/store/modals/modals.slice';
import { selectSettings } from '@/store/settings/settings.selectors';
import { downloadSubtitleFromApi } from '@/services/subtitles';
import { selectAvailableSubtitlesLanguages, selectSubtitleFilePath, selectSubtitleLang, selectLanguageFiles, selectSelectedSubtitleFileId, selectSelectedTorrent } from '@/store/movies/movies.selectors';
import SubtitlesSelector from './SubtitlesSelector';
import { addNewTorrent, pauseDownload, playTorrent, resumeDownload } from '@/services/movies';
import { BsPause, BsPlay } from 'react-icons/bs';
import { selectSocket } from '@/store/socket/socket.selectors';
import { fetchAllDownloadsAsync } from '@/store/downloads/downloads.slice';
import { getDownloadsCache, saveDownloadPoster } from '@/utils/downloadsCache';
import { toOpenSubtitlesCode, getSubtitleMetadata, normalizeLanguageCode } from '@/utils/detectLanguage';
import { getMovieSuggestions } from '@/services/suggestions';
import MovieCard from '../MovieCard';
import { getMoviesByIds } from '@/services/movies';
import Cast from './Cast';
import Button from '../Button';
import { MdFileDownloadDone } from 'react-icons/md';

type MovieInfoPanelTab = 'general' | 'cast' | 'suggestions';

const torrentList = (torrents: object[] | undefined): Torrent[] =>
    (Array.isArray(torrents) ? torrents : []).filter((torrent): torrent is Torrent => Boolean(torrent && (torrent as Torrent).hash));

const bestTorrent = (torrents: Torrent[], quality?: string) => {
    const matching = quality ? torrents.filter((torrent) => torrent.quality === quality) : torrents;
    const order = ['1080p', '720p', '2160p', '1080p.x265', '480p'];
    if (!quality) {
        for (const preferred of order) {
            const match = matching.filter((torrent) => torrent.quality === preferred).sort((a, b) => (b.seeds || 0) - (a.seeds || 0))[0];
            if (match) return match;
        }
    }
    return [...matching].sort((a, b) => (b.seeds || 0) - (a.seeds || 0))[0];
};

const selectionForMovie = (torrents: object[] | undefined, remembered: Torrent | null) => {
    const list = torrentList(torrents);
    const saved = remembered && list.find((torrent) => torrent.hash.toLowerCase() === remembered.hash.toLowerCase());
    const torrent = saved || bestTorrent(list);
    return {
        quality: torrent?.quality || '',
        hash: torrent?.hash || '',
    };
};

function ensureGenres(m: Record<string, unknown>): string[] {
    const raw = m.genres ?? m.genre;
    if (Array.isArray(raw) && raw.length > 0) {
        const first = raw[0];
        if (typeof first === 'string') return raw as string[];
        if (typeof first === 'object' && first !== null && 'name' in first) {
            return (raw as { name: string }[]).map((g) => g.name);
        }
    }
    if (typeof raw === 'string' && raw.trim()) {
        const split = raw.split(/[,/]/).map((s) => s.trim()).filter(Boolean);
        return split.length > 0 ? split : [raw.trim()];
    }
    return [];
}

interface MovieInfoPanelProps {
    movie: Movie;
    close: () => void;
    isLoadingSubtitles?: boolean;
}

const MovieInfoPanel = ({movie, close, isLoadingSubtitles = false}: MovieInfoPanelProps) => {
    const {
        torrents,
        slug,
        background_image,
        large_cover_image,
        medium_cover_image,
        small_cover_image,
        title
    } = movie;

    const [activeTab, setActiveTab] = useState<MovieInfoPanelTab>('general');

    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const storedTorrent = useAppSelector(selectSelectedTorrent);
    const storedTorrentRef = useRef(storedTorrent);
    storedTorrentRef.current = storedTorrent;
    const initialSelection = selectionForMovie(torrents, storedTorrent);
    const [hash, setHash] = useState<string>(initialSelection.hash);
    const [selectedQuality, setSelectedQuality] = useState<string>(initialSelection.quality);
    const availableSubsLanguages = useAppSelector(selectAvailableSubtitlesLanguages);
    const languageFiles = useAppSelector(selectLanguageFiles);
    const [isDownloadingSubs, setIsDownloadingSubs] = useState<boolean>(false);
    const [downloadProgress, setDownloadProgress] = useState<DownloadProgressData | null>(null);
    const subtitleLang = useAppSelector(selectSubtitleLang);
    const subtitleFilePath = useAppSelector(selectSubtitleFilePath);
    const selectedSubtitleFileId = useAppSelector(selectSelectedSubtitleFileId);
    const settings = useAppSelector(selectSettings);
    const socket = useAppSelector(selectSocket);

    // Convert ISO3 language codes from API to "code-label" format expected by SubtitlesDropdown
    // Prioritize common languages from COMMON_LANGUAGES
    const formattedLanguages = useMemo(() => {
        // Use availableSubsLanguages if available, otherwise use languageFiles keys
        const languageCodes = availableSubsLanguages.length > 0 
            ? availableSubsLanguages 
            : Object.keys(languageFiles);
        
        // Extract ISO3 codes from COMMON_LANGUAGES (format: "eng-English" -> "eng")
        const commonIso3Codes = ['eng', 'fra', 'spa', 'deu', 'ita', 'rus', 'jpn', 'ara', 'heb', 'hin'];
        
        // Separate common and other languages
        const commonLanguages: string[] = [];
        const otherLanguages: string[] = [];
        
        languageCodes.forEach(iso3 => {
            const normalized = normalizeLanguageCode(iso3);
            const metadata = getSubtitleMetadata(iso3);
            // Skip languages that don't have a proper label (show as "Subtitles")
            if (!metadata || metadata.label === 'Subtitles') {
                return;
            }
            const label = metadata.label;
            const code = toOpenSubtitlesCode(iso3);
            const formatted = `${code}-${label}`;
            
            if (commonIso3Codes.includes(normalized)) {
                commonLanguages.push(formatted);
            } else {
                otherLanguages.push(formatted);
            }
        });
        
        // Sort common languages by COMMON_LANGUAGES order, then add others
        const sortedCommon = commonLanguages.sort((a, b) => {
            const aCode = normalizeLanguageCode(a.split('-')[0]);
            const bCode = normalizeLanguageCode(b.split('-')[0]);
            const aIndex = commonIso3Codes.indexOf(aCode);
            const bIndex = commonIso3Codes.indexOf(bCode);
            return aIndex - bIndex;
        });
        
        // Sort other languages alphabetically
        const sortedOther = otherLanguages.sort();
        
        return [...sortedCommon, ...sortedOther];
    }, [availableSubsLanguages, languageFiles]);

    const canStream = Array.isArray(torrents) && torrents.length > 0;

    const selectedTorrent: Torrent | null = useMemo(() => {
        const torrents = movie?.torrents as Torrent[];

        if (Array.isArray(torrents) && hash && selectedQuality) {
            const torrent: Torrent | undefined = torrents.find(t => (t.quality === selectedQuality) && (t.hash === hash));
            
            if (torrent) {
                dispatch(setSelectedTorrent(torrent));
            }

            return torrent || null;
        }

        return null;
    }, [hash, selectedQuality, movie?.torrents, dispatch]);

    const [diskSpace, setDiskSpace] = useState<DiskSpaceInfo | null>(null);
    const [suggestions, setSuggestions] = useState<Movie[]>([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false);

    // Check if this movie has already been downloaded (completed)
    const downloadedMovieInfo = useMemo(() => {
        const cache = getDownloadsCache();
        // Find all completed downloads for this movie by matching slug
        const completedDownloads = Object.values(cache).filter(
            (info) => info.slug === slug && info.isCompleted === true
        );
        
        if (completedDownloads.length > 0) {
            // Return the first completed download (or the one with highest quality if needed)
            // Sort by quality to get the best quality first
            const qualityOrder = ['2160p', '1080p', '720p', '480p', '360p'];
            const sorted = completedDownloads.sort((a, b) => {
                const aIndex = qualityOrder.indexOf(a.quality) !== -1 ? qualityOrder.indexOf(a.quality) : 999;
                const bIndex = qualityOrder.indexOf(b.quality) !== -1 ? qualityOrder.indexOf(b.quality) : 999;
                return aIndex - bIndex;
            });
            return sorted[0];
        }
        return null;
    }, [slug]);

    const fileSizeInBytes = selectedTorrent ? selectedTorrent.size_bytes : 0;

    const hasEnoughSpace = diskSpace
        ? diskSpace.free >= fileSizeInBytes
        : null;

    const handleClose = () => {
        close();
        setHash('');
        setSelectedQuality('');
        dispatch(setSubtitleFilePath(null));
    }

    const handleSuggestionClick = async (suggestionMovie: Movie) => {
        // Fetch full movie details to ensure all image fields are present
        try {
            const response = await getMoviesByIds([suggestionMovie.id]);
            if (response.data?.movies && response.data.movies.length > 0) {
                const fullMovie = response.data.movies[0] as Movie & Record<string, unknown>;
                const genres = ensureGenres(fullMovie);
                const movieToSet: Movie = {
                    ...fullMovie,
                    genres: genres.length > 0 ? genres : (suggestionMovie.genres ?? []),
                };
                
                // Preload images for faster display
                if (fullMovie.large_cover_image) {
                    const coverImg = new Image();
                    coverImg.src = fullMovie.large_cover_image;
                }
                if (fullMovie.background_image) {
                    const bgImg = new Image();
                    bgImg.src = fullMovie.background_image;
                }
                
                dispatch(setSelectedMovie(movieToSet));
            } else {
                // Fallback to suggestion movie if full details not available
                dispatch(setSelectedMovie(suggestionMovie));
            }
        } catch (error) {
            console.error('Failed to fetch full movie details:', error);
            // Fallback to suggestion movie on error
            dispatch(setSelectedMovie(suggestionMovie));
        }
    }

    const handleTorrentSelect = (hash: string) => {
        setHash(hash);
    }

    const handleQualityChange = (quality: string) => {
        const torrent = bestTorrent(torrentList(movie.torrents), quality);
        setSelectedQuality(quality);
        setHash(torrent?.hash || '');
    }

    useEffect(() => {
        const list = torrentList(movie.torrents);
        const current = list.find((torrent) => torrent.hash === hash && torrent.quality === selectedQuality);
        if (current) return;
        const next = selectionForMovie(list, storedTorrentRef.current);
        setSelectedQuality(next.quality);
        setHash(next.hash);
    }, [movie.id, movie.torrents, hash, selectedQuality]);

    const handlePlay = async () => {
        // IMPORTANT: Ensure selectedMovie is set before navigation
        // This ensures the Player component has access to movie data for subtitles
        dispatch(setSelectedMovie(movie));
        
        // Handle subtitle file: check if exists, if not download it
        // The backend API already checks if file exists and returns existing path or downloads new one
        // IMPORTANT: Always await the download to ensure subtitleFilePath is set before navigation
        if (subtitleLang && selectedSubtitleFileId && settings.downloadsFolderPath) {
            setIsDownloadingSubs(true);
            try {
                // Convert language code to OpenSubtitles format
                const openSubtitlesLangCode = toOpenSubtitlesCode(subtitleLang);
                
                // Call download API - it will check if file exists first and return existing path if found
                // or download and return new path if not found
                const { data: subtitlePath } = await downloadSubtitleFromApi(
                    selectedSubtitleFileId,
                    movie.imdb_code,
                    movie.title,
                    movie.year.toString(),
                    openSubtitlesLangCode,
                    settings.downloadsFolderPath
                );
                
                // Set subtitle file path and enable subtitles
                // These MUST be set before navigation so Player component has the correct state
                dispatch(setSubtitleFilePath(subtitlePath));
                dispatch(setIsSubtitlesEnabled(true));
                // Ensure subtitleLang and selectedSubtitleFileId are preserved
                // They should already be set, but ensure they persist
                dispatch(setSubtitleLang(subtitleLang));
                dispatch(setSelectedSubtitleFileId(selectedSubtitleFileId));
                
                // Update cache with subtitle path
                if (selectedTorrent && hash) {
                    const { getDownloadsCache, saveDownloadInfo } = await import('@/utils/downloadsCache');
                    const cache = getDownloadsCache();
                    const cachedInfo = cache[hash.toLowerCase()];
                    if (cachedInfo) {
                        saveDownloadInfo(hash, {
                            ...cachedInfo,
                            subtitleFilePath: subtitlePath,
                        });
                    }
                }
            } catch (error) {
                console.error('Failed to download/check subtitles:', error);
                // Even if download fails, preserve subtitleLang and selectedSubtitleFileId
                // So user can try again in player controls
                // Don't set subtitleFilePath on error - it will be downloaded when user selects in player
            } finally {
                setIsDownloadingSubs(false);
            }
        }

        const res = await playTorrent(hash);
        if (res.status === 200) {
            // Cache download info for tracking (use current subtitleFilePath, will be updated when download completes)
            if (selectedTorrent) {
                const { saveDownloadInfo } = await import('@/utils/downloadsCache');
                const poster = large_cover_image || medium_cover_image || small_cover_image || '';
                saveDownloadInfo(hash, {
                    slug,
                    title,
                    quality: selectedTorrent.quality,
                    size: parseInt(selectedTorrent.size),
                    sizeBytes: selectedTorrent.size_bytes,
                    subtitleFilePath: subtitleFilePath, // Current path, may be null if still downloading
                    subtitleLang,
                    poster,
                    isCompleted: false,
                });
                if (poster) {
                    saveDownloadPoster(hash, poster);
                    saveDownloadPoster(title, poster);
                }
            }
            
            const watchCover = large_cover_image || medium_cover_image || small_cover_image || '';
            navigate(`/stream/${slug}?hash=${hash}&title=${encodeURIComponent(title)}&poster=${encodeURIComponent(background_image)}&cover=${encodeURIComponent(watchCover)}`, {
                state: {
                    from: '/'
                }
            });
        }
    }

    const handleDownload = async () => {
        if (!selectedTorrent || !hash || !settings.downloadsFolderPath || !socket?.id) {
            throw new Error('The download could not be started.');
        }

        const { saveDownloadInfo } = await import('@/utils/downloadsCache');
        const poster = large_cover_image || medium_cover_image || small_cover_image || '';
        saveDownloadInfo(hash, {
            slug,
            title,
            quality: selectedTorrent.quality,
            size: parseInt(selectedTorrent.size),
            sizeBytes: selectedTorrent.size_bytes,
            subtitleFilePath,
            subtitleLang,
            poster,
            isCompleted: false,
        });
        if (poster) {
            saveDownloadPoster(hash, poster);
            saveDownloadPoster(title, poster);
        }

        const res = await addNewTorrent({
            slug,
            hash,
            title,
            dir: settings.downloadsFolderPath,
            sid: socket.id,
        });
        if (res.status !== 200) {
            throw new Error('The download could not be started.');
        }

        setDownloadProgress({
            hash,
            slug,
            progress: 0,
            speed: 0,
            peers: 0,
            done: false,
            downloaded: 0,
            timeRemaining: 0,
            fileName: '',
            paused: false,
            url: '',
        });

        const onNewDownload = (data: { hash?: string }) => {
            if (data?.hash?.toLowerCase() !== hash.toLowerCase()) return;
            socket.off('newDownload', onNewDownload);
            dispatch(fetchAllDownloadsAsync());
        };
        socket.on('newDownload', onNewDownload);
    }

    const toggleDownload = async () => {
        if (!downloadProgress?.hash || downloadProgress.done) return;
        const nextPaused = !downloadProgress.paused;
        setDownloadProgress({ ...downloadProgress, paused: nextPaused, speed: nextPaused ? 0 : downloadProgress.speed });
        try {
            if (nextPaused) await pauseDownload(downloadProgress.hash);
            else await resumeDownload(downloadProgress.hash);
        } catch (error) {
            console.error(error);
            setDownloadProgress((current) => current ? { ...current, paused: !nextPaused } : current);
        }
    }

    useEffect(() => {
        setDownloadProgress(null);
    }, [movie.id]);

    const throttledSetDownloadProgress = useRef(
        throttle((data: DownloadProgressData) => {
            setDownloadProgress((current) => {
                if (!current || current.hash.toLowerCase() !== data.hash.toLowerCase()) return current;
                return {
                    ...current,
                    ...data,
                    hash: data.hash || current.hash,
                    slug: data.slug || current.slug,
                    fileName: data.fileName || current.fileName,
                    url: data.url || current.url,
                    downloaded: data.downloaded ?? current.downloaded,
                    peers: data.peers ?? current.peers,
                    timeRemaining: data.timeRemaining ?? current.timeRemaining,
                    progress: data.progress ?? current.progress,
                    speed: data.speed ?? current.speed,
                    done: data.done ?? current.done,
                    paused: data.paused ?? current.paused,
                };
            });
        }, 500)
    ).current;

    useEffect(() => {
        if (!socket || !downloadProgress?.hash) return;
        const downloadHash = downloadProgress.hash.toLowerCase();

        const handleProgress = (data: DownloadProgressData) => {
            if (data.hash?.toLowerCase() !== downloadHash) return;
            throttledSetDownloadProgress(data);
        };

        socket.on('downloadProgress', handleProgress);
        socket.on('downloadDone', handleProgress);
        return () => {
            socket.off('downloadProgress', handleProgress);
            socket.off('downloadDone', handleProgress);
            throttledSetDownloadProgress.cancel();
        };
    }, [socket, downloadProgress?.hash, throttledSetDownloadProgress]);

    const handleWatchDownloaded = async () => {
        if (!downloadedMovieInfo) return;
        
        // Close the dialog modal but preserve the selectedMovie so it can be restored when navigating back
        dispatch(closeModal('movie'));
        
        // For completed downloads, navigate directly to the stream page
        // The backend should handle playing from disk if the file exists
        const res = await playTorrent(downloadedMovieInfo.hash);
        if (res.status === 200) {
            const watchCover = large_cover_image || medium_cover_image || small_cover_image || '';
            navigate(`/stream/${downloadedMovieInfo.slug}?hash=${downloadedMovieInfo.hash}&title=${encodeURIComponent(title)}&poster=${encodeURIComponent(background_image)}&cover=${encodeURIComponent(watchCover)}`, {
                state: {
                    from: '/'
                }
            });
        }
    }

    useEffect(() => {
        if (!selectedTorrent) return;

        const getDiskSpace = async () => {
            setDiskSpace(null);
            
            try {
                const diskInfo = await window.electronAPI.checkDiskSpace();
                setDiskSpace(diskInfo as DiskSpaceInfo);
            } catch (err) {
                console.error('Failed to get disk space', err);
            }
        }

        getDiskSpace();
    }, [selectedTorrent]);

    useEffect(() => {
        if (!selectedQuality) return;
        setDiskSpace(null);
    }, [selectedQuality]);

    const handleSelectSubsLanguage = async (langId: string, fileId: string) => {
        // Update selected language and file ID in store
        dispatch(setSubtitleLang(langId));
        dispatch(setSelectedSubtitleFileId(fileId));

        // Reset subtitle file path when selecting a new file
        // The file will be downloaded when play is clicked
        dispatch(setSubtitleFilePath(null));
    }

    // No caching - state is managed by MovieDialog when fetching from API
    // NOTE: Don't clear subtitleLang on unmount - it should persist when navigating to player
    // The Player component will handle clearing subtitle states when appropriate
    useEffect(() => {
        return () => {
            dispatch(setAvailableSubtitlesLanguages([]));
            dispatch(setUnavailableSubtitlesLanguages([]));
            // Don't clear subtitleLang here - it should persist to the player
            // Don't clear selectedSubtitleFileId or subtitleFilePath either - they should persist
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch suggestions when movie changes
    useEffect(() => {
        if (!movie.id || !canStream) {
            setSuggestions([]);
            setIsLoadingSuggestions(false);
            return;
        }

        const fetchSuggestions = async () => {
            setIsLoadingSuggestions(true);
            try {
                const response = await getMovieSuggestions(movie.id);
                
                // Handle different possible response structures
                let movies = [];
                
                // Check for standard YTS API structure: { status: "ok", data: { movies: [...] } }
                if (response.data?.data?.movies && Array.isArray(response.data.data.movies)) {
                    movies = response.data.data.movies;
                } 
                // Check for alternative structure: { movies: [...] }
                else if (response.data?.movies && Array.isArray(response.data.movies)) {
                    movies = response.data.movies;
                } 
                // Check if data is directly an array
                else if (Array.isArray(response.data)) {
                    movies = response.data;
                }
                // Check if data.data is directly an array
                else if (Array.isArray(response.data?.data)) {
                    movies = response.data.data;
                }
                
                // Filter movies - accept movies even without images for now to see what we get
                const validMovies = movies.filter((m: Movie) => {
                    if (!m || !m.id) {
                        return false;
                    }
                    return true;
                });
                
                setSuggestions(validMovies);
            } catch (error) {
                console.error('Failed to fetch suggestions:', error);
                if (error instanceof Error) {
                    console.error('Error message:', error.message);
                    console.error('Error stack:', error.stack);
                }
                setSuggestions([]);
            } finally {
                setIsLoadingSuggestions(false);
            }
        };

        fetchSuggestions();
    }, [movie.id, canStream]);

    useEffect(() => {
        setActiveTab('general');
    }, [movie?.id]);
    
  return (
    <div className='relative flex h-full max-h-full min-h-0 w-full flex-col overflow-hidden md:flex-1'>
        <nav className="flex shrink-0 gap-0 items-center border-b border-stone-700 bg-stone-800" aria-label="Movie details tabs">
            <button
                type="button"
                onClick={() => setActiveTab('general')}
                className={`shrink-0 whitespace-nowrap px-3 py-2 text-xs sm:text-sm font-medium transition-colors ${
                    activeTab === 'general'
                        ? 'bg-stone-900 text-white border-b-2 border-stone-500 -mb-px'
                        : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
                }`}
            >
                General
            </button>
            <button
                type="button"
                onClick={() => setActiveTab('cast')}
                className={`shrink-0 whitespace-nowrap px-3 py-2 text-xs sm:text-sm font-medium transition-colors ${
                    activeTab === 'cast'
                        ? 'bg-stone-900 text-white border-b-2 border-stone-500 -mb-px'
                        : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
                }`}
            >
                Cast
            </button>
            <button
                type="button"
                onClick={() => setActiveTab('suggestions')}
                className={`shrink-0 whitespace-nowrap px-3 py-2 text-xs sm:text-sm font-medium transition-colors ${
                    activeTab === 'suggestions'
                        ? 'bg-stone-900 text-white border-b-2 border-stone-500 -mb-px'
                        : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
                }`}
            >
                Suggestions
            </button>
            <CloseButton
                onClose={handleClose}
                className="!relative !top-0 !right-1 ml-auto p-1.5 text-base border-0 shrink-0 md:!flex"
                title="Close"
            />
        </nav>

        {activeTab === 'general' && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
        <MobileCoverSpacer />

        <div className='flex flex-col inset-0 bg-gradient-to-t from-stone-950 from-30% md:from-40% md:grow px-2 relative'>
            <TitleWrapper title={title} />
            <Metadata movie={movie} />

            {canStream ? (
                <>
                    <div className='py-1 flex w-full gap-3 flex-col'>
                        <QualitySelector selected={selectedQuality} torrents={torrents} handleSelect={handleQualityChange} />
                        <TorrentSelector handleSelect={handleTorrentSelect} quality={selectedQuality} torrents={torrents} hash={hash} />
                    </div>

                    <SubtitlesSelector
                        containerClassName="mt-4"
                        languages={formattedLanguages}
                        languageFiles={languageFiles}
                        isLoading={isLoadingSubtitles}
                        isDownloading={isDownloadingSubs}
                        onSelectSubtitle={handleSelectSubsLanguage}
                    />

                    <FileSize 
                        size={selectedTorrent?.size} 
                        selectedTorrent={selectedTorrent}
                    />
                </>
            ) : (
                <p className="py-3 text-sm text-slate-300">In theatres now. This title isn't available to stream yet.</p>
            )}
        </div>
        </div>

        {canStream && (
            <div className="shrink-0 flex flex-col gap-2 border-t border-stone-800 bg-stone-950 px-2 py-3">
                {downloadedMovieInfo && (
                    <p className='text-xs text-green-400 flex items-center gap-2'>
                        <MdFileDownloadDone className='text-lg shrink-0' />
                        <span>You have downloaded this movie in {downloadedMovieInfo.quality}.</span>
                        <Button
                            onClick={handleWatchDownloaded}
                            className='text-blue-500 hover:text-blue-400 bg-transparent hover:bg-transparent border-0 p-0 h-auto'
                        >
                            Watch now
                        </Button>
                    </p>
                )}
                <AnimatePresence>
                    {downloadProgress && (
                        <motion.div
                            key={downloadProgress.hash}
                            initial={{ opacity: 0, height: 0, y: 12 }}
                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                            exit={{ opacity: 0, height: 0, y: 8 }}
                            transition={{ duration: 0.28, ease: 'easeOut' }}
                            className="overflow-hidden"
                        >
                            <div className="rounded-sm bg-stone-900 px-2 py-2">
                                <div className="flex items-center justify-between gap-2 text-xs text-white">
                                    <span className="truncate">
                                        {downloadProgress.done ? 'Download complete' : downloadProgress.paused ? 'Paused' : 'Downloading'}
                                        {downloadProgress.fileName ? ` · ${downloadProgress.fileName}` : ''}
                                    </span>
                                    <span className="flex shrink-0 items-center gap-1">
                                        <span className="tabular-nums">
                                            {Math.min(100, Math.round((downloadProgress.progress || 0) * 100))}%
                                        </span>
                                        {!downloadProgress.done && (
                                            <Button
                                                title={downloadProgress.paused ? 'Resume download' : 'Pause download'}
                                                onClick={toggleDownload}
                                                className='aspect-square h-6 w-6 p-0 hover:bg-stone-700'
                                            >
                                                {downloadProgress.paused ? <BsPlay /> : <BsPause />}
                                            </Button>
                                        )}
                                    </span>
                                </div>
                                <div className="relative mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-800">
                                    <motion.div
                                        className={`h-full ${downloadProgress.done ? 'bg-green-400' : downloadProgress.paused ? 'bg-blue-300' : 'bg-blue-500'}`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, (downloadProgress.progress || 0) * 100)}%` }}
                                        transition={{ type: 'spring', stiffness: 140, damping: 22 }}
                                    />
                                    {!downloadProgress.done && !downloadProgress.paused && (
                                        <motion.div
                                            className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                                            initial={{ x: '-120%' }}
                                            animate={{ x: '420%' }}
                                            transition={{ repeat: Infinity, duration: 1.35, ease: 'linear' }}
                                        />
                                    )}
                                </div>
                                <div className="mt-1.5 flex justify-between gap-2 text-xs text-stone-400">
                                    <span>
                                        {formatBytes(downloadProgress.downloaded || 0)}
                                        {selectedTorrent?.size ? ` / ${selectedTorrent.size}` : ''}
                                    </span>
                                    <span>
                                        {downloadProgress.done
                                            ? 'Done'
                                            : downloadProgress.paused
                                                ? 'Paused'
                                                : formatBytesPerSecond(downloadProgress.speed || 0)}
                                    </span>
                                </div>
                                <p className="text-xs text-stone-500">
                                    {downloadProgress.peers || 0} peers
                                    {downloadProgress.timeRemaining > 0 && !downloadProgress.done
                                        ? ` · ${msToReadableTime(downloadProgress.timeRemaining)} left`
                                        : ''}
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <PlayButton
                    isDisabled={!selectedTorrent || !selectedQuality || hasEnoughSpace === false || !diskSpace}
                    onPlay={handlePlay}
                    onDownload={handleDownload}
                    diskSpaceInfo={{ hasEnoughSpace, fileSizeInBytes, freeBytes: diskSpace?.free ?? 0 }}
                />
            </div>
        )}
        </div>
        )}

        {activeTab === 'suggestions' && (
            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 bg-gradient-to-t from-stone-950 from-30% md:from-40%">
                {isLoadingSuggestions ? (
                    <p className="text-stone-400 text-center mt-8">Loading suggestions...</p>
                ) : suggestions.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {suggestions.slice(0, 12).map((suggestion) => (
                            <div key={suggestion.id} className="w-full [&>button]:min-w-0 [&>button]:max-w-none [&>button]:w-full [&>button]:hover:scale-[1.02]">
                                <MovieCard
                                    movie={suggestion}
                                    setOpen={() => handleSuggestionClick(suggestion)}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-stone-400 text-center mt-8">No suggestions available</p>
                )}
            </div>
        )}

        {activeTab === 'cast' && (
            <div className="flex-1 min-h-0 max-h-full overflow-hidden px-2 py-2 bg-gradient-to-t from-stone-950 from-30% md:from-40%">
                <Cast movie={movie} />
            </div>
        )}
    </div>
  )
}

export default MovieInfoPanel;
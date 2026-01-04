import React, { useEffect, useMemo, useState } from 'react';
import TitleWrapper from './TitleWrapper';
import { Movie } from '../MovieCard';
import { DiskSpaceInfo, Torrent } from '../../utils/types';
import QualitySelector from './QualitySelector';
import TorrentSelector from './TorrentSelector';
import FileSize from './FileSize';
import PlayButton from './PlayButton';
import MobileCoverSpacer from './MobileCoverSpacer';
import Metadata from './Metadata';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setAvailableSubtitlesLanguages, setSelectedMovie, setSelectedTorrent, setSubtitleFilePath, setSubtitleLang, setUnavailableSubtitlesLanguages } from '@/store/movies/movies.slice';
import { closeModal, openModal } from '@/store/modals/modals.slice';
import { selectSettings } from '@/store/settings/settings.selectors';
import { checkAvailability, downloadSubtitles } from '@/services/subtitles';
import { CACHE_TTL, getSubsCache, updateSubsCache } from '@/utils/subsLanguagesCache';
import { selectAvailableSubtitlesLanguages, selectSubtitleFilePath, selectSubtitleLang } from '@/store/movies/movies.selectors';
import SubtitlesSelector from './SubtitlesSelector';
import { playTorrent } from '@/services/movies';
import { COMMON_LANGUAGES } from '@/utils/languages';
import { getDownloadsCache } from '@/utils/downloadsCache';
import { toOpenSubtitlesCode } from '@/utils/detectLanguage';
import { getMovieSuggestions } from '@/services/suggestions';
import MovieCard from '../MovieCard';
import MoviesListSkeleton from '../MoviesListSkeleton';
import { getMoviesByIds } from '@/services/movies';

interface MovieInfoPanelProps {
    movie: Movie;
    close: () => void;
}

const MovieInfoPanel = ({movie, close}: MovieInfoPanelProps) => {
    const {
        torrents,
        slug,
        background_image,
        large_cover_image,
        title
    } = movie;

    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [hash, setHash] = useState<string>('');
    const [selectedQuality, setSelectedQuality] = useState<string>('');
    const availableSubsLanguages = useAppSelector(selectAvailableSubtitlesLanguages);
    const [notAvailableSubs, setNotAvailableSubs] = useState<string[]>([]);
    const [isLoadingSubs, setIsLoadingSubs] = useState<boolean>(false);
    const [isDownloadingSubs, setIsDownloadingSubs] = useState<boolean>(false);
    const subtitleLang = useAppSelector(selectSubtitleLang);
    const subtitleFilePath = useAppSelector(selectSubtitleFilePath);
    const settings = useAppSelector(selectSettings);

    const selectedTorrent: Torrent | null = useMemo(() => {
        const torrents = movie?.torrents as Torrent[];

        if (hash && selectedQuality) {
            const torrent: Torrent | undefined = torrents.find(t => (t.quality === selectedQuality) && (t.hash === hash));
            
            if (torrent) {
                dispatch(setSelectedTorrent(torrent));
            }

            return torrent || null;
        }

        return null;
    }, [hash, selectedQuality, movie?.torrents, dispatch]);

    const [diskSpace, setDiskSpace] = useState<DiskSpaceInfo | null>(null);
    const [isSuggestionsOpen, setIsSuggestionsOpen] = useState<boolean>(false);
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

    const toggleSuggestions = () => {
        setIsSuggestionsOpen(prev => !prev);
    }

    const handleSuggestionClick = async (suggestionMovie: Movie) => {
        setIsSuggestionsOpen(false);
        
        // Reset quality and hash selection when switching movies
        setSelectedQuality('');
        setHash('');
        
        // Fetch full movie details to ensure all image fields are present
        try {
            const response = await getMoviesByIds([suggestionMovie.id]);
            if (response.data?.movies && response.data.movies.length > 0) {
                const fullMovie = response.data.movies[0];
                
                // Preload images for faster display
                if (fullMovie.large_cover_image) {
                    const coverImg = new Image();
                    coverImg.src = fullMovie.large_cover_image;
                }
                if (fullMovie.background_image) {
                    const bgImg = new Image();
                    bgImg.src = fullMovie.background_image;
                }
                
                dispatch(setSelectedMovie(fullMovie));
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
        setSelectedQuality(quality);
        setHash('');
    }

    const handlePlay = async () => {
        // Download subtitles in background if selected and available but not yet downloaded
        // Don't block playback - start immediately
        if (subtitleLang && !subtitleFilePath && availableSubsLanguages.includes(subtitleLang) && settings.downloadsFolderPath) {
            setIsDownloadingSubs(true);
            // Don't await - let it download in background
            // Convert language code to OpenSubtitles format
            const openSubtitlesLangCode = toOpenSubtitlesCode(subtitleLang);
            downloadSubtitles(
                openSubtitlesLangCode,
                movie.imdb_code,
                movie.title,
                movie.year.toString(),
                settings.downloadsFolderPath
            ).then(async ({ data: downloadedPath }) => {
                dispatch(setSubtitleFilePath(downloadedPath));
                setIsDownloadingSubs(false);
                
                // Update cache with downloaded subtitle path
                if (selectedTorrent && hash) {
                    const { getDownloadsCache, saveDownloadInfo } = await import('@/utils/downloadsCache');
                    const cache = getDownloadsCache();
                    const cachedInfo = cache[hash.toLowerCase()];
                    if (cachedInfo) {
                        saveDownloadInfo(hash, {
                            ...cachedInfo,
                            subtitleFilePath: downloadedPath,
                        });
                    }
                }
            }).catch((error) => {
                console.error('Failed to download subtitles:', error);
                setIsDownloadingSubs(false);
            });
        }

        const res = await playTorrent(hash);
        if (res.status === 200) {
            // Cache download info for tracking (use current subtitleFilePath, will be updated when download completes)
            if (selectedTorrent) {
                const { saveDownloadInfo } = await import('@/utils/downloadsCache');
                saveDownloadInfo(hash, {
                    slug,
                    title,
                    quality: selectedTorrent.quality,
                    size: parseInt(selectedTorrent.size),
                    sizeBytes: selectedTorrent.size_bytes,
                    subtitleFilePath: subtitleFilePath, // Current path, may be null if still downloading
                    subtitleLang,
                    poster: large_cover_image, // Use large_cover_image instead of background_image
                    isCompleted: false,
                });
            }
            
            navigate(`/stream/${slug}?hash=${hash}&title=${title}&poster=${background_image}`, {
                state: {
                    from: '/'
                }
            });
        }
    }

    const handleWatchDownloaded = async () => {
        if (!downloadedMovieInfo) return;
        
        // Close the dialog modal but preserve the selectedMovie so it can be restored when navigating back
        dispatch(closeModal('movie'));
        
        // For completed downloads, navigate directly to the stream page
        // The backend should handle playing from disk if the file exists
        const res = await playTorrent(downloadedMovieInfo.hash);
        if (res.status === 200) {
            navigate(`/stream/${downloadedMovieInfo.slug}?hash=${downloadedMovieInfo.hash}&title=${title}&poster=${background_image}`, {
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

    const handleSelectSubsLanguage = async (langId: string) => {
        // If clicking on the current selected language, do nothing
        if (subtitleLang && subtitleLang.toLowerCase() === langId.toLowerCase()) {
            return;
        }

        const cacheKey = `${movie.imdb_code}-${movie.year}`;
        const cached = getSubsCache()[cacheKey];

        // Always update selected language in store
        dispatch(setSubtitleLang(langId));

        // Reset subtitle file path if changing language
        if (langId !== subtitleLang && subtitleFilePath) {
            dispatch(setSubtitleFilePath(null));
        }

        // If language is already known in cache, just update state (don't download - download happens on play)
        if (
            cached &&
            Date.now() - cached.ts < CACHE_TTL &&
            (cached.available.includes(langId) || cached.unavailable.includes(langId))
        ) {
            dispatch(setAvailableSubtitlesLanguages(cached.available));
            setNotAvailableSubs(cached.unavailable);
            // Don't download here - download happens when user clicks play
            return;
        }

        // Otherwise, check availability
        setIsLoadingSubs(true);

        try {
            // Convert language code to OpenSubtitles format
            const openSubtitlesLangCode = toOpenSubtitlesCode(langId);
            
            const {
                data: { isAvailable }
            } = await checkAvailability(
                openSubtitlesLangCode,
                movie.imdb_code,
                movie.title,
                movie.year.toString()
            );

            // Update cache
            updateSubsCache(cacheKey, langId, isAvailable);

            // Update state
            if (isAvailable) {
                const newState = [...new Set([...availableSubsLanguages, langId])]
                dispatch(setAvailableSubtitlesLanguages(newState));
            } else {
                setNotAvailableSubs(prev => [...new Set([...prev, langId])]);
            }
            // Don't download here - download happens when user clicks play
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingSubs(false);
        }
    }

    useEffect(() => {
        if (!movie.imdb_code || !movie.year) {
            // Clear state if no movie data
            dispatch(setAvailableSubtitlesLanguages([]));
            setNotAvailableSubs([]);
            return;
        }

        const cacheKey = `${movie.imdb_code}-${movie.year}`;
        const cached = getSubsCache()[cacheKey];

        if (cached && Date.now() - cached.ts < CACHE_TTL) {
            // Replace state from cache (cache is source of truth, don't merge with existing state)
            dispatch(setAvailableSubtitlesLanguages(cached.available));
            setNotAvailableSubs(cached.unavailable);
        } else {
            // Clear state if no cache
            dispatch(setAvailableSubtitlesLanguages([]));
            setNotAvailableSubs([]);
        }
    }, [movie.imdb_code, movie.year, dispatch]);

    useEffect(() => {
        return () => {
            dispatch(setAvailableSubtitlesLanguages([]));
            dispatch(setUnavailableSubtitlesLanguages([]));
            dispatch(setSubtitleLang(null));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch suggestions when movie changes
    useEffect(() => {
        if (!movie.id) {
            setSuggestions([]);
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
    }, [movie.id]);
    
  return (
    <div className='min-h-full overflow-y-auto overflow-x-hidden md:relative w-full flex flex-col justify-between absolute top-0 md:grow md:justify-center relative'>
        <MobileCoverSpacer />

        <div className='flex flex-col inset-0 bg-gradient-to-t from-stone-950 from-30% md:from-40% md:grow px-2 relative'>
            <TitleWrapper onClose={handleClose} title={title} />
            <Metadata movie={movie} />

            <div className='py-1 flex w-full gap-3 md:h-full h-32 flex-col'>
                <QualitySelector selected={selectedQuality} torrents={torrents} handleSelect={handleQualityChange} />
                <TorrentSelector handleSelect={handleTorrentSelect} quality={selectedQuality} torrents={torrents} hash={hash} />
            </div>

            <SubtitlesSelector
                notAvailableSubs={notAvailableSubs}
                availableSubs={availableSubsLanguages}
                languages={COMMON_LANGUAGES}
                isLoading={isLoadingSubs}
                isDownloading={isDownloadingSubs}
                onSelectSubtitle={handleSelectSubsLanguage}
            />
            {/* <SubtitleDropdown
                availableSubs={availableSubs}
                isLoading={isLoadingSubs}
                onSelect={handleSelectSubsLanguage}
            /> */}

            <FileSize 
                size={selectedTorrent?.size} 
                selectedTorrent={selectedTorrent}
                downloadedQuality={downloadedMovieInfo?.quality}
                onWatchDownloaded={downloadedMovieInfo ? handleWatchDownloaded : undefined}
            />

            <div className='flex w-full items-center justify-center flex-col py-1 gap-1'>
                <PlayButton
                    isDisabled={!selectedTorrent || !selectedQuality || hasEnoughSpace === false || !diskSpace}
                    onPlay={handlePlay}
                    diskSpaceInfo={{ hasEnoughSpace, fileSizeInBytes, freeBytes: diskSpace?.free ?? 0 }}
                />
            </div>
        </div>

        {/* Suggestions Sidebar Handle */}
        <button
            onClick={toggleSuggestions}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-50 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-all duration-300 px-1.5 py-4 rounded-l-lg shadow-lg cursor-pointer border border-blue-500 ${
                isSuggestionsOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
            aria-label="Toggle suggestions"
        >
            <svg
                className={`w-4 h-4 transition-transform duration-300 ${isSuggestionsOpen ? '' : 'scale-x-[-1]'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
        </button>

        {/* Suggestions Sidebar */}
        <div
            className={`absolute top-0 right-0 h-full w-full bg-stone-900 z-40 transition-transform duration-300 ease-in-out ${
                isSuggestionsOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
        >
            <div className="h-full w-full flex flex-col">
                {/* Sidebar Header */}
                <div className="flex items-center justify-between p-4 border-b border-stone-700">
                    <h2 className="text-xl font-semibold text-white">Suggestions</h2>
                    <button
                        onClick={toggleSuggestions}
                        className="text-stone-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-stone-800 cursor-pointer"
                        aria-label="Close suggestions"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Sidebar Content */}
                <div className="flex-1 overflow-hidden p-4">
                    {isLoadingSuggestions ? (
                        <div className="text-stone-400 text-center mt-8">
                            <p>Loading suggestions...</p>
                        </div>
                    ) : suggestions.length > 0 ? (
                        <div className="grid grid-cols-2 grid-rows-2 gap-3 h-full">
                            {suggestions.slice(0, 4).map((suggestion) => (
                                <div key={suggestion.id} className="w-full h-full [&>button]:min-w-0 [&>button]:max-w-none [&>button]:w-full [&>button]:h-full [&>button]:max-h-full [&>button]:hover:scale-100 [&>button]:border-0 [&>button]:hover:border-0 [&>button]:outline-0 [&>button]:hover:outline [&>button]:hover:outline-1 [&>button]:hover:outline-stone-400">
                                    <MovieCard
                                        movie={suggestion}
                                        setOpen={() => handleSuggestionClick(suggestion)}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-stone-400 text-center mt-8">
                            <p>No suggestions available</p>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Overlay when sidebar is open */}
        {isSuggestionsOpen && (
            <div
                className="absolute inset-0 bg-black/50 z-30 transition-opacity duration-300"
                onClick={toggleSuggestions}
                aria-hidden="true"
            />
        )}
    </div>
  )
}

export default MovieInfoPanel;
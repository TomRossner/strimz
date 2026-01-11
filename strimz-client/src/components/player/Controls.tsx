import React, { ChangeEvent, RefObject, useEffect, useRef, useState, useMemo } from 'react';
import Button from '../Button';
import { BsPause, BsPlay } from 'react-icons/bs';
import { IoExpandOutline, IoVolumeHighOutline, IoVolumeLowOutline, IoVolumeMediumOutline, IoVolumeMuteOutline } from 'react-icons/io5';
import { twMerge } from 'tailwind-merge';
import TimeTrack from './TimeTrack';
import VolumeSlider from './VolumeSlider';
import { PiArrowArcLeft, PiArrowArcRight, PiSubtitlesLight } from 'react-icons/pi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectSubtitleFilePath, selectSubtitlesSize, selectSubtitleDelay, selectIsSubtitlesEnabled, selectMovie, selectSubtitleLang, selectAvailableSubtitlesLanguages, selectMoviesMap, selectLanguageFiles, selectSelectedSubtitleFileId, selectExternalTorrent } from '@/store/movies/movies.selectors';
import { setIsSubtitlesEnabled, setSubtitleFilePath, setSubtitleLang, setAvailableSubtitlesLanguages, setSubtitleDelay, setVttSubtitlesContent, setSelectedMovie, setLanguageFiles, setSelectedSubtitleFileId } from '@/store/movies/movies.slice';
import { closeModal, openModal } from '@/store/modals/modals.slice';
import SubtitlesSizeDialog from './SubtitlesSizeDialog';
import { selectSubtitlesSelectorTab, selectSubtitlesSizeModal } from '@/store/modals/modals.selectors';
import { PLAYER_CONTROLS_KEY_BINDS, SKIP_BACK_SECONDS, SKIP_FORWARD_SECONDS } from '@/utils/constants';
import { MdEdit } from 'react-icons/md';
import CloseButton from '../CloseButton';
import SubtitlesSelector from '@/components/dialog/SubtitlesSelector';
import { downloadSubtitleFromApi, searchSubtitlesByImdb } from '@/services/subtitles';
import { selectSettings } from '@/store/settings/settings.selectors';
import { useSearchParams, useParams } from 'react-router-dom';
import { searchMovies } from '@/services/movies';
import { toOpenSubtitlesCode, getSubtitleMetadata, normalizeLanguageCode } from '@/utils/detectLanguage';
import { getDownloadsCache, CachedDownloadInfo } from '@/utils/downloadsCache';
import { extractMovieTitleAndYear } from '@/utils/extractMovieTitle';

interface ControlsProps {
    ref: RefObject<HTMLVideoElement>;
    isMuted: boolean;
    setIsMuted: (bool: boolean) => void;
    controlsVisible: boolean;
    setControlsVisible: (bool: boolean) => void;
    isPlaying: boolean;
    setIsPlaying: (bool: boolean) => void;
    playbackWidth: number;
    setPlaybackWidth: (num: number) => void;
    bufferWidth: number;
    duration: number;
    currentTime: number;
    handleFullScreen: () => void;
    handleSkipForward: () => void;
    handleSkipBackward: () => void;
}

const Controls = ({
    ref: videoRef,
    isMuted,
    setIsMuted,
    controlsVisible,
    isPlaying,
    setIsPlaying,
    playbackWidth,
    setPlaybackWidth,
    bufferWidth,
    duration,
    currentTime,
    handleFullScreen,
    handleSkipForward,
    handleSkipBackward,
}: ControlsProps) => {
    const dispatch = useAppDispatch();
    const [searchParams] = useSearchParams();
    const params = useParams();
    // Get hash and src early for movie identifier tracking and other uses
    const hash = searchParams.get('hash');
    const src = searchParams.get('src') || '';
    const subtitlesSelectorTabOpen = useAppSelector(selectSubtitlesSelectorTab);
    const subtitleFilePath = useAppSelector(selectSubtitleFilePath);
    const isSubtitlesEnabled = useAppSelector(selectIsSubtitlesEnabled);
    const isSubtitlesSizeModalOpen = useAppSelector(selectSubtitlesSizeModal);
    const subtitlesSize = useAppSelector(selectSubtitlesSize);
    const subtitleDelay = useAppSelector(selectSubtitleDelay);
    const selectedMovie = useAppSelector(selectMovie);
    const moviesMap = useAppSelector(selectMoviesMap);
    const subtitleLang = useAppSelector(selectSubtitleLang);
    const availableSubsLanguages = useAppSelector(selectAvailableSubtitlesLanguages);
    const languageFiles = useAppSelector(selectLanguageFiles);
    const selectedSubtitleFileId = useAppSelector(selectSelectedSubtitleFileId);
    const externalTorrent = useAppSelector(selectExternalTorrent);
    const settings = useAppSelector(selectSettings);
    
    // Try to get movie from store using slug, fallback to selectedMovie
    const slug = params.slug;
    const movieFromMap = slug ? moviesMap.get(slug) : null;
    const movie = movieFromMap || selectedMovie;
    const title = searchParams.get('title') || movie?.title || '';

    const [notAvailableSubs, setNotAvailableSubs] = useState<string[]>([]);
    const [isLoadingSubs, setIsLoadingSubs] = useState<boolean>(false);
    const [isDownloadingSubs, setIsDownloadingSubs] = useState<boolean>(false);

    const closeTimeout = useRef<NodeJS.Timeout | null>(null);
    const searchInProgressRef = useRef<boolean>(false);
    const lastSearchedTitleRef = useRef<string | null>(null);
    const processedMovieRef = useRef<string | null>(null);
    const lastFetchedImdbRef = useRef<string | null>(null);

    const stop = (e: React.SyntheticEvent) => e.stopPropagation();

    const handleVolumeMute = () => {
        if (!videoRef.current) return;
        const newMuted = !videoRef.current.muted;
        videoRef.current.muted = newMuted;

        setIsMuted(newMuted);
    }

    const [volume, setVolume] = useState<number>(100);
    const [volumeSliderVisible, setVolumeSliderVisible] = useState<boolean>(false);

    const handleVolumeChange = (ev: ChangeEvent<HTMLInputElement>) => {
        setVolume(ev.target.valueAsNumber);
        setIsMuted(ev.target.valueAsNumber === 0);
    }

    useEffect(() => {
        const video = videoRef.current;
        if (video && Math.round(video.volume * 100) !== volume) {
            video.volume = volume / 100;
        }
    }, [volume, videoRef]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleVolumeChangeEvent = () => {
            setVolume(Math.round(video.volume * 100));
            setIsMuted(video.muted);
        }

        video.addEventListener('volumechange', handleVolumeChangeEvent);
        return () => video.removeEventListener('volumechange', handleVolumeChangeEvent);
    }, [videoRef, setIsMuted]);


    useEffect(() => {
        dispatch(setIsSubtitlesEnabled(!!subtitleFilePath));
    }, [subtitleFilePath, dispatch]);

    // Get movie data - try multiple sources:
    // 1. From moviesMap using slug
    // 2. From downloads cache using hash (when playing from Downloads)
    // 3. From selectedMovie
    // Note: hash is already declared above for movie identifier tracking
    const movieFromStore = slug ? moviesMap.get(slug) : null;
    const downloadsCache = hash ? getDownloadsCache() : {};
    const downloadInfo = hash ? downloadsCache[hash.toLowerCase()] : null;
    const movieFromDownloads = downloadInfo && slug ? moviesMap.get(downloadInfo.slug) : null;
    const movieDataForCache = movieFromStore || movieFromDownloads || selectedMovie;

    // Load subtitle availability from API - only if not already loaded and no subtitle is selected
    // Don't fetch if subtitleLang, subtitleFilePath, or languages are already set
    const finalMovieForCache = movieDataForCache || selectedMovie;
    
    useEffect(() => {
        // Wait for movie data to be available (especially important when playing from disk)
        // Use the most current movie data - check selectedMovie first (most up-to-date), then movieDataForCache
        // For external torrents, use imdbCode from externalTorrent
        const movieToUse = selectedMovie || movieDataForCache;
        const imdbCode = externalTorrent?.imdbCode || movieToUse?.imdb_code;
        const year = movieToUse?.year;
        
        // Check if languages are already loaded
        const hasExistingLanguages = availableSubsLanguages.length > 0 || Object.keys(languageFiles).length > 0;
        
        // Reset fetch tracking if movie changed
        if (imdbCode && lastFetchedImdbRef.current && lastFetchedImdbRef.current !== imdbCode) {
            lastFetchedImdbRef.current = null;
        }
        
        if (!imdbCode) {
            // Don't clear state - preserve existing languages even if movie data isn't available yet
            // The movie data might be loading, and we don't want to lose the subtitle state
            // For external torrents, we don't have year, so we only check imdbCode
            return;
        }
        
        // Don't fetch if languages are already loaded for this movie
        // This prevents unnecessary API calls when player mounts
        if (hasExistingLanguages) {
            return;
        }
        
        // Don't fetch if we've already fetched for this imdb_code
        if (imdbCode && lastFetchedImdbRef.current === imdbCode) {
            return;
        }

        // Fetch fresh data from OpenSubtitles API only if not already loaded
        const fetchSubtitles = async () => {
            try {
                // Mark as fetched before making the request to prevent duplicate calls
                lastFetchedImdbRef.current = imdbCode;
                
                const response = await searchSubtitlesByImdb(imdbCode, undefined, 'movie');
                const { languages, languageFiles: files } = response.data;

                if (languages && languages.length > 0) {
                    dispatch(setAvailableSubtitlesLanguages(languages));
                    dispatch(setLanguageFiles(files || {}));
                } else {
                    dispatch(setAvailableSubtitlesLanguages([]));
                    dispatch(setLanguageFiles({}));
                }
            } catch (error) {
                console.error('Error fetching subtitles from OpenSubtitles API:', error);
                dispatch(setAvailableSubtitlesLanguages([]));
                dispatch(setLanguageFiles({}));
                // Reset on error so we can retry if needed
                if (lastFetchedImdbRef.current === imdbCode) {
                    lastFetchedImdbRef.current = null;
                }
            }
        };

        fetchSubtitles();
        // eslint-disable-next-line react-hooks/exhaustive-deps
        // Note: We intentionally exclude movieDataForCache, selectedMovie, availableSubsLanguages, languageFiles,
        // subtitleLang, and subtitleFilePath from dependencies to prevent re-fetching when player mounts.
        // We only want to fetch when the movie changes (imdb_code/year changes), not when subtitle state changes.
    }, [selectedMovie?.imdb_code, selectedMovie?.year, movieDataForCache?.imdb_code, movieDataForCache?.year, externalTorrent?.imdbCode, dispatch]);

    // Try to fetch movie data from downloads cache when hash is available, or search by title for file-only playback
    useEffect(() => {
        // Create a unique identifier for this movie context
        const movieContextId = hash ? `hash:${hash}` : title ? `title:${title}` : slug ? `slug:${slug}` : null;
        
        // If we've already processed this movie context, don't fetch again
        if (movieContextId && processedMovieRef.current === movieContextId) {
            return;
        }

        // If we already have movie data, mark as processed and don't fetch
        if (movieDataForCache?.imdb_code) {
            if (movieContextId) {
                processedMovieRef.current = movieContextId;
            }
            searchInProgressRef.current = false;
            return;
        }

        // Try from downloads cache using hash
        if (hash) {
            const downloadsCache = getDownloadsCache();
            const downloadInfo = downloadsCache[hash.toLowerCase()];
            if (downloadInfo?.slug) {
                const movieFromDownloads = moviesMap.get(downloadInfo.slug);
                if (movieFromDownloads) {
                    dispatch(setSelectedMovie(movieFromDownloads));
                    processedMovieRef.current = movieContextId || `hash:${hash}`;
                    searchInProgressRef.current = false;
                    return;
                }
            }
        }

        // If no hash but we have title (file-only playback from WatchFile), try to find in downloads cache first
        if (!hash && title && !slug) {
            // Prevent duplicate searches for the same title
            if (searchInProgressRef.current || lastSearchedTitleRef.current === title) {
                return;
            }

            const findMovieFromDownloadsCache = async () => {
                // Mark search as in progress
                searchInProgressRef.current = true;
                lastSearchedTitleRef.current = title;

                try {
                    // Extract clean title and year from folder name (may contain metadata like [2160p] [4K] etc.)
                    const extracted = extractMovieTitleAndYear(title);
                    const searchTitle = extracted?.title || title;
                    const searchYear = extracted?.year;
                    
                    // First, try to find in downloads cache
                    const downloadsCache = getDownloadsCache();
                    let downloadInfo: CachedDownloadInfo | null = null;
                    
                    // Try multiple matching strategies:
                    // 1. Exact title match
                    // 2. Folder name contains cached title
                    // 3. Cached title contains extracted title
                    for (const info of Object.values(downloadsCache) as CachedDownloadInfo[]) {
                        const cachedTitleLower = info.title.toLowerCase();
                        const searchTitleLower = searchTitle.toLowerCase();
                        const titleLower = title.toLowerCase();
                        
                        if (
                            cachedTitleLower === searchTitleLower ||
                            cachedTitleLower === titleLower ||
                            titleLower.includes(cachedTitleLower) ||
                            cachedTitleLower.includes(searchTitleLower)
                        ) {
                            downloadInfo = info;
                            break;
                        }
                    }
                    
                    // If found in downloads cache and has slug, get movie from moviesMap
                    if (downloadInfo?.slug) {
                        const movieFromDownloads = moviesMap.get(downloadInfo.slug);
                        if (movieFromDownloads) {
                            dispatch(setSelectedMovie(movieFromDownloads));
                            processedMovieRef.current = movieContextId || `title:${title}`;
                            searchInProgressRef.current = false;
                            return;
                        }
                    }
                    
                    // If not found in downloads cache, try to search by extracted title and year
                    const query = searchYear ? `${searchTitle} ${searchYear}` : searchTitle;
                    const response = await searchMovies(query);
                    const movies = response.data?.data?.movies || [];
                    if (movies.length > 0) {
                        // Try to find exact match by title and year
                        let exactMatch = movies.find((m: any) => {
                            const titleMatch = m.title.toLowerCase() === searchTitle.toLowerCase();
                            if (searchYear) {
                                return titleMatch && m.year === searchYear;
                            }
                            return titleMatch;
                        });
                        
                        // If no exact match with year, try just title
                        if (!exactMatch) {
                            exactMatch = movies.find((m: any) => 
                                m.title.toLowerCase() === searchTitle.toLowerCase()
                            );
                        }
                        
                        // If still no match and we have year, try to find closest year match
                        if (!exactMatch && searchYear) {
                            exactMatch = movies.find((m: any) => {
                                const titleMatch = m.title.toLowerCase() === searchTitle.toLowerCase();
                                const yearDiff = Math.abs(m.year - searchYear);
                                return titleMatch && yearDiff <= 2; // Allow 2 year difference
                            });
                        }
                        
                        // Fallback to first result if no match found
                        const selectedMovie = exactMatch || movies[0];
                        
                        if (selectedMovie) {
                            const movieData = {
                                id: selectedMovie.id,
                                title: selectedMovie.title,
                                slug: selectedMovie.slug,
                                year: selectedMovie.year,
                                imdb_code: selectedMovie.imdb_code,
                                rating: selectedMovie.rating,
                                runtime: selectedMovie.runtime,
                                genres: selectedMovie.genres,
                                summary: selectedMovie.summary,
                                yt_trailer_code: selectedMovie.yt_trailer_code,
                                language: selectedMovie.language,
                                background_image: selectedMovie.background_image,
                                background_image_original: selectedMovie.background_image_original,
                                small_cover_image: selectedMovie.small_cover_image,
                                medium_cover_image: selectedMovie.medium_cover_image,
                                large_cover_image: selectedMovie.large_cover_image,
                                torrents: selectedMovie.torrents,
                            };
                            dispatch(setSelectedMovie(movieData));
                            processedMovieRef.current = movieContextId || `title:${title}`;
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch movie data for cache:', error);
                } finally {
                    // Reset search flag after completion
                    searchInProgressRef.current = false;
                }
            };
            findMovieFromDownloadsCache();
        } else {
            // Reset flags when conditions don't match
            searchInProgressRef.current = false;
            if (!title) {
                lastSearchedTitleRef.current = null;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        // Note: We intentionally exclude movieDataForCache?.imdb_code from dependencies.
        // movieDataForCache is computed from selectedMovie, which changes when we dispatch
        // setSelectedMovie inside this effect. Including it would cause infinite loops.
        // We use processedMovieRef to track which movie context we've already processed.
    }, [hash, title, slug, moviesMap, dispatch]);

    const handleSelectSubtitleLanguage = async (langId: string, fileId: string) => {
        // If clicking on the current selected file (same language AND same fileId), do nothing
        if (subtitleLang && selectedSubtitleFileId && 
            subtitleLang.toLowerCase() === langId.toLowerCase() && 
            selectedSubtitleFileId === fileId) {
            return;
        }
        
        // Get movie data - try multiple sources
        let movie = finalMovieForCache;
        
        // If we don't have movie data, try to get it
        if (!movie?.imdb_code) {
            // Try from store using slug
            if (slug) {
                const movieFromStore = moviesMap.get(slug);
                if (movieFromStore) {
                    movie = movieFromStore;
                    dispatch(setSelectedMovie(movieFromStore));
                }
            }
            
            // If still no movie data but we have title (file-only playback from WatchFile), try downloads cache first
            if (!movie?.imdb_code && title) {
                try {
                    setIsLoadingSubs(true);
                    
                    // Extract clean title and year from folder name (may contain metadata like [2160p] [4K] etc.)
                    const extracted = extractMovieTitleAndYear(title);
                    const searchTitle = extracted?.title || title;
                    const searchYear = extracted?.year;
                    
                    // First, try to find in downloads cache
                    const downloadsCache = getDownloadsCache();
                    let downloadInfo: CachedDownloadInfo | null = null;
                    
                    // Try multiple matching strategies:
                    // 1. Exact title match
                    // 2. Folder name contains cached title
                    // 3. Cached title contains extracted title
                    for (const info of Object.values(downloadsCache) as CachedDownloadInfo[]) {
                        const cachedTitleLower = info.title.toLowerCase();
                        const searchTitleLower = searchTitle.toLowerCase();
                        const titleLower = title.toLowerCase();
                        
                        if (
                            cachedTitleLower === searchTitleLower ||
                            cachedTitleLower === titleLower ||
                            titleLower.includes(cachedTitleLower) ||
                            cachedTitleLower.includes(searchTitleLower)
                        ) {
                            downloadInfo = info;
                            break;
                        }
                    }
                    
                    // If found in downloads cache and has slug, get movie from moviesMap
                    if (downloadInfo?.slug) {
                        const movieFromDownloads = moviesMap.get(downloadInfo.slug);
                        if (movieFromDownloads) {
                            movie = movieFromDownloads;
                            dispatch(setSelectedMovie(movieFromDownloads));
                            setIsLoadingSubs(false);
                            // Continue with the movie data we found
                        }
                    }
                    
                    // If not found in downloads cache, try to search by extracted title and year
                    if (!movie?.imdb_code) {
                        const query = searchYear ? `${searchTitle} ${searchYear}` : searchTitle;
                        const response = await searchMovies(query);
                        const movies = response.data?.data?.movies || [];
                        if (movies.length > 0) {
                            // Try to find exact match by title and year
                            let exactMatch = movies.find((m: any) => {
                                const titleMatch = m.title.toLowerCase() === searchTitle.toLowerCase();
                                if (searchYear) {
                                    return titleMatch && m.year === searchYear;
                                }
                                return titleMatch;
                            });
                            
                            // If no exact match with year, try just title
                            if (!exactMatch) {
                                exactMatch = movies.find((m: any) => 
                                    m.title.toLowerCase() === searchTitle.toLowerCase()
                                );
                            }
                            
                            // If still no match and we have year, try to find closest year match
                            if (!exactMatch && searchYear) {
                                exactMatch = movies.find((m: any) => {
                                    const titleMatch = m.title.toLowerCase() === searchTitle.toLowerCase();
                                    const yearDiff = Math.abs(m.year - searchYear);
                                    return titleMatch && yearDiff <= 2; // Allow 2 year difference
                                });
                            }
                            
                            // Fallback to first result if no match found
                            const selectedMovie = exactMatch || movies[0];
                            
                            if (selectedMovie) {
                                movie = {
                                    id: selectedMovie.id,
                                    title: selectedMovie.title,
                                    slug: selectedMovie.slug,
                                    year: selectedMovie.year,
                                    imdb_code: selectedMovie.imdb_code,
                                    rating: selectedMovie.rating,
                                    runtime: selectedMovie.runtime,
                                    genres: selectedMovie.genres,
                                    summary: selectedMovie.summary,
                                    yt_trailer_code: selectedMovie.yt_trailer_code,
                                    language: selectedMovie.language,
                                    background_image: selectedMovie.background_image,
                                    background_image_original: selectedMovie.background_image_original,
                                    small_cover_image: selectedMovie.small_cover_image,
                                    medium_cover_image: selectedMovie.medium_cover_image,
                                    large_cover_image: selectedMovie.large_cover_image,
                                    torrents: selectedMovie.torrents,
                                };
                                dispatch(setSelectedMovie(movie));
                            }
                        }
                    }
                } catch (error) {
                    console.error('Failed to fetch movie data:', error);
                } finally {
                    setIsLoadingSubs(false);
                }
            }
            
            // If still no movie data, can't proceed
            if (!movie?.imdb_code || !movie.year) {
                console.warn('Movie data not available for subtitle selection');
                return;
            }
        }
        
        // Update selected language and file ID in store
        dispatch(setSubtitleLang(langId));
        dispatch(setSelectedSubtitleFileId(fileId));

        // Reset subtitle file path when selecting a new file
        // The file will be downloaded immediately for Controls.tsx
        dispatch(setSubtitleFilePath(null));

        // Download subtitle file immediately (Controls.tsx behavior - auto-download when selecting)
        if (fileId && settings.downloadsFolderPath) {
            setIsDownloadingSubs(true);
            try {
                // Convert language code to OpenSubtitles format
                const openSubtitlesLangCode = toOpenSubtitlesCode(langId);
                const { data: downloadedPath } = await downloadSubtitleFromApi(
                    fileId,
                    movie.imdb_code,
                    movie.title,
                    movie.year.toString(),
                    openSubtitlesLangCode,
                    settings.downloadsFolderPath
                );
                dispatch(setSubtitleFilePath(downloadedPath));
                dispatch(setIsSubtitlesEnabled(true)); // Enable subtitles when downloaded
            } catch (error) {
                console.error('Error downloading subtitle from API:', error);
            } finally {
                setIsDownloadingSubs(false);
            }
        }
    };

    const [videoHeight, setVideoHeight] = useState<number>(0);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const updateHeight = () => {
            setVideoHeight(video.clientHeight);
        };

        const observer = new ResizeObserver(() => {
            updateHeight();
        });

        observer.observe(video);
        updateHeight();

        return () => observer.disconnect();
    }, [videoRef]);

    // Track previous movie imdb_code to detect actual movie changes
    // Use imdb_code as the primary identifier since it's the most reliable
    const prevMovieImdbRef = useRef<string | null>(null);
    const hasInitializedRef = useRef<boolean>(false);
    // Use selectedMovie first (most reliable), then fallback to finalMovieForCache
    const currentMovieImdb = selectedMovie?.imdb_code || finalMovieForCache?.imdb_code || null;

    // Clear subtitle state only when movie actually changes (different imdb_code)
    // IMPORTANT: Don't clear on initial mount - preserve subtitle state when navigating from MovieDialog to Player
    // Even if selectedMovie is null initially, preserve subtitle state as it might be from the previous session
    useEffect(() => {
        // On initial mount, just track the movie without clearing anything
        // This preserves subtitle state when navigating from MovieDialog to Player
        // Even if currentMovieImdb is null, preserve state - it might become available soon
        if (!hasInitializedRef.current) {
            hasInitializedRef.current = true;
            if (currentMovieImdb) {
                prevMovieImdbRef.current = currentMovieImdb;
            }
            // IMPORTANT: Don't clear anything on initial mount - preserve existing subtitle state
            // This ensures languages loaded in MovieDialog persist when Player mounts
            return;
        }

        // After initial mount, only clear if movie actually changed (different imdb_code)
        // Don't clear if:
        // 1. currentMovieImdb becomes available for the first time (was null, now has value)
        // 2. We have existing languages/files that should be preserved
        // Only clear if we had a previous movie and it's different
        if (prevMovieImdbRef.current !== null && currentMovieImdb !== null && prevMovieImdbRef.current !== currentMovieImdb) {
            // Different movie - clear subtitle selection
            dispatch(setSubtitleLang(null));
            dispatch(setSelectedSubtitleFileId(null));
            dispatch(setSubtitleFilePath(null));
            dispatch(setIsSubtitlesEnabled(false));
            dispatch(setSubtitleDelay(0));
            dispatch(setVttSubtitlesContent(null));
            // Clear available languages too since it's a different movie
            dispatch(setAvailableSubtitlesLanguages([]));
            dispatch(setLanguageFiles({}));
            setNotAvailableSubs([]);
            // Reset search flags when movie changes
            searchInProgressRef.current = false;
            lastSearchedTitleRef.current = null;
            processedMovieRef.current = null;
            lastFetchedImdbRef.current = null;
        }

        // Update ref to track current movie (only if imdb_code exists and we've initialized)
        // This ensures we don't overwrite with null if movie is still loading
        // But also update if it becomes available (null -> value)
        if (currentMovieImdb && hasInitializedRef.current) {
            // Only update if it's different or if we're setting it for the first time
            if (prevMovieImdbRef.current !== currentMovieImdb) {
                prevMovieImdbRef.current = currentMovieImdb;
            }
        }
    }, [currentMovieImdb, selectedMovie, dispatch]);

    // NOTE: Cleanup of subtitle states is handled by Player.tsx cleanup effect
    // We don't need to clear subtitle states here because:
    // 1. Player.tsx already handles cleanup on unmount
    // 2. Having cleanup here causes issues with React StrictMode double-invocation
    // 3. Controls unmounting shouldn't clear subtitle states (Player should handle that)

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleEnded = () => {
            setIsPlaying(false);
            video.currentTime = 0;
        };

        video.addEventListener('ended', handleEnded);
        return () => video.removeEventListener('ended', handleEnded);
    }, [videoRef, setIsPlaying]);
    
  return (
    <div
        className={twMerge(`
            absolute
            bottom-0
            transition-all
            duration-300
            py-4
            px-3
            w-full
            flex
            gap-2
            items-end
        `)}
        style={{
            background: 'linear-gradient(to top, black 0%, transparent 100%)',
            opacity: controlsVisible ? 1 : 0,
            pointerEvents: controlsVisible ? 'all' : 'none',
            willChange: 'opacity',
            height: `${videoHeight * 0.15}px`,
        }}

    >
        <Button
            title={`${isPlaying ? 'Pause' : 'Play'} (${PLAYER_CONTROLS_KEY_BINDS.PLAY_PAUSE === ' ' ? 'SPACE' : PLAYER_CONTROLS_KEY_BINDS.PLAY_PAUSE.toUpperCase()})`}
            onClick={(e) => {
                stop(e);

                const video = videoRef.current;
                if (!video) return;

                if (video.ended) {
                    video.currentTime = 0;
                }

                if (video.paused) {
                    video.play();
                    setIsPlaying(true);
                } else {
                    video.pause();
                    setIsPlaying(false);
                }
            }}
            className='w-9 h-9 bg-transparent aspect-square justify-center p-0 text-white text-3xl hover:bg-stone-800 duration-200'
        >
            {isPlaying ? <BsPause /> : <BsPlay />}
        </Button>
        
        <Button
            title={`Skip Backward (${SKIP_BACK_SECONDS}s)`}
            onClick={(e) => {
                stop(e);
                handleSkipBackward();
            }}
            className='w-9 h-9 relative bg-transparent aspect-square justify-center p-0 text-white hover:bg-stone-800 duration-200'
        >
            <div className='flex flex-col items-center justify-center'>
                <PiArrowArcLeft className='absolute top-1 text-lg -rotate-12' />
                <span className='text-[10px] absolute bottom-1.5'>{SKIP_BACK_SECONDS}s</span>
            </div>
            {/* <BsSkipBackward className='text-2xl' /> */}
        </Button>

        <Button
            title={`Skip Forward (${SKIP_FORWARD_SECONDS}s)`}
            onClick={(e) => {
                stop(e);
                handleSkipForward();
            }}
            className='w-9 h-9 relative bg-transparent aspect-square justify-center p-0 text-white hover:bg-stone-800 duration-200'
        >
            <div className='flex flex-col items-center justify-center'>
                <PiArrowArcRight className='absolute top-1 text-lg rotate-12' />
                <span className='text-[10px] absolute bottom-1.5'>{SKIP_FORWARD_SECONDS}s</span>
            </div>
            {/* <BsSkipForward className='text-2xl' /> */}
        </Button>

        <TimeTrack
            ref={videoRef}
            bufferWidth={bufferWidth}
            currentTime={currentTime}
            duration={duration}
            playbackWidth={playbackWidth}
            setPlaybackWidth={setPlaybackWidth}
        />

        <div className='relative flex gap-1 items-center text-2xl text-white w-fit'>
            {/* <Button title='Settings' className='w-9 h-9 bg-transparent hover:bg-stone-800 p-0'>
                <IoSettingsOutline />
            </Button> */}
            <Button
                title={`Subtitles - ${isSubtitlesEnabled ? 'On' : 'Off'} (${PLAYER_CONTROLS_KEY_BINDS.TOGGLE_SUBTITLES.toUpperCase()})`}
                onClick={(e) => {
                    stop(e);
                    if (volumeSliderVisible) {
                        setVolumeSliderVisible(false);
                    }

                    if (subtitlesSelectorTabOpen) {
                        dispatch(closeModal('subtitlesSize'));
                        dispatch(closeModal('subtitlesSelectorTab'));
                        return;
                    }

                    dispatch(openModal('subtitlesSelectorTab'));
                }}
                className='w-9 h-9 bg-transparent hover:bg-stone-800 p-0'
            >
                <PiSubtitlesLight />
            </Button>

            <div
                className='flex flex-col w-fit z-10'
                onClick={(e) => {
                    stop(e);
                    setVolumeSliderVisible(!volumeSliderVisible);

                    if (subtitlesSelectorTabOpen) {
                        dispatch(closeModal('subtitlesSize'));
                        dispatch(closeModal('subtitlesSelectorTab'));
                    }
                }}
            >
                <Button
                    title={`Volume ${isMuted ? '(muted)' : `(${Math.round(volume)}%)`}`}
                    className='w-9 h-9 bg-transparent hover:bg-stone-800 p-0'
                    // onClick={(e) => stop(e)} Not needed here - Won't toggle slider
                >
                    {isMuted ? (
                        <IoVolumeMuteOutline />
                    ) : volume <= 33 ? (
                        <IoVolumeLowOutline />
                    ) : volume <= 66 ? (
                        <IoVolumeMediumOutline />
                    ) : (
                        <IoVolumeHighOutline />
                    )}
                </Button>
            </div>

            <Button
                title={`Toggle Fullscreen (${PLAYER_CONTROLS_KEY_BINDS.TOGGLE_FULLSCREEN.toUpperCase()})`}
                className='w-9 h-9 bg-transparent hover:bg-stone-800 p-0'
                onClick={(e) => {
                    stop(e);
                    handleFullScreen();
                }}
            >
                <IoExpandOutline />
            </Button>

            <VolumeSlider
                isMuted={isMuted}
                volume={volume}
                volumeSliderVisible={volumeSliderVisible}
                setVolumeSliderVisible={setVolumeSliderVisible}
                handleVolumeChange={handleVolumeChange}
                handleVolumeMute={handleVolumeMute}
            />

            <div
                onMouseEnter={() => {
                    if (closeTimeout.current) {
                        clearTimeout(closeTimeout.current);
                        closeTimeout.current = null;
                    }
                }}
                onMouseLeave={() => {
                    closeTimeout.current = setTimeout(() => {
                        dispatch(closeModal('subtitlesSelectorTab'));
                        closeTimeout.current = null;

                        if (isSubtitlesSizeModalOpen) {
                            dispatch(closeModal('subtitlesSize'));
                        }
                    }, 3000);
                }}
                className={twMerge(`
                    absolute
                    w-[300px]
                    flex
                    gap-3
                    flex-col
                    items-center
                    justify-between
                    py-2
                    px-3
                    z-50
                    right-0
                    bottom-[120%]
                    rounded-sm
                    bg-stone-800
                    transition-all
                    duration-150
                    shadow-2xl
                    shadow-black
                    border border-stone-600
                    will-change-[opacity]
                    ${subtitlesSelectorTabOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                `)}
            >
                <div className='flex w-full flex-col gap-1'>
                    <p className='text-start w-full text-base text-white flex items-center justify-between'>
                        Subtitles

                        <CloseButton onClose={() => dispatch(closeModal('subtitlesSelectorTab'))} className='md:block absolute top-2 right-2 text-sm p-1 z-0' />
                    </p>
                    
                    <div className='border-y border-stone-500 py-1 flex flex-col'>
                        <span className='text-start text-sm text-stone-400'>Font size</span>
                        
                        <span className='w-full flex justify-between px-2'>
                            <span className='text-base font-medium text-stone-300'>{subtitlesSize}px</span>
                            
                            <Button
                                onClick={(e) => {
                                    stop(e);
                                    dispatch(openModal('subtitlesSize'));
                                }}
                                className='bg-transparent hover:bg-stone-700 text-sm text-blue-500 gap-1 hover:text-blue-400'
                            >
                                <MdEdit />
                                Edit
                            </Button>
                        </span>
                    </div>
                </div>
                
                <div className='border-b border-stone-500 py-1 flex flex-col w-full items-center justify-between gap-1'>
                    <div className='w-full flex'>
                        <span className='text-start text-[16px] text-white w-full'>Delay</span>
                        
                        <div className='flex items-center gap-2 w-full'>
                            <input
                                type="number"
                                value={subtitleDelay}
                                onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    dispatch(setSubtitleDelay(value));
                                }}
                                step="0.1"
                                min="-60"
                                max="60"
                                className='w-16 text-base font-medium text-stone-300 bg-stone-700 border border-stone-600 rounded pl-2 outline-none focus:border-blue-500'
                                placeholder="0.0"
                            />
                            <span className='text-sm text-stone-400'>seconds</span>
                        </div>
                    </div>
                    <Button
                        onClick={(e) => {
                            stop(e);
                            dispatch(setSubtitleDelay(0));
                        }}
                        className='py-0 self-end bg-transparent hover:bg-stone-700 text-sm text-blue-500 gap-1 hover:text-blue-400'
                    >Reset</Button>
                </div>

                <div className='w-full flex gap-4 items-center justify-between'>
                    <span className='flex gap-2 items-center text-base'>Enable subtitles</span>

                    <div className='flex items-center grow justify-end gap-2'>
                        <span className='text-sm'>{isSubtitlesEnabled ? 'On' : 'Off'}</span>
                        <div className="relative inline-flex items-center w-11 h-5">
                            <input
                                id="subtitlesOff"
                                type="checkbox"
                                checked={isSubtitlesEnabled}
                                onChange={() => subtitleFilePath ? dispatch(setIsSubtitlesEnabled(!isSubtitlesEnabled)) : undefined}
                                disabled={!subtitleFilePath}
                                className="peer appearance-none w-11 h-5 bg-gray-100 rounded-full checked:bg-green-600 cursor-pointer transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <label
                                htmlFor="subtitlesOff"
                                className="absolute top-0 left-0 w-5 h-5 bg-white rounded-full border border-slate-300 shadow-sm transition-transform duration-300 peer-checked:translate-x-6 peer-checked:border-green-600 cursor-pointer peer-disabled:cursor-not-allowed"
                            />
                        </div>
                    </div>
                </div>

                {/* Always show subtitle selector */}
                <SubtitlesSelector
                    buttonOnly={true}
                    containerClassName="w-full"
                    languages={useMemo(() => {
                        // Format languages from Redux state (same as MovieInfoPanel)
                        // Use availableSubsLanguages if available, otherwise use languageFiles keys
                        const languageCodes = availableSubsLanguages.length > 0 
                            ? availableSubsLanguages 
                            : Object.keys(languageFiles);
                        
                        const commonIso3Codes = ['eng', 'fra', 'spa', 'deu', 'ita', 'rus', 'jpn', 'ara', 'heb', 'hin'];
                        const commonLanguages: string[] = [];
                        const otherLanguages: string[] = [];
                        
                        languageCodes.forEach(iso3 => {
                            const normalized = normalizeLanguageCode(iso3);
                            const metadata = getSubtitleMetadata(iso3);
                            // Skip languages that don't have a proper label
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
                        
                        // Sort common languages by priority order, then add others
                        const sortedCommon = commonLanguages.sort((a, b) => {
                            const aCode = normalizeLanguageCode(a.split('-')[0]);
                            const bCode = normalizeLanguageCode(b.split('-')[0]);
                            const aIndex = commonIso3Codes.indexOf(aCode);
                            const bIndex = commonIso3Codes.indexOf(bCode);
                            return aIndex - bIndex;
                        });
                        
                        const sortedOther = otherLanguages.sort();
                        return [...sortedCommon, ...sortedOther];
                    }, [availableSubsLanguages, languageFiles])}
                    languageFiles={languageFiles}
                    isLoading={isLoadingSubs}
                    isDownloading={isDownloadingSubs}
                    onSelectSubtitle={handleSelectSubtitleLanguage}
                />
                {/* Manual subtitle file upload button below selector */}
                <Button
                    onClick={() => window.electronAPI.openSubtitleFileDialog().then((path) => {
                        if (path) {
                            dispatch(setSubtitleFilePath(path));
                            dispatch(setIsSubtitlesEnabled(true));
                        }
                    })}
                    className='w-full text-sm text-blue-500 hover:text-blue-400 bg-transparent hover:bg-stone-700 py-2 -mt-1'
                >
                    Choose subtitle file
                </Button>

                {isSubtitlesSizeModalOpen && <div
                    className='w-full h-full absolute top-0 bottom-0 right-0 left-0 z[60]'
                    style={{
                        pointerEvents: isSubtitlesSizeModalOpen ? 'none' : 'all',
                    }}
                >
                    <div className='relative w-full h-full pointer-events-auto'>
                        <SubtitlesSizeDialog isOpen={isSubtitlesSizeModalOpen} />
                    </div>
                </div>}
            </div>
        </div>
    </div>
  )
}

export default Controls;
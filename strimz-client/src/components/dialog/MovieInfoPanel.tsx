import React, { useEffect, useMemo, useState } from 'react';
import TitleWrapper from './TitleWrapper';
import CloseButton from '../CloseButton';
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
import { setAvailableSubtitlesLanguages, setSelectedMovie, setSelectedTorrent, setSubtitleFilePath, setSubtitleLang, setUnavailableSubtitlesLanguages, setSelectedSubtitleFileId, setIsSubtitlesEnabled } from '@/store/movies/movies.slice';
import { closeModal } from '@/store/modals/modals.slice';
import { selectSettings } from '@/store/settings/settings.selectors';
import { downloadSubtitleFromApi } from '@/services/subtitles';
import { selectAvailableSubtitlesLanguages, selectSubtitleFilePath, selectSubtitleLang, selectLanguageFiles, selectSelectedSubtitleFileId } from '@/store/movies/movies.selectors';
import SubtitlesSelector from './SubtitlesSelector';
import { playTorrent } from '@/services/movies';
import { getDownloadsCache } from '@/utils/downloadsCache';
import { toOpenSubtitlesCode, getSubtitleMetadata, normalizeLanguageCode } from '@/utils/detectLanguage';
import { getMovieSuggestions } from '@/services/suggestions';
import MovieCard from '../MovieCard';
import { getMoviesByIds } from '@/services/movies';
import Cast from './Cast';

type MovieInfoPanelTab = 'general' | 'cast';

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
        title
    } = movie;

    const [activeTab, setActiveTab] = useState<MovieInfoPanelTab>('general');

    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [hash, setHash] = useState<string>('');
    const [selectedQuality, setSelectedQuality] = useState<string>('');
    const availableSubsLanguages = useAppSelector(selectAvailableSubtitlesLanguages);
    const languageFiles = useAppSelector(selectLanguageFiles);
    const [isDownloadingSubs, setIsDownloadingSubs] = useState<boolean>(false);
    const subtitleLang = useAppSelector(selectSubtitleLang);
    const subtitleFilePath = useAppSelector(selectSubtitleFilePath);
    const selectedSubtitleFileId = useAppSelector(selectSelectedSubtitleFileId);
    const settings = useAppSelector(selectSettings);

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
        setSelectedQuality(quality);
        setHash('');
    }

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

    useEffect(() => {
        setActiveTab('general');
    }, [movie?.id]);
    
  return (
    <div className='min-h-0 h-full overflow-y-auto overflow-x-hidden md:relative w-full flex flex-col justify-between top-0 md:grow md:flex-1 md:justify-center relative'>
        <nav className="flex shrink-0 gap-0 items-center border-b border-stone-700 bg-stone-800" aria-label="Movie details tabs">
            <button
                type="button"
                onClick={() => setActiveTab('general')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
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
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'cast'
                        ? 'bg-stone-900 text-white border-b-2 border-stone-500 -mb-px'
                        : 'text-stone-400 hover:text-white hover:bg-stone-800/50'
                }`}
            >
                Cast
            </button>
            <CloseButton
                onClose={handleClose}
                className="!relative !top-0 !right-1 ml-auto p-1.5 text-base border-0 shrink-0 md:!flex"
                title="Close"
            />
        </nav>

        {activeTab === 'general' && (
        <>
        <MobileCoverSpacer />

        <div className='flex flex-col inset-0 bg-gradient-to-t from-stone-950 from-30% md:from-40% md:grow px-2 relative'>
            <TitleWrapper title={title} />
            <Metadata movie={movie} />

            <div className='py-1 flex w-full gap-3 md:h-full h-32 flex-col'>
                <QualitySelector selected={selectedQuality} torrents={torrents} handleSelect={handleQualityChange} />
                <TorrentSelector handleSelect={handleTorrentSelect} quality={selectedQuality} torrents={torrents} hash={hash} />
            </div>

            <SubtitlesSelector
                languages={formattedLanguages}
                languageFiles={languageFiles}
                isLoading={isLoadingSubtitles}
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
                        <div className="grid 2xl:grid-cols-3 2xl:grid-rows-2 grid-cols-1 grid-rows-auto md:grid-cols-2 md:grid-rows-auto sm:grid-cols-1 sm:grid-rows-auto gap-3 h-full overflow-y-auto">
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
        </>
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
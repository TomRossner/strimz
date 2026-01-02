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
import { setAvailableSubtitlesLanguages, setSelectedTorrent, setSubtitleFilePath, setSubtitleLang, setUnavailableSubtitlesLanguages } from '@/store/movies/movies.slice';
import { closeModal } from '@/store/modals/modals.slice';
import { selectSettings } from '@/store/settings/settings.selectors';
import { checkAvailability, downloadSubtitles } from '@/services/subtitles';
import { CACHE_TTL, getSubsCache, updateSubsCache } from '@/utils/subsLanguagesCache';
import { selectAvailableSubtitlesLanguages, selectSubtitleFilePath, selectSubtitleLang } from '@/store/movies/movies.selectors';
import SubtitlesSelector from './SubtitlesSelector';
import { playTorrent } from '@/services/movies';
import { COMMON_LANGUAGES } from '@/utils/languages';
import { getDownloadsCache } from '@/utils/downloadsCache';

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
            downloadSubtitles(
                subtitleLang,
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
        const cacheKey = `${movie.imdb_code}-${movie.year}`;
        const cached = getSubsCache()[cacheKey];

        // Always update selected language in store
        dispatch(setSubtitleLang(langId));

        // Reset subtitle file path if changing language
        if (langId !== subtitleLang && subtitleFilePath) {
            dispatch(setSubtitleFilePath(null));
        }

        // If language is already known in cache, just update state and download if available
        if (
            cached &&
            Date.now() - cached.ts < CACHE_TTL &&
            (cached.available.includes(langId) || cached.unavailable.includes(langId))
        ) {
            dispatch(setAvailableSubtitlesLanguages(cached.available));
            setNotAvailableSubs(cached.unavailable);

            // Download if available and not already downloaded
            if (cached.available.includes(langId) && !subtitleFilePath) {
                setIsDownloadingSubs(true);
                try {
                    const { data: downloadedPath } = await downloadSubtitles(
                        langId,
                        movie.imdb_code,
                        movie.title,
                        movie.year.toString(),
                        settings.downloadsFolderPath
                    );
                    dispatch(setSubtitleFilePath(downloadedPath));
                } catch (error) {
                    console.error('Failed to download subtitles:', error);
                } finally {
                    setIsDownloadingSubs(false);
                }
            }
            return;
        }

        // Otherwise, check availability
        setIsLoadingSubs(true);

        try {
            const {
                data: { isAvailable }
            } = await checkAvailability(
                langId,
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
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingSubs(false);
        }
    }

    useEffect(() => {
        if (!movie.imdb_code || !movie.year) return;

        const cacheKey = `${movie.imdb_code}-${movie.year}`;
        const cached = getSubsCache()[cacheKey];

        if (cached && Date.now() - cached.ts < CACHE_TTL) {
            const newState = [...new Set([...availableSubsLanguages, ...cached.available])]
            dispatch(setAvailableSubtitlesLanguages(newState));
            setNotAvailableSubs(prev => [...new Set([...prev, ...cached.unavailable])]);
        }
    }, [movie.imdb_code, movie.year, dispatch]);

    useEffect(() => {
        return () => {
            dispatch(setAvailableSubtitlesLanguages([]));
            dispatch(setUnavailableSubtitlesLanguages([]));
            dispatch(setSubtitleLang(null));
        }
    }, []);
    
  return (
    <div className='min-h-full overflow-y-auto md:relative w-full flex flex-col justify-between absolute top-0 md:grow md:justify-center'>
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
    </div>
  )
}

export default MovieInfoPanel;
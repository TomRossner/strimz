import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectSocket } from '@/store/socket/socket.selectors';
import { Cue, DownloadProgressData } from '@/utils/types';
import React, { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Page from '../Page';
import Container from '../Container';
import LoadingIcon from '../LoadingIcon';
import Progress from '../Progress';
import { twMerge } from 'tailwind-merge';
import '../../styles/playbackRangeInput.css';
import '../../styles/volumeRangeInput.css';
import Controls from './Controls';
import { selectMovie, selectSubtitleFilePath, selectSubtitleLang, selectIsSubtitlesEnabled, selectSelectedTorrent, selectExternalTorrent, selectSubtitleDelay } from '@/store/movies/movies.selectors';
import { selectMovieDownloadInfoPanel, selectSubtitlesSelectorTab, selectSubtitlesSizeModal } from '@/store/modals/modals.selectors';
import { setIsSubtitlesEnabled, setVttSubtitlesContent, setAvailableSubtitlesLanguages, setSubtitleLang, setSubtitleFilePath, setSubtitleDelay, setSelectedMovie } from '@/store/movies/movies.slice';
import { PLAYER_CONTROLS_KEY_BINDS, SKIP_BACK_SECONDS, SKIP_FORWARD_SECONDS } from '@/utils/constants';
import TopOverlay from './TopOverlay';
import ShortcutActionDisplay from './ShortcutActionDisplay';
import throttle from 'lodash.throttle';
import { getSubtitleMetadata } from '@/utils/detectLanguage';
import Subtitles from './Subtitles';
import BackButton from '../BackButton';
import { pauseDownload } from '@/services/movies';
import { openModal } from '@/store/modals/modals.slice';
import { updatePlaybackPosition, getPlaybackPosition } from '@/utils/downloadsCache';

const {
    PLAY_PAUSE,
    MUTE_UNMUTE,
    SEEK_BACKWARD,
    SEEK_FORWARD,
    TOGGLE_FULLSCREEN,
    TOGGLE_SUBTITLES,
    VOLUME_DOWN,
    VOLUME_UP
} = PLAYER_CONTROLS_KEY_BINDS;

const Player = ({ src }: React.VideoHTMLAttributes<HTMLVideoElement>) => {
    const [searchParams] = useSearchParams();
    const hash = searchParams.get('hash');
    const poster = searchParams.get('poster');
    const title = searchParams.get('title');
    const dispatch = useAppDispatch();

    const [isReadyToPlay, setIsReadyToPlay] = useState<boolean>(false);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);

    const [parsedSubtitles, setParsedSubtitles] = useState<Cue[]>([]);
    const [currentSubtitle, setCurrentSubtitle] = useState<string>('');

    const socket = useAppSelector(selectSocket);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    
    const [controlsVisible, setControlsVisible] = useState<boolean>(false);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [playbackWidth, setPlaybackWidth] = useState<number>(0);
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

    const containerRef = useRef<HTMLDivElement>(null);

    const mouseMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isSubtitlesSizeModalOpen = useAppSelector(selectSubtitlesSizeModal);

    const isSubtitlesEnabled = useAppSelector(selectIsSubtitlesEnabled);
    const hasSubtitles = useAppSelector(selectSubtitleFilePath);
    const subtitleDelay = useAppSelector(selectSubtitleDelay);

    const isInfoPanelOpen = useAppSelector(selectMovieDownloadInfoPanel);
    
    const movie = useAppSelector(selectMovie);

    const [hasUsedKeyboardShortcut, setHasUsedKeyboardShortcut] = useState<boolean>(false);
    const keyboardShortcutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [keyboardShortcut, setKeyboardShortcut] = useState<string | null>(null);

    const subtitlesSelectorTabOpen = useAppSelector(selectSubtitlesSelectorTab);

    const [downloadInfo, setDownloadInfo] = useState<DownloadProgressData | null>(null);
    const bufferWidth = downloadInfo ? Number((downloadInfo.progress * 100).toFixed(2)) : 0;

    const selectedTorrent = useAppSelector(selectSelectedTorrent);
    const externalTorrent = useAppSelector(selectExternalTorrent);

    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from;

    const toggleFullscreen = () => {
        const container = containerRef.current;

        if (!container) return;

        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            container.requestFullscreen();
        }
    }

    const renderSubtitles = useCallback(() => {
        if (!videoRef.current) return;

        const currentTime = videoRef.current.currentTime;
        const adjustedTime = currentTime + subtitleDelay;
        let currentSubtitleText = '';

        for (const cue of parsedSubtitles) {
            if (adjustedTime >= cue.start && adjustedTime <= cue.end) {
                currentSubtitleText = cue.text;
                break;
            }
        }

        setCurrentSubtitle(prev => {
            if (prev !== currentSubtitleText) {
                return currentSubtitleText;
            }
            return prev;
        });
    }, [parsedSubtitles, subtitleDelay]);

    const throttledHandleTimeUpdate = useRef<((e: React.SyntheticEvent<HTMLVideoElement>) => void) | null>(null);
    const throttledSavePlaybackPosition = useRef<((currentTime: number) => void) | null>(null);

    useEffect(() => {
        throttledHandleTimeUpdate.current = throttle((e: React.SyntheticEvent<HTMLVideoElement>) => {
            const video = e.currentTarget;

            if (!video) return;

            renderSubtitles();
            setCurrentTime(video.currentTime);
            setDuration(video.duration);
            setPlaybackWidth((video.currentTime / video.duration) * 100);
            
            // Save playback position periodically (throttled to avoid excessive writes)
            if (hash && video.currentTime > 0 && !video.paused) {
                throttledSavePlaybackPosition.current?.(video.currentTime);
            }
        }, 250);
        
        // Throttled function to save playback position (save every 5 seconds)
        throttledSavePlaybackPosition.current = throttle((currentTime: number) => {
            if (hash) {
                updatePlaybackPosition(hash, currentTime);
            }
        }, 5000);
    }, [renderSubtitles, hash]);

    // Note: Playback position restoration is handled in onLoadedMetadata handler on the video element
    // This ensures it happens at the right time after the video metadata is loaded

    const handleSkipForward = () => {
        if (!videoRef.current || !videoRef.current.duration) return;
        const newTime = Math.min(videoRef.current.currentTime + SKIP_FORWARD_SECONDS, videoRef.current.duration);
        videoRef.current.currentTime = newTime;
    }

    const handleSkipBackward = () => {
        if (!videoRef.current) return;
        const newTime = Math.max(videoRef.current.currentTime - SKIP_BACK_SECONDS, 0);
        videoRef.current.currentTime = newTime;
    }

    const handleMouseMove = useCallback(() => {
        setControlsVisible(true);
        
        if (isSubtitlesSizeModalOpen || isInfoPanelOpen || subtitlesSelectorTabOpen) return;

        if (mouseMoveTimeoutRef.current) clearTimeout(mouseMoveTimeoutRef.current);

        mouseMoveTimeoutRef.current = setTimeout(() => {
            if (isSubtitlesSizeModalOpen || isInfoPanelOpen || subtitlesSelectorTabOpen) return;
            setControlsVisible(false);
        }, 2000);
    }, [isSubtitlesSizeModalOpen, isInfoPanelOpen, subtitlesSelectorTabOpen]);

    useEffect(() => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current?.play().catch(console.error);
            } else videoRef.current?.pause();
        }
    }, [isPlaying, videoRef]);

    const throttledSetDownloadInfo = useRef(
        throttle((data: DownloadProgressData) => {
            setDownloadInfo(data);
        }, 500)
    ).current;

    useEffect(() => {
        // Only listen to socket events if we have a hash (torrent-based download)
        // File-only downloads don't have hash and don't emit socket events
        if (!socket?.id || !hash) {
            // For file-only downloads, set downloadInfo to null
            if (!hash) {
                setDownloadInfo(null);
            }
            return;
        }

        const handleProgress = (data: DownloadProgressData) => {
            if (data.hash.toLowerCase() === hash.toLowerCase()) {
                throttledSetDownloadInfo({
                    ...data,
                    downloaded: data.downloaded ?? downloadInfo?.downloaded ?? 0,
                    peers: data.peers ?? downloadInfo?.peers ?? 0,
                    timeRemaining: data.timeRemaining ?? downloadInfo?.timeRemaining ?? 0,
                    fileName: data.fileName || downloadInfo?.fileName || '',
                    done: data.done ?? downloadInfo?.done ?? false,
                    paused: data.paused ?? downloadInfo?.paused ?? false,
                    progress: data.progress ?? downloadInfo?.progress ?? 0,
                    speed: data.speed ?? downloadInfo?.speed ?? 0,
                    slug: data.slug || downloadInfo?.slug || '',
                    url: data.url || downloadInfo?.url || '',
                } satisfies DownloadProgressData);
            }
        }

        socket.on('downloadProgress', handleProgress);
        socket.on('downloadDone', handleProgress);

        return () => {
            socket.off('downloadProgress', handleProgress);
            socket.off('downloadDone', handleProgress);
        }
    }, [
        socket,
        hash,
        throttledSetDownloadInfo,
        downloadInfo?.downloaded,
        downloadInfo?.peers,
        downloadInfo?.timeRemaining,
        downloadInfo?.done,
        downloadInfo?.fileName,
        downloadInfo?.paused,
        downloadInfo?.progress,
        downloadInfo?.speed,
        downloadInfo?.slug,
        downloadInfo?.url,
    ]);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (mouseMoveTimeoutRef.current) clearTimeout(mouseMoveTimeoutRef.current);
        }
    }, [handleMouseMove]);

    const adjustVolume = (video: HTMLVideoElement, delta: number) => {
        const newVolume = Math.min(Math.max(video.volume + delta, 0), 1);
        video.volume = Math.round(newVolume * 100) / 100;
    }

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const video = videoRef.current;

        if (!video || isSubtitlesSizeModalOpen) return;

        switch (e.key) {
            case PLAY_PAUSE:
                e.preventDefault();
                setIsPlaying(prev => !prev);
                setHasUsedKeyboardShortcut(true);
                setKeyboardShortcut(e.key);
                break;
            case TOGGLE_FULLSCREEN:
                e.preventDefault();
                toggleFullscreen();
                setHasUsedKeyboardShortcut(true);
                setKeyboardShortcut(e.key);
                break;
            case SEEK_BACKWARD:
                e.preventDefault();
                handleSkipBackward();
                setHasUsedKeyboardShortcut(true);
                setKeyboardShortcut(e.key);
                break;
            case SEEK_FORWARD:
                e.preventDefault();
                handleSkipForward();
                setHasUsedKeyboardShortcut(true);
                setKeyboardShortcut(e.key);
                break;
            case VOLUME_UP:
                e.preventDefault();
                adjustVolume(video, 0.01);
                setHasUsedKeyboardShortcut(true);
                setKeyboardShortcut(e.key);
                break;
            case VOLUME_DOWN:
                e.preventDefault();
                adjustVolume(video, -0.01);
                setHasUsedKeyboardShortcut(true);
                setKeyboardShortcut(e.key);
                break;
            case MUTE_UNMUTE:
                e.preventDefault();
                setIsMuted(prev => !prev);
                setHasUsedKeyboardShortcut(true);
                setKeyboardShortcut(e.key);
                break;
            case TOGGLE_SUBTITLES:
                e.preventDefault();
                dispatch(setIsSubtitlesEnabled(hasSubtitles ? !isSubtitlesEnabled : isSubtitlesEnabled));
                setHasUsedKeyboardShortcut(true);
                setKeyboardShortcut(e.key);
                break;
            default:
                return;
        }
    }, [
        isSubtitlesSizeModalOpen,
        isSubtitlesEnabled,
        dispatch,
        hasSubtitles,
    ]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    useEffect(() => {
        if (hasUsedKeyboardShortcut) {
            if (keyboardShortcutTimeoutRef.current) clearTimeout(keyboardShortcutTimeoutRef.current);

            keyboardShortcutTimeoutRef.current = setTimeout(() => {
                setHasUsedKeyboardShortcut(false);
            }, 2000);
        }
    }, [hasUsedKeyboardShortcut]);

    const subtitleLang = useAppSelector(selectSubtitleLang);
    const subtitleFilePath = useAppSelector(selectSubtitleFilePath);
    
    // Subs Metadata: { lang, label }
    const subsMetadata = useMemo(() => subtitleLang ? getSubtitleMetadata(subtitleLang as string) : undefined, [subtitleLang]);

    // Convert SRT subtitle file to VTT when subtitleFilePath changes
    useEffect(() => {
        const convertSubtitleToVTT = async () => {
            if (!subtitleFilePath || !subtitleLang) {
                dispatch(setVttSubtitlesContent(null));
                return;
            }

            try {
                const lang = subsMetadata?.lang || subtitleLang;
                const vttText = await window.electronAPI.convertSRTtoVTT(subtitleFilePath, lang);
                if (vttText) {
                    dispatch(setVttSubtitlesContent(vttText));
                } else {
                    dispatch(setVttSubtitlesContent(null));
                }
            } catch (error) {
                console.error('Error converting subtitle to VTT:', error);
                dispatch(setVttSubtitlesContent(null));
            }
        };

        convertSubtitleToVTT();
    }, [subtitleFilePath, subtitleLang, subsMetadata?.lang, dispatch]);

    // Update video dimensions when video element resizes
    useEffect(() => {
        if (!isReadyToPlay) return;
        
        const video = videoRef.current;
        if (!video) return;

        const updateDimensions = () => {
            if (video) {
                const width = video.clientWidth || 0;
                const height = video.clientHeight || 0;
                if (width > 0 && height > 0) {
                    setVideoDimensions(prev => {
                        // Only update if dimensions actually changed to prevent unnecessary re-renders
                        if (prev.width === width && prev.height === height) {
                            return prev;
                        }
                        return { width, height };
                    });
                }
            }
        };

        // Initial dimensions with a small delay to ensure video is rendered
        const timeoutId = setTimeout(updateDimensions, 100);

        // Use ResizeObserver for efficient dimension tracking
        const resizeObserver = new ResizeObserver(() => {
            updateDimensions();
        });

        resizeObserver.observe(video);

        // Also listen to fullscreen changes
        const handleFullscreenChange = () => {
            // Small delay to ensure dimensions are updated after fullscreen change
            setTimeout(updateDimensions, 100);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            clearTimeout(timeoutId);
            resizeObserver.disconnect();
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, [isReadyToPlay]);

    // Clear all subtitle state when source changes (new movie from disk or stream)
    useEffect(() => {
        // Clear all subtitle-related state when src, hash, or title changes
        // Don't clear selectedMovie - it should persist and only update when clicking MovieCard
        dispatch(setAvailableSubtitlesLanguages([]));
        dispatch(setSubtitleLang(null));
        dispatch(setSubtitleFilePath(null));
        dispatch(setIsSubtitlesEnabled(false));
        dispatch(setSubtitleDelay(0));
        dispatch(setVttSubtitlesContent(null));
    }, [src, hash, title, dispatch]);

    useEffect(() => {
        return () => {
            videoRef.current?.pause();
            videoRef.current?.removeAttribute('src');
            videoRef.current?.load();
            // Clear all subtitle state when player unmounts
            // Clear selectedMovie only if playing from Downloads page
            dispatch(setAvailableSubtitlesLanguages([]));
            dispatch(setSubtitleLang(null));
            dispatch(setSubtitleFilePath(null));
            dispatch(setIsSubtitlesEnabled(false));
            dispatch(setSubtitleDelay(0));
            dispatch(setVttSubtitlesContent(null));
            if (from === '/downloads') {
                dispatch(setSelectedMovie(null));
            }
        }
    }, [dispatch, from]);

    return (
        <Page>
            <Container id="watchMovie" className="min-h-0 max-h-[100vh] overflow-hidden grow">
                {isReadyToPlay ? (
                    <div
                        ref={containerRef}
                        onMouseLeave={() => setControlsVisible(false)}
                        className='flex flex-col justify-center w-full h-[98vh] relative'
                    >
                        <TopOverlay
                            videoRef={videoRef as RefObject<HTMLVideoElement>}
                            isVisible={controlsVisible}
                            title={`${title} ${movie?.year ? `(${movie.year})` : ''}`}
                            downloadInfo={downloadInfo}
                            videoDimensions={videoDimensions}
                        />

                        <ShortcutActionDisplay
                            isVisible={hasUsedKeyboardShortcut}
                            isMuted={isMuted}
                            isPlaying={isPlaying}
                            shortcut={keyboardShortcut}
                            videoRef={videoRef as RefObject<HTMLVideoElement>}
                        />

                        <video
                            ref={videoRef}
                            autoPlay
                            muted={isMuted}
                            lang={subsMetadata?.lang || undefined}
                            poster={poster || ''}
                            onPlayCapture={() => {
                                if (!isPlaying) setIsPlaying(true);
                            }}
                            onPause={() => setIsPlaying(false)}
                            onEnded={() => {
                                setIsPlaying(false);
                                videoRef.current!.currentTime = 0;
                                // Clear playback position when video ends
                                if (hash) {
                                    updatePlaybackPosition(hash, 0);
                                }
                            }}
                            onLoadedMetadata={() => {
                                // Restore playback position when metadata is loaded
                                if (hash && videoRef.current) {
                                    const savedPosition = getPlaybackPosition(hash);
                                    if (savedPosition !== null && savedPosition > 0 && videoRef.current.duration) {
                                        if (savedPosition < videoRef.current.duration) {
                                            videoRef.current.currentTime = savedPosition;
                                            console.log(`[Player] Restored playback position to ${savedPosition.toFixed(1)}s on metadata load`);
                                        }
                                    }
                                }
                            }}
                            onTimeUpdate={e => throttledHandleTimeUpdate.current?.(e)}
                            onClick={() => {
                                if (!videoRef.current) return;
                                setIsPlaying(!videoRef.current.paused);
                            }}
                            onDoubleClick={toggleFullscreen}
                            className={twMerge(`
                                aspect-video
                                w-full
                                mx-auto
                                will-change-[cursor]
                                ${controlsVisible ? 'cursor-default' : 'cursor-none'}
                            `)}
                        >
                            <source src={src || undefined} type='video/mp4' />
                            {/* {hasSubtitles && isSubtitlesEnabled && vttSubs && (
                                <track 
                                    default
                                    kind="subtitles"
                                    srcLang={subsMetadata?.lang.length ? subsMetadata.lang.split('-')[0] : undefined}
                                    src={vttSubs}
                                    dir={isRTL(subsMetadata?.lang as string) ? 'rtl' : 'ltr'}
                                    className={twMerge(`w-full text-center text-white px-4 z-10`)}
                                    style={{
                                        direction: isRTL(subsMetadata?.lang as string) ? 'rtl' : 'ltr',
                                        unicodeBidi: 'embed',
                                    }}
                                />
                            )} */}
                        </video>

                        <Subtitles
                            currentSubtitle={currentSubtitle}
                            setCurrentSubtitle={setCurrentSubtitle}
                            parsedSubtitles={parsedSubtitles}
                            setParsedSubtitles={setParsedSubtitles}
                            videoDimensions={videoDimensions}
                        />

                        <Controls
                            ref={videoRef as RefObject<HTMLVideoElement>}
                            isPlaying={isPlaying}
                            setIsPlaying={setIsPlaying}
                            controlsVisible={controlsVisible}
                            setControlsVisible={setControlsVisible}
                            isMuted={isMuted}
                            setIsMuted={setIsMuted}
                            playbackWidth={playbackWidth}
                            setPlaybackWidth={setPlaybackWidth}
                            currentTime={currentTime}
                            duration={duration}
                            bufferWidth={bufferWidth}
                            handleFullScreen={toggleFullscreen}
                            handleSkipForward={handleSkipForward}
                            handleSkipBackward={handleSkipBackward}
                        />
                    </div>
                ) : (
                    <div className='relative w-full'>
                        <BackButton
                            className='absolute left-1 top-1 z-10'
                            cb={async () => {
                                if (externalTorrent) return;
            
                                const video = videoRef.current;
                                if (video) {
                                    video.pause();
                                    video.src = "";
                                    video.load();
                                }
            
                                // Clear all subtitle state before navigating away
                                // Clear selectedMovie only if playing from Downloads page
                                dispatch(setAvailableSubtitlesLanguages([]));
                                dispatch(setSubtitleLang(null));
                                dispatch(setSubtitleFilePath(null));
                                dispatch(setIsSubtitlesEnabled(false));
                                dispatch(setSubtitleDelay(0));
                                dispatch(setVttSubtitlesContent(null));
                                if (from === '/downloads') {
                                    dispatch(setSelectedMovie(null));
                                }
            
                                // Only pause download if we have a hash (torrent-based download)
                                if (selectedTorrent?.hash) {
                                    await pauseDownload(selectedTorrent.hash);
                                }
                                
                                if (from === '/') {
                                    navigate('/', {
                                        state: {
                                            from: '/stream/:slug'
                                        }
                                    });
                                    dispatch(openModal('movie'));
                                } else {
                                    navigate(-1);
                                }
                            }}
                        />
                        <div style={{ backgroundImage: `url(${poster})` }} className={`my-auto bg-cover aspect-video bg-center relative w-full flex items-center bg-black justify-center`}>
                            <div className="flex relative items-center justify-center rounded-full aspect-square z-30">
                                {hash && <Progress progressOnly hash={hash as string} />}
                                <LoadingIcon size={70} />
                            </div>

                            <video
                                hidden
                                muted
                                src={src || undefined} 
                                onCanPlay={() => setIsReadyToPlay(true)}
                            />
                        </div>
                    </div>
                )}
            </Container>
        </Page>
    )
}

export default Player;
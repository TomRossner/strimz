import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectSocket } from '@/store/socket/socket.selectors';
import { Cue, DownloadProgressData } from '@/utils/types';
import React, { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Page from '../Page';
import Container from '../Container';
import LoadingIcon from '../LoadingIcon';
import Progress from '../Progress';
import { twMerge } from 'tailwind-merge';
import '../../styles/playbackRangeInput.css';
import '../../styles/volumeRangeInput.css';
import Controls from './Controls';
import Subtitles from './Subtitles';
import { selectMovie, selectSubtitleFilePath, selectUseSubtitles } from '@/store/movies/movies.selectors';
import { selectMovieDownloadInfoPanel, selectSubtitlesSelectorTab, selectSubtitlesSizeModal } from '@/store/modals/modals.selectors';
import { setUseSubtitles } from '@/store/movies/movies.slice';
import { PLAYER_CONTROLS_KEY_BINDS, SKIP_BACK_SECONDS, SKIP_FORWARD_SECONDS } from '@/utils/constants';
import TopOverlay from './TopOverlay';
import ShortcutActionDisplay from './ShortcutActionDisplay';
import throttle from 'lodash.throttle';

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

    const containerRef = useRef<HTMLDivElement>(null);

    const mouseMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isSubtitlesSizeModalOpen = useAppSelector(selectSubtitlesSizeModal);

    const useSubtitles = useAppSelector(selectUseSubtitles);
    const hasSubtitles = useAppSelector(selectSubtitleFilePath);

    const isInfoPanelOpen = useAppSelector(selectMovieDownloadInfoPanel);
    
    const movie = useAppSelector(selectMovie);

    const [hasUsedKeyboardShortcut, setHasUsedKeyboardShortcut] = useState<boolean>(false);
    const keyboardShortcutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [keyboardShortcut, setKeyboardShortcut] = useState<string | null>(null);

    const subtitlesSelectorTabOpen = useAppSelector(selectSubtitlesSelectorTab);

    const [downloadInfo, setDownloadInfo] = useState<DownloadProgressData | null>(null);
    const bufferWidth = downloadInfo ? Number((downloadInfo.progress * 100).toFixed(2)) : 0;

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
        if (!videoRef.current || !parsedSubtitles) {
            return;
        }

        const currentTime = videoRef.current.currentTime;
        let currentSubtitleText = '';

        for (const cue of parsedSubtitles) {
            if (currentTime >= cue.start && currentTime <= cue.end) {
                currentSubtitleText = cue.text;
                break;
            }
        }

        setCurrentSubtitle(currentSubtitleText);
    }, [parsedSubtitles]);

    const handleTimeUpdate = () => {
        const video = videoRef.current;

        if (!video) return;

        renderSubtitles();
        setCurrentTime(video.currentTime);
        setDuration(video.duration);
        setPlaybackWidth((video.currentTime / video.duration) * 100);
    }

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
        if (!socket?.id || !hash) return;

        const handleProgress = (data: DownloadProgressData) => {
            if (data.hash.toLowerCase() === hash.toLowerCase()) {
                throttledSetDownloadInfo({
                    ...data,
                    downloaded: data.downloaded || downloadInfo?.downloaded || 0,
                    peers: data.peers || downloadInfo?.peers || 0,
                    timeRemaining: data.timeRemaining || downloadInfo?.timeRemaining || 0,
                    fileName: data.fileName ? data.fileName : downloadInfo?.fileName || '',
                    done: data.done || downloadInfo?.done || false,
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
                dispatch(setUseSubtitles(hasSubtitles ? !useSubtitles : useSubtitles));
                setHasUsedKeyboardShortcut(true);
                setKeyboardShortcut(e.key);
                break;
        }
    }, [
        isSubtitlesSizeModalOpen,
        useSubtitles,
        dispatch,
        hasSubtitles,
    ]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    useEffect(() => {
        if (isReadyToPlay && !isPlaying) {
            setIsPlaying(true);
        }
    }, [isReadyToPlay]);

    useEffect(() => {
        if (hasUsedKeyboardShortcut) {
            if (keyboardShortcutTimeoutRef.current) clearTimeout(keyboardShortcutTimeoutRef.current);

            keyboardShortcutTimeoutRef.current = setTimeout(() => {
                setHasUsedKeyboardShortcut(false);
            }, 2000);
        }
    }, [hasUsedKeyboardShortcut]);

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
                            isVisible={controlsVisible}
                            title={`${title} (${movie?.year})`}
                            downloadInfo={downloadInfo}
                            // isDone={isDone}
                            // torrentFileName={torrentFileName}
                            videoDimensions={{
                                height: videoRef.current?.clientHeight || 0,
                                width: videoRef.current?.clientWidth || 0,
                            }}
                        />

                        <ShortcutActionDisplay
                            isVisible={hasUsedKeyboardShortcut}
                            isMuted={isMuted}
                            isPlaying={isPlaying}
                            shortcut={keyboardShortcut}
                            videoRef={videoRef as RefObject<HTMLVideoElement>}
                        />

                        <video
                            autoPlay
                            muted={isMuted}
                            ref={videoRef}
                            poster={poster ?? ''}
                            onCanPlay={() => setIsPlaying(true)}
                            onTimeUpdate={handleTimeUpdate}
                            onClick={() => setIsPlaying(videoRef.current?.paused as boolean)}
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
                        </video>

                        <Subtitles
                            currentSubtitle={currentSubtitle}
                            setCurrentSubtitle={setCurrentSubtitle}
                            parsedSubtitles={parsedSubtitles}
                            setParsedSubtitles={setParsedSubtitles}
                            videoDimensions={{
                                height: videoRef.current?.clientHeight || 0,
                                width: videoRef.current?.clientWidth || 0,
                            }}
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
                    <div style={{ backgroundImage: `url(${poster})` }} className={`my-auto bg-cover aspect-video bg-center relative w-full flex items-center bg-black justify-center`}>
                        <div className="flex relative items-center justify-center rounded-full aspect-square z-30">
                            <Progress progressOnly hash={searchParams.get('hash') as string} />
                            <LoadingIcon size={70} />
                        </div>

                        <video
                            hidden
                            muted
                            src={src || undefined} 
                            onCanPlay={() => setIsReadyToPlay(true)}
                        />
                    </div>
                )}
            </Container>
        </Page>
    )
}

export default Player;
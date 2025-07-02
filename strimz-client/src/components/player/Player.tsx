import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectSocket } from '@/store/socket/socket.selectors';
import { Cue, DownloadProgressData } from '@/utils/types';
import React, { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Page from '../Page';
import Container from '../Container';
import BackButton from '../BackButton';
import { openModal } from '@/store/modals/modals.slice';
import LoadingIcon from '../LoadingIcon';
import Progress from '../Progress';
import { twMerge } from 'tailwind-merge';
import '../../styles/playbackRangeInput.css';
import '../../styles/volumeRangeInput.css';
import Controls from './Controls';
import Subtitles from './Subtitles';
import { selectExternalTorrent, selectMovie, selectSubtitleFilePath, selectUseSubtitles } from '@/store/movies/movies.selectors';
import { selectMovieDownloadInfoPanel, selectSubtitlesSizeModal } from '@/store/modals/modals.selectors';
import { setUseSubtitles } from '@/store/movies/movies.slice';
import { PLAYER_CONTROLS_KEY_BINDS, SKIP_BACK_SECONDS, SKIP_FORWARD_SECONDS } from '@/utils/constants';
import { BsInfoCircle } from 'react-icons/bs';
import Button from '../Button';
import InfoPanel from './InfoPanel';

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
    
    const [bufferWidth, setBufferWidth] = useState<number>(0);
    
    const [controlsVisible, setControlsVisible] = useState<boolean>(false);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [playbackWidth, setPlaybackWidth] = useState<number>(0);
    const [isMuted, setIsMuted] = useState<boolean>(false);

    const externalTorrent = useAppSelector(selectExternalTorrent);

    const containerRef = useRef<HTMLDivElement>(null);

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isSubtitlesSizeModalOpen = useAppSelector(selectSubtitlesSizeModal);

    const useSubtitles = useAppSelector(selectUseSubtitles);
    const hasSubtitles = useAppSelector(selectSubtitleFilePath);

    const isInfoPanelOpen = useAppSelector(selectMovieDownloadInfoPanel);
    
    const movie = useAppSelector(selectMovie); 

    const handleFullScreen = () => {
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
        
        if (isSubtitlesSizeModalOpen || isInfoPanelOpen) return;

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            if (isSubtitlesSizeModalOpen || isInfoPanelOpen) return;
            setControlsVisible(false);
        }, 2000);
    }, [isSubtitlesSizeModalOpen, isInfoPanelOpen]);

    useEffect(() => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current?.play().catch(console.log);
            } else videoRef.current?.pause();
        }
    }, [isPlaying, videoRef]);

    useEffect(() => {
        if (!socket?.id || !hash) return;

        socket.on('downloadProgress', (data: DownloadProgressData) => {
            if (data.hash.toLowerCase() === hash.toLowerCase()) {
                setBufferWidth(Number((data.progress * 100).toFixed(2)));
            }
        })
        socket.on('downloadDone', (data: { hash: string, done: boolean }) => {
            if (data.hash.toLowerCase() === hash.toLowerCase()) {
                setBufferWidth(100);
            }
        })
    }, [socket, hash]);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        }
    }, [handleMouseMove]);


    const adjustVolume = (video: HTMLVideoElement, delta: number) => {
        const newVolume = Math.min(Math.max(video.volume + delta, 0), 1);
        video.volume = Math.round(newVolume * 100) / 100;
    }

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const video = videoRef.current;

            if (!video || isSubtitlesSizeModalOpen) return;

            switch (e.key) {
                case PLAY_PAUSE:
                    e.preventDefault();
                    setIsPlaying(prev => !prev);
                    break;
                case TOGGLE_FULLSCREEN:
                    e.preventDefault();
                    handleFullScreen();
                    break;
                case SEEK_BACKWARD:
                    e.preventDefault();
                    handleSkipBackward();
                    break;
                case SEEK_FORWARD:
                    e.preventDefault();
                    handleSkipForward();
                    break;
                case VOLUME_UP:
                    e.preventDefault();
                    adjustVolume(video, 0.01);
                    break;
                case VOLUME_DOWN:
                    e.preventDefault();
                    adjustVolume(video, -0.01);
                    break;
                case MUTE_UNMUTE:
                    e.preventDefault();
                    setIsMuted(prev => !prev);
                    break;
                case TOGGLE_SUBTITLES:
                    e.preventDefault();
                    dispatch(setUseSubtitles(hasSubtitles ? !useSubtitles : useSubtitles));
                    break;
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        isSubtitlesSizeModalOpen,
        useSubtitles,
        dispatch,
        hasSubtitles,
    ]);

    useEffect(() => {
        if (isReadyToPlay && !isPlaying) {
            setIsPlaying(true);
        }
    }, [isReadyToPlay]);

    return (
        <Page>
            <Container id="watchMovie" className="min-h-0 max-h-[100vh] overflow-hidden grow">
                {isReadyToPlay ? (
                    <div
                        ref={containerRef}
                        onMouseLeave={() => setControlsVisible(false)}
                        className='flex flex-col justify-center w-full h-[98vh] relative'
                    >
                        <div
                            className={`
                                absolute
                                top-0
                                text-lg
                                font-medium
                                text-white
                                transition-all
                                duration-300
                                py-4
                                px-3
                                w-full
                                flex
                                justify-between
                                gap-2
                                z-[9999]
                            `}
                            style={{
                                background: 'linear-gradient(to bottom, black 0%, transparent 100%)',
                                opacity: controlsVisible ? 1 : 0,
                                pointerEvents: controlsVisible ? 'all' : 'none',
                                willChange: 'opacity',
                                height: `${videoRef.current?.clientHeight as number * 0.15}px`,
                            }}
                        >
                            <p className='flex items-start gap-2'>
                                <BackButton cb={() => !externalTorrent ? dispatch(openModal('movie')) : undefined} />
                                {title} ({movie?.year})
                            </p>

                            <Button
                                title='Info'
                                onClick={() => dispatch(openModal('movieDownloadInfo'))}
                                className='w-9 h-9 bg-transparent aspect-square justify-center p-0 text-white text-2xl hover:bg-stone-800 duration-200 cursor-pointer'
                            >
                                <BsInfoCircle />
                            </Button>

                            <InfoPanel isOpen={isInfoPanelOpen} />
                        </div>

                        <video
                            autoPlay
                            muted={isMuted}
                            ref={videoRef}
                            poster={poster ?? ''}
                            onCanPlay={() => setIsPlaying(true)}
                            className={twMerge(`aspect-video w-full mx-auto will-change-[cursor] ${controlsVisible ? 'cursor-default' : 'cursor-none'}`)}
                            onTimeUpdate={handleTimeUpdate}
                            onClick={() => setIsPlaying(videoRef.current?.paused as boolean)}
                            onDoubleClick={handleFullScreen}
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
                            handleFullScreen={handleFullScreen}
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
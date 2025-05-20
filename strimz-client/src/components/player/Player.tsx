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
import { selectExternalTorrent } from '@/store/movies/movies.selectors';

const Player = ({ src }: React.VideoHTMLAttributes<HTMLVideoElement>) => {
    const [searchParams] = useSearchParams();
    const hash = searchParams.get('hash');
    const poster = searchParams.get('poster');
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

    const handleFullScreen = () => {
        const container = document.getElementById('playerContainer');

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
        if (isPlaying) {
            videoRef.current?.play();
        } else videoRef.current?.pause();
    }, [isPlaying]);

  return (
    <Page>
        <Container id="watchMovie" className="min-h-0 max-h-[100vh] overflow-hidden grow">
            <BackButton className="absolute top-1 left-1 z-20" cb={() => !externalTorrent ? dispatch(openModal('movie')) : undefined} />
            {isReadyToPlay ? (
                <div
                    id='playerContainer'
                    onMouseLeave={() => setControlsVisible(false)}
                    className='flex flex-col justify-center w-full h-[98vh] relative'
                >
                    <video
                        autoPlay
                        ref={videoRef}
                        muted={isMuted}
                        poster={poster ?? ''}
                        onCanPlay={() => setIsPlaying(true)}
                        className={twMerge(`aspect-video w-full mx-auto ${controlsVisible ? 'cursor-default' : 'cursor-none'}`)}
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
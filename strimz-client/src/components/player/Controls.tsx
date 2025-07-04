import React, { ChangeEvent, RefObject, useEffect, useState } from 'react';
import Button from '../Button';
import { BsPause, BsPlay } from 'react-icons/bs';
import { IoCheckmark, IoExpandOutline, IoVolumeHighOutline, IoVolumeLowOutline, IoVolumeMediumOutline, IoVolumeMuteOutline } from 'react-icons/io5';
import { twMerge } from 'tailwind-merge';
import TimeTrack from './TimeTrack';
import VolumeSlider from './VolumeSlider';
import { PiArrowArcLeft, PiArrowArcRight, PiSubtitlesLight } from 'react-icons/pi';
import SubtitlesSelector from '../dialog/SubtitlesSelector';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectSubtitleFilePath, selectSubtitlesSize, selectUseSubtitles } from '@/store/movies/movies.selectors';
import { setUseSubtitles } from '@/store/movies/movies.slice';
import { closeModal, openModal } from '@/store/modals/modals.slice';
import SubtitlesSizeDialog from './SubtitlesSizeDialog';
import { selectSubtitlesSelectorTab, selectSubtitlesSizeModal } from '@/store/modals/modals.selectors';
import { PLAYER_CONTROLS_KEY_BINDS, SKIP_BACK_SECONDS, SKIP_FORWARD_SECONDS } from '@/utils/constants';
import { MdEdit } from 'react-icons/md';

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
    const subtitlesSelectorTabOpen = useAppSelector(selectSubtitlesSelectorTab);
    const subtitleFilePath = useAppSelector(selectSubtitleFilePath);
    const useSubtitles = useAppSelector(selectUseSubtitles);
    const isSubtitlesSizeModalOpen = useAppSelector(selectSubtitlesSizeModal);
    const subtitlesSize = useAppSelector(selectSubtitlesSize);

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
        dispatch(setUseSubtitles(!!subtitleFilePath));
    }, [subtitleFilePath, dispatch]);

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
            onClick={() => setIsPlaying(videoRef.current?.paused as boolean)}
            className='w-9 h-9 bg-transparent aspect-square justify-center p-0 text-white text-3xl hover:bg-stone-800 duration-200'
        >
            {isPlaying ? <BsPause /> : <BsPlay />}
        </Button>
        
        <Button
            title={`Skip Backward (${SKIP_BACK_SECONDS}s)`}
            onClick={handleSkipBackward}
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
            onClick={handleSkipForward}
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
                title={`Subtitles - ${useSubtitles ? 'On' : 'Off'} (${PLAYER_CONTROLS_KEY_BINDS.TOGGLE_SUBTITLES.toUpperCase()})`}
                onClick={() => dispatch(openModal('subtitlesSelectorTab'))}
                className='w-9 h-9 bg-transparent hover:bg-stone-800 p-0'
            >
                <PiSubtitlesLight />
            </Button>

            <div
                className='flex flex-col w-fit z-10'
                onClick={() => setVolumeSliderVisible(!volumeSliderVisible)}
            >
                <Button
                    title={`Volume ${isMuted ? '(muted)' : `(${Math.round(volume)}%)`}`}
                    className='w-9 h-9 bg-transparent hover:bg-stone-800 p-0'
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
                onClick={handleFullScreen}
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
                onMouseLeave={() => setTimeout(() => dispatch(closeModal('subtitlesSelectorTab')), 2000)}
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
                    z-10
                    right-0
                    -top-[520%]
                    rounded-sm
                    bg-stone-800
                    transition-all
                    duration-150
                    will-change-[opacity]
                    ${subtitlesSelectorTabOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                `)}
            >
                <div className='flex w-full flex-col gap-1'>
                    <p className='text-start w-full text-base text-white'>Subtitles</p>
                    
                    <div className='border-y border-stone-500 py-1 flex flex-col'>
                        <span className='text-start text-sm text-stone-400'>Font size</span>
                        
                        <span className='w-full flex justify-between px-2'>
                            <span className='text-base font-medium text-stone-300'>{subtitlesSize}px</span>
                            
                            <Button onClick={() => dispatch(openModal('subtitlesSize'))} className='bg-transparent hover:bg-stone-700 text-sm text-blue-500 gap-1 hover:text-blue-400'>
                                <MdEdit />
                                Edit
                            </Button>
                        </span>
                    </div>
                </div>
                
                <SubtitlesSizeDialog isOpen={isSubtitlesSizeModalOpen} />
                
                <input
                    type="checkbox"
                    hidden
                    name="subtitlesOff"
                    id="subtitlesOff"
                    checked={!useSubtitles}
                    onChange={() => subtitleFilePath ? dispatch(setUseSubtitles(!useSubtitles)) : undefined}
                />

                <label
                    htmlFor="subtitlesOff"
                    className={(`
                        w-full
                        flex
                        items-center
                        justify-between
                        text-start
                        text-base
                        px-2
                        rounded-sm
                        hover:bg-stone-600
                        cursor-pointer
                        ${!useSubtitles ? 'bg-stone-700' : 'bg-transparent'}
                    `)}
                >
                    Off
                    {!useSubtitles && <IoCheckmark />}
                </label>
                
                <SubtitlesSelector
                    containerClassName='h-fit gap-4'
                    buttonOnly
                    reverseButtonPosition
                    buttonClassName='bg-stone-700 hover:bg-stone-600 w-full py-2 self-center order-2'
                    subtitleContainerClassName={useSubtitles && subtitleFilePath ? 'bg-stone-700 hover:bg-stone-600' : `${subtitleFilePath ? 'hover:bg-stone-600' : 'pointer-events-none'}`}
                    useOnSelect
                    onSelectSubtitle={() => subtitleFilePath ? dispatch(setUseSubtitles(!useSubtitles)) : undefined}
                />
            </div>
        </div>
    </div>
  )
}

export default Controls;
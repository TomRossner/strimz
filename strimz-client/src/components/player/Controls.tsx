import React, { ChangeEvent, RefObject, useEffect, useRef, useState } from 'react';
import Button from '../Button';
import { BsPause, BsPlay } from 'react-icons/bs';
import { IoCheckmark, IoExpandOutline, IoVolumeHighOutline, IoVolumeLowOutline, IoVolumeMediumOutline, IoVolumeMuteOutline } from 'react-icons/io5';
import { twMerge } from 'tailwind-merge';
import TimeTrack from './TimeTrack';
import VolumeSlider from './VolumeSlider';
import { PiSubtitlesLight } from 'react-icons/pi';
import SubtitlesSelector from '../dialog/SubtitlesSelector';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectSubtitleFilePath, selectUseSubtitles } from '@/store/movies/movies.selectors';
import { setUseSubtitles } from '@/store/movies/movies.slice';

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
}

const Controls = ({
    ref: videoRef,
    isMuted,
    setIsMuted,
    controlsVisible,
    setControlsVisible,
    isPlaying,
    setIsPlaying,
    playbackWidth,
    setPlaybackWidth,
    bufferWidth,
    duration,
    currentTime,
    handleFullScreen,
}: ControlsProps) => {
    const dispatch = useAppDispatch();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [subtitleSelectorVisible, setSubtitleSelectorVisible] = useState<boolean>(false);
    const subtitleFilePath = useAppSelector(selectSubtitleFilePath);
    const useSubtitles = useAppSelector(selectUseSubtitles);

    useEffect(() => {
        const handleMouseMove = () => {
            setControlsVisible(true);

            if (timeoutRef.current) clearTimeout(timeoutRef.current);

            timeoutRef.current = setTimeout(() => {
                setControlsVisible(false);
            }, 2000);
        }

        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        }
    }, []);

    const handleVolumeMute = () => {
        setIsMuted(!videoRef.current?.muted as boolean);
    }

    const [volume, setVolume] = useState<number>(100);
    const [volumeSliderVisible, setVolumeSliderVisible] = useState<boolean>(false);

    const handleVolumeChange = (ev: ChangeEvent<HTMLInputElement>) => {
        setVolume(ev.target.valueAsNumber);
        setIsMuted(ev.target.valueAsNumber === 0);
    }

    useEffect(() => {
        const video = videoRef.current;
        if (video) {
            video.volume = volume / 100;
            if (volume > 0) {
                video.muted = false;
                setIsMuted(false);
            } else {
                video.muted = true;
                setIsMuted(true);
            }
        }
    }, [volume]);

    useEffect(() => {
        dispatch(setUseSubtitles(!!subtitleFilePath));
    }, [subtitleFilePath, dispatch]);
    
  return (
    <div
        className={twMerge(`
            absolute
            bottom-3
            transition-all
            duration-300
            h-20
            py-4
            px-3
            w-full
            flex
            gap-2
            items-end
            ${controlsVisible ? 'opacity-100' : 'opacity-0'}
        `)}
        style={{ background: 'linear-gradient(to top, black 0%, transparent 100%)' }}
    >
        <Button
            title={isPlaying ? 'Pause' : 'Play'}
            onClick={() => setIsPlaying(videoRef.current?.paused as boolean)}
            className='w-9 h-9 bg-transparent aspect-square justify-center p-0 text-white text-3xl hover:bg-stone-800 duration-200'
        >
            {isPlaying ? <BsPause /> : <BsPlay />}
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
                title='Subtitles'
                onClick={() => setSubtitleSelectorVisible(!subtitleSelectorVisible)}
                className='w-9 h-9 bg-transparent hover:bg-stone-800 p-0'
            >
                <PiSubtitlesLight />
            </Button>

            <div
                className='flex flex-col w-fit z-10'
                onClick={() => setVolumeSliderVisible(!volumeSliderVisible)}
            >
                <Button
                    title='Volume'
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
                title='Toggle fullscreen'
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
                onMouseLeave={() => setTimeout(() => setSubtitleSelectorVisible(false), 1000)}
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
                    ${subtitleSelectorVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                `)}
            >
                <span className='text-start w-full text-sm text-stone-400'>Subtitles</span>
                
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
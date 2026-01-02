import React, { ChangeEvent, RefObject, useEffect, useRef, useState } from 'react';
import Button from '../Button';
import { BsPause, BsPlay } from 'react-icons/bs';
import { IoExpandOutline, IoVolumeHighOutline, IoVolumeLowOutline, IoVolumeMediumOutline, IoVolumeMuteOutline } from 'react-icons/io5';
import { twMerge } from 'tailwind-merge';
import TimeTrack from './TimeTrack';
import VolumeSlider from './VolumeSlider';
import { PiArrowArcLeft, PiArrowArcRight, PiSubtitlesLight } from 'react-icons/pi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectSubtitleFilePath, selectSubtitlesSize, selectSubtitleDelay, selectIsSubtitlesEnabled, selectMovie, selectSubtitleLang, selectAvailableSubtitlesLanguages } from '@/store/movies/movies.selectors';
import { setIsSubtitlesEnabled, setSubtitleFilePath, setSubtitleLang, setAvailableSubtitlesLanguages, setSubtitleDelay } from '@/store/movies/movies.slice';
import { closeModal, openModal } from '@/store/modals/modals.slice';
import SubtitlesSizeDialog from './SubtitlesSizeDialog';
import { selectSubtitlesSelectorTab, selectSubtitlesSizeModal } from '@/store/modals/modals.selectors';
import { PLAYER_CONTROLS_KEY_BINDS, SKIP_BACK_SECONDS, SKIP_FORWARD_SECONDS } from '@/utils/constants';
import { MdEdit } from 'react-icons/md';
import CloseButton from '../CloseButton';
import SubtitlesSelector from '@/components/dialog/SubtitlesSelector';
import { COMMON_LANGUAGES } from '@/utils/languages';
import { checkAvailability, downloadSubtitles } from '@/services/subtitles';
import { selectSettings } from '@/store/settings/settings.selectors';
import { CACHE_TTL, getSubsCache, updateSubsCache } from '@/utils/subsLanguagesCache';
import { useSearchParams } from 'react-router-dom';

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
    const subtitlesSelectorTabOpen = useAppSelector(selectSubtitlesSelectorTab);
    const subtitleFilePath = useAppSelector(selectSubtitleFilePath);
    const isSubtitlesEnabled = useAppSelector(selectIsSubtitlesEnabled);
    const isSubtitlesSizeModalOpen = useAppSelector(selectSubtitlesSizeModal);
    const subtitlesSize = useAppSelector(selectSubtitlesSize);
    const subtitleDelay = useAppSelector(selectSubtitleDelay);
    const movie = useAppSelector(selectMovie);
    const subtitleLang = useAppSelector(selectSubtitleLang);
    const availableSubsLanguages = useAppSelector(selectAvailableSubtitlesLanguages);
    const settings = useAppSelector(selectSettings);
    const title = searchParams.get('title') || movie?.title || '';

    const [notAvailableSubs, setNotAvailableSubs] = useState<string[]>([]);
    const [isLoadingSubs, setIsLoadingSubs] = useState<boolean>(false);
    const [isDownloadingSubs, setIsDownloadingSubs] = useState<boolean>(false);

    const closeTimeout = useRef<NodeJS.Timeout | null>(null);

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

    // Load cached subtitle availability on mount
    const cacheLoadedRef = useRef<string | null>(null);
    useEffect(() => {
        if (!movie?.imdb_code || !movie.year) return;

        const cacheKey = `${movie.imdb_code}-${movie.year}`;
        
        // Only load cache once per movie
        if (cacheLoadedRef.current === cacheKey) return;
        
        const cached = getSubsCache()[cacheKey];

        if (cached && Date.now() - cached.ts < CACHE_TTL) {
            // Use functional updates to avoid dependency issues
            dispatch(setAvailableSubtitlesLanguages(cached.available));
            setNotAvailableSubs(cached.unavailable);
            cacheLoadedRef.current = cacheKey;
        }
    }, [movie?.imdb_code, movie?.year, dispatch]);

    const handleSelectSubtitleLanguage = async (langId: string) => {
        // Always update selected language in store first, so UI reflects the selection
        dispatch(setSubtitleLang(langId));

        // If selecting the same language that's already selected and we have the file, do nothing
        if (langId.toLowerCase() === subtitleLang?.toLowerCase() && subtitleFilePath) {
            return;
        }

        // Reset subtitle file path if changing language
        if (langId.toLowerCase() !== subtitleLang?.toLowerCase() && subtitleFilePath) {
            dispatch(setSubtitleFilePath(null));
        }

        // If movie data is missing, we can't download subtitles, but we've already stored the selection
        if (!movie?.imdb_code || !movie.year || !title || !settings.downloadsFolderPath) {
            console.warn('Missing movie information or settings for subtitle download');
            return;
        }

        const cacheKey = `${movie.imdb_code}-${movie.year}`;
        const cached = getSubsCache()[cacheKey];

        // Helper function to check if language is in array (case-insensitive)
        const isInArray = (arr: string[], lang: string) => 
            arr.some(l => l.toLowerCase() === lang.toLowerCase());

        // If language is already known in cache, just update state and download if available
        if (
            cached &&
            Date.now() - cached.ts < CACHE_TTL &&
            (isInArray(cached.available, langId) || isInArray(cached.unavailable, langId))
        ) {
            dispatch(setAvailableSubtitlesLanguages(cached.available));
            setNotAvailableSubs(cached.unavailable);

            // If available, download it if not already downloaded
            if (isInArray(cached.available, langId) && !subtitleFilePath) {
                setIsDownloadingSubs(true);
                try {
                    const { data } = await downloadSubtitles(
                        langId,
                        movie.imdb_code,
                        title,
                        movie.year.toString(),
                        settings.downloadsFolderPath
                    );
                    dispatch(setSubtitleFilePath(data));
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
                title,
                movie.year.toString()
            );

            // Update cache
            updateSubsCache(cacheKey, langId, isAvailable);

            // Update state
            if (isAvailable) {
                const newState = [...new Set([...availableSubsLanguages, langId])];
                dispatch(setAvailableSubtitlesLanguages(newState));

                // Download the subtitle file
                setIsDownloadingSubs(true);
                try {
                    const { data } = await downloadSubtitles(
                        langId,
                        movie.imdb_code,
                        title,
                        movie.year.toString(),
                        settings.downloadsFolderPath
                    );
                    dispatch(setSubtitleFilePath(data));
                } catch (error) {
                    console.error('Failed to download subtitles:', error);
                } finally {
                    setIsDownloadingSubs(false);
                }
            } else {
                setNotAvailableSubs(prev => [...new Set([...prev, langId])]);
            }
        } catch (error) {
            console.error('Error checking subtitle availability:', error);
        } finally {
            setIsLoadingSubs(false);
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
                                min="-10"
                                max="10"
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
                    availableSubs={availableSubsLanguages}
                    notAvailableSubs={notAvailableSubs}
                    languages={COMMON_LANGUAGES}
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
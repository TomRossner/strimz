import { useAppSelector } from '@/store/hooks';
import { selectUseSubtitles } from '@/store/movies/movies.selectors';
import { PLAYER_CONTROLS_KEY_BINDS, SKIP_BACK_SECONDS, SKIP_FORWARD_SECONDS } from '@/utils/constants';
import React, { ReactNode, RefObject, useCallback } from 'react';
import { BsPause, BsPlay, BsSkipBackward, BsSkipForward } from 'react-icons/bs';
import { IoExpandOutline, IoVolumeHighOutline, IoVolumeLowOutline, IoVolumeMediumOutline, IoVolumeMuteOutline } from 'react-icons/io5';
import { PiSubtitlesLight, PiSubtitlesSlashLight } from 'react-icons/pi';
import { twMerge } from 'tailwind-merge';

const {
    MUTE_UNMUTE,
    PLAY_PAUSE,
    SEEK_BACKWARD,
    SEEK_FORWARD,
    TOGGLE_FULLSCREEN,
    TOGGLE_SUBTITLES,
    VOLUME_DOWN,
    VOLUME_UP,
} = PLAYER_CONTROLS_KEY_BINDS;

interface ShortcutActionDisplayProps {
    isVisible: boolean;
    shortcut: string | null;
    isMuted: boolean;
    isPlaying: boolean;
    videoRef: RefObject<HTMLVideoElement>;
}

const ShortcutActionDisplay = ({isVisible, isMuted, isPlaying, shortcut, videoRef}: ShortcutActionDisplayProps) => {
    const useSubtitles = useAppSelector(selectUseSubtitles);

    const getVolumeIcon = (volume: number, isMuted: boolean): ReactNode => {
        return isMuted
            ? (
                <IoVolumeMuteOutline />
            ) : volume <= 33 ? (
                <IoVolumeLowOutline />
            ) : volume <= 66 ? (
                <IoVolumeMediumOutline />
            ) : (
                <IoVolumeHighOutline />
            );
    }

    const setShortcutIcon = useCallback((): ReactNode => {
        if (!shortcut || !videoRef.current) return;

        const volume: number = Math.round(videoRef.current.volume * 100);

        switch (shortcut) {
            case PLAY_PAUSE:
                return isPlaying ? <BsPlay /> : <BsPause />;
            case TOGGLE_FULLSCREEN:
                return <IoExpandOutline />;
            case TOGGLE_SUBTITLES:
                return useSubtitles ? <PiSubtitlesLight /> : <PiSubtitlesSlashLight />;
            case VOLUME_DOWN:
                return getVolumeIcon(volume, isMuted);
            case VOLUME_UP:
                return getVolumeIcon(volume, isMuted);
            case MUTE_UNMUTE:
                return isMuted ? <IoVolumeMuteOutline /> : <IoVolumeHighOutline />;
            case SEEK_BACKWARD:
                return <BsSkipBackward />;
            case SEEK_FORWARD:
                return <BsSkipForward />;
        
            default:
                return <></>;
        }
    }, [shortcut, isMuted, isPlaying, useSubtitles, videoRef]);

    const setText = useCallback((): ReactNode => {
        if (shortcut === VOLUME_DOWN || shortcut === VOLUME_UP) {
            return <span className='text-2xl'>
                {`${Math.round(videoRef.current?.volume as number * 100)}%`}
            </span>;
        }

        if (shortcut === MUTE_UNMUTE) {
            return <span className='text-2xl'>
                {isMuted ? 'Muted' : 'Unmuted'}
            </span>;
        }

        if (shortcut === TOGGLE_FULLSCREEN) {
            return <span className='text-2xl'>Toggle fullscreen</span>;
        }

        if (shortcut === TOGGLE_SUBTITLES) {
            return <span className='text-2xl'>
                {`Subtitles ${useSubtitles ? 'ON' : 'OFF'}`}
            </span>;
        }
        
        if (shortcut === SEEK_BACKWARD || shortcut === SEEK_FORWARD) {
            return <span className='text-2xl'>
                {`Seek ${shortcut === SEEK_BACKWARD ? 'backward' : 'forward'} ${shortcut === SEEK_BACKWARD ? SKIP_BACK_SECONDS : SKIP_FORWARD_SECONDS } seconds`}
            </span>;
        }
    }, [shortcut, isMuted, videoRef, useSubtitles]);
  return (
    <div
        className={twMerge(`
            absolute
            right-[5vw]
            top-[20vh]
            p-3
            rounded-md
            bg-stone-900
            will-change-[opacity]
            pointer-events-none
            min-w-[60px]
            max-w-fit
            transition-opacity
            duration-100
            text-center
            flex
            items-center
            justify-center
            ${shortcut === PLAY_PAUSE && 'aspect-square'}
            ${isVisible ? 'opacity-65' : 'opacity-0'}
        `)}
    >
        <p className='text-[30px] text-white flex items-center justify-center gap-3 font-light'>
            {setShortcutIcon()}
            {setText()}
        </p>
    </div>
  )
}

export default ShortcutActionDisplay;
import React, { ChangeEvent, useRef } from 'react';
import { twMerge } from 'tailwind-merge';
import Button from '../Button';
import { IoVolumeHighOutline, IoVolumeLowOutline, IoVolumeMediumOutline, IoVolumeMuteOutline } from 'react-icons/io5';

interface VolumeSliderProps {
    volumeSliderVisible: boolean;
    setVolumeSliderVisible: (bool: boolean) => void;
    isMuted: boolean;
    volume: number;
    handleVolumeMute: () => void;
    handleVolumeChange: (ev: ChangeEvent<HTMLInputElement>) => void;
}

const BLUE_COLOR_CODE = '#3b82f6';

const VolumeSlider = ({
    volumeSliderVisible,
    setVolumeSliderVisible,
    isMuted,
    volume,
    handleVolumeMute,
    handleVolumeChange,
}: VolumeSliderProps) => {
    const closeTimeout = useRef<NodeJS.Timeout | null>(null);

  return (
    <div
        onMouseEnter={() => {
            if (closeTimeout.current) {
                clearTimeout(closeTimeout.current);
                closeTimeout.current = null;
            }
        }}
        onMouseLeave={() => {
            closeTimeout.current = setTimeout(() => {
                setVolumeSliderVisible(false);
                closeTimeout.current = null;
            }, 2500);
        }}
        className={twMerge(`
            absolute
            w-[300px]
            flex
            gap-3
            items-center
            justify-between
            py-2
            px-3
            z-10
            right-0
            -top-[170%]
            rounded-sm
            bg-stone-800
            transition-all
            duration-150
            ${volumeSliderVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `)}
    >
        <Button
            title={isMuted ? 'Unmute' : 'Mute'}
            className='w-9 h-9 bg-transparent hover:bg-stone-900 p-0'
            onClick={handleVolumeMute}
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

        <input
            type="range"
            name="volume"
            id="volume"
            min={0}
            max={100}
            step={1}
            className='flex-1'
            onChange={handleVolumeChange}
            value={volume}
            style={{
                background: `linear-gradient(to right, ${BLUE_COLOR_CODE} 0%, ${BLUE_COLOR_CODE} ${volume}%, white ${volume}%, white 100%)`
            }}
        />

        <span className='text-[16px] min-w-7 text-end font-semibold'>{volume}</span>
    </div>
  )
}

export default VolumeSlider;
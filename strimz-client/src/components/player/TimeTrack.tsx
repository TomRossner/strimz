
import { formatTime } from '@/utils/formatTime';
import React, { RefObject } from 'react';

interface TimeTrackProps {
    ref: RefObject<HTMLVideoElement>;
    currentTime: number;
    playbackWidth: number;
    setPlaybackWidth: (num: number) => void;
    duration: number;
    bufferWidth: number;
}

const TimeTrack = ({
    ref: videoRef,
    currentTime,
    playbackWidth,
    setPlaybackWidth,
    bufferWidth,
    duration
}: TimeTrackProps) => {
  return (
    <>
        <span className="text-white text-sm font-medium min-w-[55px] text-left">
            {formatTime(currentTime)}
        </span>

        <div className='relative w-full h-1 bg-stone-700 my-2'>
            <input
                title=''
                type="range"
                name="playback"
                id="playback"
                step={0.1}
                className='absolute left-0 z-10 w-full h-full'
                value={playbackWidth}
                onChange={(ev) => {
                    const percentage = parseFloat(ev.target.value);
                    const video = videoRef.current;

                    if (video && video.duration) {
                        video.currentTime = (percentage / 100) * video.duration;
                        setPlaybackWidth(percentage);
                    }
                }}
                style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${playbackWidth}%, transparent ${playbackWidth}%, transparent 100%)`
                }}
            />
            <div className='h-full bg-blue-300 will-change-[width]' style={{ width: `${bufferWidth}%` }} />
        </div>

        <span className="text-white text-sm font-medium min-w-[55px] text-right">
            {formatTime(duration - currentTime)}
        </span>
    </>
  )
}

export default TimeTrack;
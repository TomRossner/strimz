
import { formatTime } from '@/utils/formatTime';
import React, { RefObject, useRef, useState } from 'react';

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
    bufferWidth,
    duration
}: TimeTrackProps) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [hoverX, setHoverX] = useState<number>(0);

    const [xPosition, setXPosition] = useState<number>(0);

    const handleMouseMove = (ev: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (!trackRef.current || !duration) return;
        const rect = trackRef.current.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        const percentage = Math.min(Math.max(x / rect.width, 0), 1);
        setHoverTime(percentage * duration);
        setHoverX(x);
    }
  return videoRef.current && (
    <>
        <span className="text-white text-sm font-medium min-w-[55px] text-left">
            {formatTime(currentTime)}
        </span>

        <div
            ref={trackRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverTime(null)}
            className='relative w-full h-1 bg-stone-700 my-2'
        >
            <input
                title={''} // For overriding default title
                type="range"
                name="playback"
                id="playback"
                step={0.1}
                className='absolute left-0 z-10 w-full h-full'
                value={playbackWidth}
                onClick={(ev) => {
                    if (!trackRef.current || !videoRef.current || !videoRef.current.duration) return;
                    const rect = trackRef.current.getBoundingClientRect();
                    const x = ev.clientX - rect.left;
                    setXPosition(x);
                }}
                onChange={() => {
                    if (!trackRef.current || !videoRef.current || !videoRef.current.duration) return;
                    const rect = trackRef.current.getBoundingClientRect();
                    const percentage = Math.min(Math.max(xPosition / rect.width, 0), 1);
                    videoRef.current.currentTime = percentage * videoRef.current.duration;
                }}
                style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${playbackWidth}%, transparent ${playbackWidth}%, transparent 100%)`
                }}
            />

            <div
                className='h-full bg-blue-300' 
                style={{
                    width: `${bufferWidth}%`,
                    willChange: 'width',
                }}
            />

            {hoverTime !== null && (
                <div
                    className="absolute bottom-6 px-2 py-0.5 rounded-sm bg-stone-900 text-white text-xs font-medium whitespace-nowrap pointer-events-none select-none"
                    style={{
                        left: hoverX,
                        transform: 'translateX(-50%)',
                    }}
                >
                    {formatTime(hoverTime)}
                </div>
            )}
        </div>

        <span className="text-white text-sm font-medium min-w-[55px] text-right">
            {formatTime(duration - currentTime)}
        </span>
    </>
  )
}

export default TimeTrack;
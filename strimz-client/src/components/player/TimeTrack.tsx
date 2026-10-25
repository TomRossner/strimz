import { formatTime } from '@/utils/formatTime';
import React, { RefObject, useEffect, useRef, useState } from 'react';

interface TimeTrackProps {
    ref: RefObject<HTMLVideoElement>;
    currentTime: number;
    playbackWidth: number;
    setPlaybackWidth: (num: number) => void;
    duration: number;
    bufferWidth: number;
}

const FRAME_STEP = 5;

const frameBucket = (time: number) => Math.floor(time / FRAME_STEP) * FRAME_STEP;

const grabFrame = (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return null;
    const width = 160;
    const height = Math.max(90, Math.round((width * video.videoHeight) / video.videoWidth));
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    try {
        context.drawImage(video, 0, 0, width, height);
        return canvas.toDataURL('image/jpeg', 0.72);
    } catch {
        return null;
    }
};

const nearestFrame = (frames: Map<number, string>, time: number) => {
    const bucket = frameBucket(time);
    return frames.get(bucket) || frames.get(bucket - FRAME_STEP) || frames.get(bucket + FRAME_STEP) || null;
};

const isFileSource = (src: string) => src.includes('/stream/file/');

const TimeTrack = ({
    ref: videoRef,
    currentTime,
    playbackWidth,
    bufferWidth,
    duration
}: TimeTrackProps) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const previewRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const framesRef = useRef<Map<number, string>>(new Map());
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [hoverX, setHoverX] = useState<number>(0);
    const [hoverFrame, setHoverFrame] = useState<string | null>(null);
    const [filePreview, setFilePreview] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const bucket = frameBucket(currentTime);
        if (framesRef.current.has(bucket)) return;
        if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
        const url = grabFrame(video, canvasRef.current);
        if (url) framesRef.current.set(bucket, url);
    }, [currentTime, videoRef]);

    useEffect(() => {
        const preview = previewRef.current;
        const main = videoRef.current;
        if (!preview || !main || hoverTime === null || !filePreview) return;
        const src = main.currentSrc;
        if (!src) return;

        const timer = window.setTimeout(() => {
            const seekTo = Math.min(Math.max(hoverTime, 0), Math.max((main.duration || hoverTime) - 0.05, 0));
            const seek = () => {
                if (Math.abs(preview.currentTime - seekTo) > 0.35) preview.currentTime = seekTo;
                preview.pause();
            };
            if (preview.src !== src) {
                preview.src = src;
                preview.addEventListener('loadedmetadata', seek, { once: true });
            } else {
                seek();
            }
        }, 80);

        return () => window.clearTimeout(timer);
    }, [hoverTime, filePreview, videoRef]);

    const handleMouseMove = (ev: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (!trackRef.current || !duration) return;
        const rect = trackRef.current.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        const percentage = Math.min(Math.max(x / rect.width, 0), 1);
        const time = percentage * duration;
        const file = isFileSource(videoRef.current?.currentSrc || '');
        setHoverTime(time);
        setHoverX(x);
        setFilePreview(file);
        setHoverFrame(file ? null : nearestFrame(framesRef.current, time));
    };

    return videoRef.current && (
    <>
        <span className="text-white text-sm font-medium min-w-[55px] text-left">
            {formatTime(currentTime)}
        </span>

        <div
            ref={trackRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => {
                setHoverTime(null);
                setHoverFrame(null);
                setFilePreview(false);
            }}
            className='relative w-full h-1 overflow-visible bg-stone-700 my-2'
        >
            <input
                title={''}
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
                    const percentage = Math.min(Math.max(x / rect.width, 0), 1);
                    videoRef.current.currentTime = percentage * videoRef.current.duration;
                }}
                onChange={() => {}}
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
                    className="absolute bottom-4 z-30 flex -translate-x-1/2 flex-col items-center gap-1 pointer-events-none select-none"
                    style={{ left: hoverX, width: filePreview || hoverFrame ? 160 : 'max-content' }}
                >
                    {filePreview && (
                        <video
                            ref={previewRef}
                            muted
                            playsInline
                            preload='metadata'
                            className='h-24 w-40 min-h-24 min-w-40 shrink-0 rounded-sm bg-black object-cover shadow-lg'
                        />
                    )}
                    {!filePreview && hoverFrame && (
                        <img src={hoverFrame} alt='' className='h-24 w-40 min-h-24 min-w-40 shrink-0 rounded-sm bg-black object-cover shadow-lg' />
                    )}
                    <div className="shrink-0 whitespace-nowrap rounded-sm bg-stone-900 px-2 py-0.5 text-xs font-medium text-white">
                        {formatTime(hoverTime)}
                    </div>
                </div>
            )}
        </div>

        <span className="text-white text-sm font-medium min-w-[55px] text-right">
            {formatTime(duration - currentTime)}
        </span>
    </>
  )
};

export default TimeTrack;

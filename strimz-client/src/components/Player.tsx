import React, { useEffect, useRef } from 'react';
import { twMerge } from 'tailwind-merge';
import videoJs from 'video.js';
import 'video.js/dist/video-js.css';

interface VideoPlayerProps {
  options: {
    autoplay?: boolean;
    controls?: boolean;
    responsive?: boolean;
    fluid?: boolean;
    poster?: string;
    sources: { src: string; type: string }[];
  };
  onReady?: (player: unknown) => void;
}

const VideoPlayer = ({ options, onReady }: VideoPlayerProps) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const playerRef = useRef<unknown>(null);

    useEffect(() => {
      if (videoRef.current && !playerRef.current) {
        const player = videoJs(videoRef.current, options);
        playerRef.current = player;
      }
    }, [options, onReady]);

    return (
      <div data-vjs-player className='relative flex h-[100vh] items-center justify-center'>
        <video
          ref={videoRef}
          className={twMerge(`video-js top-20`)}
          src={options.sources[0]?.src}
          autoPlay
          poster={options.poster}
          controls
          width={1080}
          height={720}
        />
    </div>
    );
}

export default VideoPlayer;
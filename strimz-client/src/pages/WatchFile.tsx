import React from 'react';
import { useSearchParams } from 'react-router-dom';
import Player from '@/components/player/Player';

const WatchFilePage = () => {
    const [searchParams] = useSearchParams();
    const src = searchParams.get('src');
    const title = searchParams.get('title');

    if (!src) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-stone-400">No video source provided</p>
            </div>
        );
    }

    // Pass title and indicate this is from downloads page
    const playerSrc = title 
        ? `${src}${src.includes('?') ? '&' : '?'}title=${encodeURIComponent(title)}`
        : src;

    return <Player src={playerSrc} />;
}

export default WatchFilePage;


import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { closeModal } from '@/store/modals/modals.slice';
import { selectSocket } from '@/store/socket/socket.selectors';
import { useSearchParams } from 'react-router-dom';
import { DownloadProgressData } from '@/utils/types';
import { selectMovie } from '@/store/movies/movies.selectors';
import { formatBytesPerSecond } from '@/utils/bytes';
import CloseButton from '../CloseButton';

interface MovieInfoPanelProps {
    isOpen: boolean;
}

const MovieInfoPanel = ({isOpen}: MovieInfoPanelProps) => {
    const dispatch = useAppDispatch();
    const [searchParams] = useSearchParams();
    const hash = searchParams.get('hash');
    const title = searchParams.get('title');
    const currentMovie = useAppSelector(selectMovie);

    const socket = useAppSelector(selectSocket);

    const [bufferWidth, setBufferWidth] = useState<number>(0);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);

    const [downloadInfo, setDownloadInfo] = useState<DownloadProgressData | null>(null);

    useEffect(() => {
        if (!socket?.id || !hash) return;

        socket.on('downloadProgress', (data: DownloadProgressData) => {
            if (data.hash.toLowerCase() === hash.toLowerCase()) {
                setBufferWidth(Number((data.progress * 100).toFixed(2)));
                setIsDownloading(true);
                setDownloadInfo(data);
            }
        })
        socket.on('downloadDone', (data: { hash: string, done: boolean }) => {
            if (data.hash.toLowerCase() === hash.toLowerCase()) {
                setBufferWidth(100);
                setIsDownloading(false);
            }
        })
    }, [socket, hash]);

  return (
    <div
        onMouseLeave={() => setTimeout(() => dispatch(closeModal('movieDownloadInfo')), 3000)}
        className='flex flex-col gap-2 bg-stone-800 rounded-sm px-2 py-1 absolute top-14 right-14 min-w-1/4 max-w-1/3 shadow-2xl shadow-black'
        style={{
            opacity: isOpen ? 1 : 0,
            willChange: 'opacity',
            pointerEvents: isOpen ? 'all' : 'none',
        }}
    >
        <div className='relative w-full'>
            <span className='text-sm'>Download info</span>
            <CloseButton
                onClose={() => dispatch(closeModal('movieDownloadInfo'))}
                className='md:block absolute top-0.5 right-0 text-xs p-0.5'
            />
        </div>
        <p className='font-light text-sm text-white'>{title} ({currentMovie?.year})</p>

        <div className='w-full flex flex-col gap-0.5'>
            <div className='relative w-full bg-stone-900 h-1'>
                <div
                    className='absolute left-0 top-0 h-1 bg-blue-500' 
                    style={{
                        width: `${bufferWidth}%`,
                        willChange: 'width',
                    }}
                />
            </div>
            <p className='text-xs italic text-stone-200 font-light flex justify-between'>
                <span>{isDownloading ? `Downloading... ${bufferWidth}%` : 'Download done'}</span>
                {isDownloading && <span>{formatBytesPerSecond(downloadInfo?.speed as number)}</span>}
            </p>
        </div>
    </div>
  )
}

export default MovieInfoPanel;
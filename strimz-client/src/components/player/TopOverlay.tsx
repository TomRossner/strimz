import React from 'react';
import BackButton from '../BackButton';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { openModal } from '@/store/modals/modals.slice';
import Button from '../Button';
import { BsInfoCircle } from 'react-icons/bs';
import MovieInfoPanel from './InfoPanel';
import { selectExternalTorrent, selectSelectedTorrent } from '@/store/movies/movies.selectors';
import { selectMovieDownloadInfoPanel } from '@/store/modals/modals.selectors';
import { DownloadProgressData } from '@/utils/types';

interface TopOverlayProps {
    isVisible: boolean;
    title: string;
    videoDimensions: { height: number, width: number };
    downloadInfo: DownloadProgressData | null;
}

const TopOverlay = ({isVisible, title, videoDimensions: { height }, downloadInfo}: TopOverlayProps) => {
    const dispatch = useAppDispatch();
    const externalTorrent = useAppSelector(selectExternalTorrent);
    const isInfoPanelOpen = useAppSelector(selectMovieDownloadInfoPanel);
    const selectedTorrent = useAppSelector(selectSelectedTorrent);
    
  return (
    <div
        className={`
            absolute
            top-0
            text-lg
            font-medium
            text-white
            transition-all
            duration-300
            py-4
            px-3
            w-full
            flex
            justify-between
            gap-2
            z-[9999]
        `}
        style={{
            background: 'linear-gradient(to bottom, black 0%, transparent 100%)',
            opacity: isVisible ? 1 : 0,
            pointerEvents: isVisible ? 'all' : 'none',
            willChange: 'opacity',
            height: `${height as number * 0.15}px`,
        }}
    >
        <p className='flex items-start gap-2'>
            <BackButton cb={() => !externalTorrent ? dispatch(openModal('movie')) : undefined} />
            {title}
        </p>

        <div className='flex gap-4'>
            <span>{selectedTorrent?.quality === '2160p' ? '4K' : selectedTorrent?.quality}</span>

            <Button
                title='Info'
                onClick={() => dispatch(openModal('movieDownloadInfo'))}
                className='w-9 h-9 bg-transparent aspect-square justify-center p-0 text-white text-2xl hover:bg-stone-800 duration-200 cursor-pointer'
            >
                <BsInfoCircle />
            </Button>
        </div>

        <MovieInfoPanel isOpen={isInfoPanelOpen} downloadInfo={downloadInfo} />
    </div>
  )
}

export default TopOverlay;
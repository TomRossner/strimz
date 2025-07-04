import React, { useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { closeModal } from '@/store/modals/modals.slice';
import { DownloadProgressData } from '@/utils/types';
import { selectSelectedTorrent } from '@/store/movies/movies.selectors';
import { formatBytes, formatBytesPerSecond } from '@/utils/bytes';
import CloseButton from '../CloseButton';
import Button from '../Button';
import { MdOpenInNew } from 'react-icons/md';
import { selectSettings } from '@/store/settings/settings.selectors';
import { msToReadableTime } from '@/utils/formatTime';

interface MovieInfoPanelProps {
    isOpen: boolean;
    downloadInfo: DownloadProgressData | null;
}

const MovieInfoPanel = ({ isOpen, downloadInfo, }: MovieInfoPanelProps) => {
    const dispatch = useAppDispatch();
    const selectedTorrent = useAppSelector(selectSelectedTorrent);

    const closeTimeout = useRef<NodeJS.Timeout | null>(null);

    const bufferWidth = downloadInfo ? Number((downloadInfo.progress * 100).toFixed(2)) : 0;
    const isDownloading = downloadInfo ? !downloadInfo.done : false;
    const downloadSpeed = downloadInfo ? formatBytesPerSecond(downloadInfo?.speed ?? 0) : 0;

    const { downloadsFolderPath } = useAppSelector(selectSettings);

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
                    dispatch(closeModal('movieDownloadInfo'));
                    closeTimeout.current = null;
                }, 2500);
            }}
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
            <p className='font-light text-sm text-white flex justify-between items-center'>
                {downloadInfo?.fileName}
            </p>

            <div className='w-full flex flex-col text-sm font-light'>
                <p>Active peers: {downloadInfo?.peers ?? '-'}</p>

                <p className='text-sm font-light'>
                    Time remaining: {downloadInfo?.timeRemaining ? msToReadableTime(downloadInfo.timeRemaining as number) : '-'}
                </p>

                <p className='flex justify-between w-full items-center'>
                    Downloaded: {formatBytes(downloadInfo?.downloaded ?? 0)} / {selectedTorrent?.size ?? '-'}
                    
                    <Button
                        title='Open downloads folder'
                        onClick={() => window.electronAPI.openFolder(downloadsFolderPath)}
                        className='text-sm font-light hover:bg-stone-600 p-1 z-[9999]'
                    >
                        <MdOpenInNew className='text-base' />
                    </Button>
                </p>
            </div>

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
                    <span>{!downloadInfo?.done ? `Downloading... ${bufferWidth}%` : 'Download done'}</span>
                    {isDownloading && <span>{downloadSpeed}</span>}
                </p>
            </div>
        </div>
    )
}

export default MovieInfoPanel;
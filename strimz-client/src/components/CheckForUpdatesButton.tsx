import React, { useEffect, useState } from 'react';
import Button from './Button';
import { MdOutlineBrowserUpdated } from 'react-icons/md';
import { RxUpdate } from 'react-icons/rx';
import { twMerge } from 'tailwind-merge';
import { setUpdateStatus } from '@/store/updates/updates.slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectUpdateStatus } from '@/store/updates/updates.selectors';

const setStatusText = (updateStatus: string) => {
    switch (updateStatus) {
        case 'idle':
            return 'Check for updates';
        case 'checking':
            return 'Checking...';
        case 'available':
            return 'Downloading...';
        case 'up-to-date':
            return 'Check for updates';
        case 'downloaded':
            return 'Update ready, click to install';
        case 'skipped':
            return 'Check for updates';
        case 'failed':
            return 'Check for updates';
    
        default:
            return 'Check for updates';
    }
}

type ProgressData = {
    percent: number;
    transferred: number;
    total: number;
    bytesPerSecond: number;
}

interface CheckForUpdatesButtonProps {
    withText?: boolean;
    className?: string;
}

const CheckForUpdatesButton = ({withText = false, className}: CheckForUpdatesButtonProps) => {
    const [progress, setProgress] = useState<number | null>(null);
    const dispatch = useAppDispatch();
    const updateStatus = useAppSelector(selectUpdateStatus);

    const checkForUpdates = () => {
        dispatch(setUpdateStatus('checking'));
        window.electronAPI.checkForUpdates();
    }

    useEffect(() => {
        const downloadProgressHandler = (progressData: ProgressData) => {
            dispatch(setUpdateStatus('available'));
            setProgress(progressData.percent);
            console.log(progressData.percent + "%");
        }
    
        window.electronAPI.onDownloadProgress(downloadProgressHandler);
    
        return () => {
            window.electronAPI.offDownloadProgress(downloadProgressHandler);
        }
    }, [dispatch]);

  return (
    <Button
        disabled={updateStatus === 'checking' || updateStatus === 'available'}
        title={setStatusText(updateStatus)}
        onClick={updateStatus !== 'downloaded' ? checkForUpdates : () => window.electronAPI.installUpdateNow()}
        className={twMerge(`
            text-lg
            py-1.5
            group
            gap-2
            hover:bg-stone-600
            hover:text-blue-300
            justify-end
            ${updateStatus === 'available' && "disabled:text-blue-300"}
            ${className}
        `)}
    >
        {(updateStatus === 'idle' || updateStatus === 'up-to-date' || updateStatus === 'skipped' || updateStatus === 'failed') && (
            <span className='group-hover:scale-120 transition-transform duration-100'>
                <MdOutlineBrowserUpdated />
            </span>
        )}

        {updateStatus === 'checking' && (
            <span className='animate-spin'>
                <RxUpdate />
            </span>
        )}

        {updateStatus === 'available' && (
            <span className='text-blue-300 animate-spin'>
                <RxUpdate />
            </span>
        )}
       
        {updateStatus === 'downloaded' && (
            <span className='text-green-500 animate-pulse'>
                <MdOutlineBrowserUpdated />
            </span>
        )}

        {withText && (
            <>
                {setStatusText(updateStatus)}
                {(updateStatus === 'available') && (progress !== null) && (
                    <span>{progress.toFixed(1)}%</span>
                )}
            </>
        )}

    </Button>
  )
}

export default CheckForUpdatesButton;
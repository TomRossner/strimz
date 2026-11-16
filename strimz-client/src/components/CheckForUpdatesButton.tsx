import React from 'react';
import Button from './Button';
import { MdOutlineBrowserUpdated } from 'react-icons/md';
import { RxUpdate } from 'react-icons/rx';
import { twMerge } from 'tailwind-merge';
import { setUpdateStatus } from '@/store/updates/updates.slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectUpdateProgress, selectUpdateStatus } from '@/store/updates/updates.selectors';

const setStatusText = (updateStatus: string) => {
    switch (updateStatus) {
        case 'idle':
            return 'Check for updates';
        case 'checking':
            return 'Checking...';
        case 'available':
            return 'Downloading update...';
        case 'up-to-date':
            return "You're up to date";
        case 'downloaded':
            return 'Install update';
        case 'skipped':
            return 'Check for updates';
        case 'failed':
            return 'Update check failed';

        default:
            return 'Check for updates';
    }
}

interface CheckForUpdatesButtonProps {
    withText?: boolean;
    className?: string;
    /** Draws attention to the button (set when coming from the nav bar update button) */
    highlighted?: boolean;
}

const CheckForUpdatesButton = ({withText = false, className, highlighted = false}: CheckForUpdatesButtonProps) => {
    const dispatch = useAppDispatch();
    const updateStatus = useAppSelector(selectUpdateStatus);
    const progress = useAppSelector(selectUpdateProgress);

    const checkForUpdates = () => {
        dispatch(setUpdateStatus('checking'));
        window.electronAPI.checkForUpdates();
    }

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
            ${updateStatus === 'downloaded' && withText && "bg-green-700 hover:bg-green-600 hover:text-white text-white"}
            ${highlighted && "ring-2 ring-green-400 ring-offset-2 ring-offset-stone-900 animate-pulse"}
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
            <span className={withText ? 'text-white' : 'text-green-500 animate-pulse'}>
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

import React, { useEffect, useState } from 'react';
import Button from './Button';
import { MdOutlineBrowserUpdated } from 'react-icons/md';
import { RxUpdate } from 'react-icons/rx';
import { twMerge } from 'tailwind-merge';

const setStatusText = (status: string) => {
    switch (status) {
        case 'idle':
            return 'Check for updates';
        case 'checking':
            return 'Checking...';
        case 'available':
            return 'New update available, downloading...';
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

const CheckForUpdatesButton = () => {
    const [status, setStatus] = useState<string>('idle');

    const checkForUpdates = () => {
        setStatus('checking');
        window.electronAPI.checkForUpdates();
    }

    useEffect(() => {
        window.electronAPI.onCheckingForUpdate(() => setStatus('checking'));
        window.electronAPI.onUpdateAvailable(() => setStatus('available'));
        window.electronAPI.onUpdateNotAvailable(() => setStatus('up-to-date'));
        window.electronAPI.onUpdateDownloaded(() => setStatus('downloaded'));

        window.electronAPI.onUpdateCheckSkipped((msg: string) => {
            setStatus('skipped');
            console.log(msg);
        });
    
        window.electronAPI.onUpdateCheckFailed((msg: string) => {
            setStatus('failed');
            console.error(msg);
        });
    }, []);

  return (
    <Button
        disabled={status === 'checking' || status === 'available'}
        title={setStatusText(status)}
        onClick={status !== 'downloaded'? checkForUpdates : window.electronAPI.installUpdateNow}
        className={twMerge(`
            hidden
            md:flex
            text-lg
            py-1.5
            group
            hover:bg-stone-600
            hover:text-green-400
            justify-end
            ${status === 'available' && "disabled:text-green-300"}
        `)}
    >
        {(status === 'idle' || status === 'up-to-date' || status === 'skipped' || status === 'failed') && (
            <span className='group-hover:scale-120 transition-transform duration-100'>
                <MdOutlineBrowserUpdated />
            </span>
        )}

        {status === 'checking' && (
            <span className='animate-spin'>
                <RxUpdate />
            </span>
        )}

        {status === 'available' && (
            <span className='text-green-300 animate-spin'>
                <RxUpdate />
            </span>
        )}
       
        {status === 'downloaded' && (
            <span className='text-green-500 animate-pulse'>
                <MdOutlineBrowserUpdated />
            </span>
        )}
    </Button>
  )
}

export default CheckForUpdatesButton;
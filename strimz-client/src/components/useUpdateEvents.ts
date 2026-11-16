import { useEffect } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { setUpdateProgress, setUpdateStatus } from '@/store/updates/updates.slice';

type ProgressData = {
    percent: number;
    transferred: number;
    total: number;
    bytesPerSecond: number;
}

const UPDATE_CHANNELS = [
    'checking-for-update',
    'update-available',
    'update-not-available',
    'update-download-progress',
    'update-downloaded',
    'update-check-skipped',
    'update-check-failed',
];

/**
 * Mirrors the auto-updater events into the store. Mount it once, at the app root:
 * the preload wraps listeners, so they can only be removed per channel, and a second
 * subscriber would remove the first one's listeners on unmount.
 */
const useUpdateEvents = () => {
    const dispatch = useAppDispatch();

    useEffect(() => {
        window.electronAPI.onCheckingForUpdate(() => dispatch(setUpdateStatus('checking')));
        window.electronAPI.onUpdateAvailable(() => dispatch(setUpdateStatus('available')));
        window.electronAPI.onUpdateNotAvailable(() => dispatch(setUpdateStatus('up-to-date')));
        window.electronAPI.onUpdateDownloaded(() => {
            dispatch(setUpdateStatus('downloaded'));
            dispatch(setUpdateProgress(100));
        });
        window.electronAPI.onDownloadProgress((progressData: ProgressData) => {
            dispatch(setUpdateStatus(progressData.percent >= 100 ? 'downloaded' : 'available'));
            dispatch(setUpdateProgress(progressData.percent));
        });
        window.electronAPI.onUpdateCheckSkipped((msg: string) => {
            dispatch(setUpdateStatus('skipped'));
            console.log(msg);
        });
        window.electronAPI.onUpdateCheckFailed((msg: string) => {
            dispatch(setUpdateStatus('failed'));
            console.error(msg);
        });

        // Also replays an update found before this page loaded
        window.electronAPI.ipcRenderer.send('subscribe-to-updates');

        return () => {
            UPDATE_CHANNELS.forEach(channel => window.electronAPI.ipcRenderer.removeAllListeners(channel));
        }
    }, [dispatch]);
}

export default useUpdateEvents;

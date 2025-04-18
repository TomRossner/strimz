export {}

declare global {
    interface Window {
        electronAPI: {
            openDirectoryDialog: () => Promise<string | null>;
            openFolder: (path: string) => void;
            getDefaultDownloadsPath: () => Promise<string>;
            quitApp: () => void;
            restartApp: () => void;
            checkForUpdates: () => void;
            onCheckingForUpdate: (cb) => void;
            onUpdateAvailable: (cb) => void;
            onUpdateNotAvailable: (cb) => void;
            onDownloadProgress: (cb) => void;
            onUpdateDownloaded: (cb) => void;
            onUpdateCheckSkipped: (cb) => void;
            onUpdateCheckFailed: (cb) => void;
            installUpdateNow: () => void;
        }
    }
}
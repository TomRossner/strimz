export {}

declare global {
    interface Window {
        electronAPI: {
            openDirectoryDialog: () => Promise<string | null>;
            openFolder: (path: string) => void;
            getDefaultDownloadsPath: () => Promise<string>;
            quitApp: () => void;
            restartApp: () => void;
        }
    }
}
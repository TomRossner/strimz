import { Settings } from "@/store/settings/settings.slice";

export {}

declare global {
    interface Window {
        electronAPI: {
            openFolder: (path: string) => void;
            quitApp: () => void;
            restartApp: () => void;
            checkForUpdates: () => void;
            installUpdateNow: () => void;
            updateAutoInstallSetting: (bool: boolean) => void;
            updateClearOnExitSetting: (bool: boolean) => void;
            saveSetting: (key: string, value: unknown) => void;
            
            openDirectoryDialog: () => Promise<string | null>;
            getDefaultDownloadsPath: () => Promise<string>;
            getAutoInstallSetting: () => Promise<boolean>;
            getClearOnExitSetting: () => Promise<boolean>;
            getDownloadsFolderPath: () => Promise<string>;
            getSettings: () => Promise<Settings>;
            
            onCheckingForUpdate: (cb) => void;
            onUpdateAvailable: (cb) => void;
            onUpdateNotAvailable: (cb) => void;
            onDownloadProgress: (cb) => void;
            onUpdateDownloaded: (cb) => void;
            onUpdateCheckSkipped: (cb) => void;
            onUpdateCheckFailed: (cb) => void;

            offCheckingForUpdate: (cb) => void,
            offUpdateAvailable: (cb) => void,
            offUpdateNotAvailable: (cb) => void,
            offUpdateDownloaded: (cb) => void,
            offUpdateCheckSkipped: (cb) => void,
            offUpdateCheckFailed: (cb) => void,
            offDownloadProgress: (cb) => void,

            ipcRenderer: {
                send: (channel, data?) => void,
                on: (channel, data?) => void,
                removeAllListener: (channel) => void,
                invoke: (channel, ...args) => Promise<unknown>,
            }
        }
    }
}
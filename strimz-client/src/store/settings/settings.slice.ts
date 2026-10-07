import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Settings {
    downloadsFolderPath: string;
    loadOnScroll: boolean;
    updateOnQuit: boolean;
    clearOnExit: boolean;
    maxConcurrentDownloads: number;
    maxDownloadKbps: number;
    maxUploadKbps: number;
    maxConnections: number;
    hardwareAcceleration: boolean;
    startMinimized: boolean;
    reopenLastTitle: boolean;
    closeToTray: boolean;
    alwaysOnTop: boolean;
}

interface SettingsState {
    settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
    downloadsFolderPath: "",
    loadOnScroll: false,
    updateOnQuit: false,
    clearOnExit: false,
    maxConcurrentDownloads: 2,
    maxDownloadKbps: 0,
    maxUploadKbps: 0,
    maxConnections: 55,
    hardwareAcceleration: true,
    startMinimized: false,
    reopenLastTitle: false,
    closeToTray: false,
    alwaysOnTop: false,
}

const initialState: SettingsState = {
    settings: DEFAULT_SETTINGS
}

export const fetchUserSettings = createAsyncThunk('settings/fetchUserSettings', async (): Promise<Settings> => {
  const settings = await window.electronAPI.getSettings() as (Partial<Settings> & { theme?: unknown }) | null;

  if (!settings) {
    return {
      ...DEFAULT_SETTINGS,
      downloadsFolderPath: await window.electronAPI.getDefaultDownloadsPath(),
    }
  }

  const stored = { ...settings };
  delete stored.theme;

  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    downloadsFolderPath: settings.downloadsFolderPath || await window.electronAPI.getDefaultDownloadsPath(),
  };
});

const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {
      setSettings(state, action: PayloadAction<Settings>) {
        state.settings = action.payload;
      }
    },
    extraReducers: (builder) => {
      builder
        .addCase(fetchUserSettings.fulfilled, (state, action: PayloadAction<Settings>) => {
          state.settings = action.payload;
        })
        .addCase(fetchUserSettings.rejected, (state) => {
          state.settings = DEFAULT_SETTINGS;
        })
    }
});

export const {
  setSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
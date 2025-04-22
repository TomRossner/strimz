import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Settings {
    downloadsFolderPath: string;
    theme: "light" | "dark" | "system";
    loadOnScroll: boolean;
    updateOnQuit: boolean;
    clearOnExit: boolean;
}

interface SettingsState {
    settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
    downloadsFolderPath: "",
    theme: "dark",
    loadOnScroll: false,
    updateOnQuit: false,
    clearOnExit: false,
}

const initialState: SettingsState = {
    settings: DEFAULT_SETTINGS
}

export const fetchUserSettings = createAsyncThunk('settings/fetchUserSettings', async (): Promise<Settings> => {
  const settings = await window.electronAPI.getSettings();

  if (!settings) {
    return {
      ...DEFAULT_SETTINGS,
      downloadsFolderPath: await window.electronAPI.getDefaultDownloadsPath(),
    }
  }

  return settings;
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
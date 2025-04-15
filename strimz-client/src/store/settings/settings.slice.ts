import { getSettings, saveSettings } from "../../services/localStorage";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Settings {
    path: string;
    theme: "light" | "dark" | "system";
    loadOnScroll: boolean;
}

interface SettingsState {
    settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
    path: '',
    theme: "dark",
    loadOnScroll: false,
}

const initialState: SettingsState = {
    settings: DEFAULT_SETTINGS
}

export const fetchUserSettings = createAsyncThunk('settings/fetchUserSettings', async (): Promise<Settings> => {
  const settings = getSettings();

  if (!settings) {
    const downloadsPath = await window.electronAPI.getDefaultDownloadsPath();

    return {
      ...DEFAULT_SETTINGS,
      path: downloadsPath,
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
        saveSettings(action.payload);
      }
    },
    extraReducers: (builder) => {
      builder
        .addCase(fetchUserSettings.fulfilled, (state, action: PayloadAction<Settings>) => {
          state.settings = action.payload;
        })
        .addCase(fetchUserSettings.rejected, (state, action) => {
          state.settings = DEFAULT_SETTINGS;
        })
    }
});

export const {
  setSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
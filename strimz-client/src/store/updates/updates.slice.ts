import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'up-to-date'
  | 'downloaded'
  | 'skipped'
  | 'failed';

interface UpdateStatusState {
  status: UpdateStatus;
  message?: string;
  /** Download progress of an available update, 0-100 */
  progress: number | null;
  /** Set when the nav bar update button sends the user to Settings */
  highlightInstall: boolean;
}

const initialState: UpdateStatusState = {
  status: 'idle',
  progress: null,
  highlightInstall: false,
};

const updateStatusSlice = createSlice({
  name: 'updateStatus',
  initialState,
  reducers: {
    setUpdateStatus: (state, action: PayloadAction<UpdateStatus>) => {
      state.status = action.payload;
    },
    setUpdateMessage: (state, action: PayloadAction<string>) => {
      state.message = action.payload;
    },
    setUpdateProgress: (state, action: PayloadAction<number | null>) => {
      state.progress = action.payload;
    },
    setHighlightInstall: (state, action: PayloadAction<boolean>) => {
      state.highlightInstall = action.payload;
    },
    resetUpdateStatus: () => initialState,
  },
});

export const {
  setUpdateStatus,
  setUpdateMessage,
  setUpdateProgress,
  setHighlightInstall,
  resetUpdateStatus,
} = updateStatusSlice.actions;

export default updateStatusSlice.reducer;

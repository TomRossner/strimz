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
}

const initialState: UpdateStatusState = {
  status: 'idle',
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
    resetUpdateStatus: () => initialState,
  },
});

export const {
  setUpdateStatus,
  setUpdateMessage,
  resetUpdateStatus,
} = updateStatusSlice.actions;

export default updateStatusSlice.reducer;
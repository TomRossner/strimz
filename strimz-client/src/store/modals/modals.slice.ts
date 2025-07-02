import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface ModalsState {
  trailer: boolean;
  filters: boolean;
  movie: boolean;
  menu: boolean;
  error: boolean;
  vpn: boolean;
  playTorrentPrompt: boolean;
  subtitlesSize: boolean;
  movieDownloadInfo: boolean;
}

const initialState: ModalsState = {
  trailer: false,
  filters: false,
  movie: false,
  menu: false,
  error: false,
  vpn: false,
  playTorrentPrompt: false,
  subtitlesSize: false,
  movieDownloadInfo: false,
}

const modalsSlice = createSlice({
  name: 'modals',
  initialState,
  reducers: {
    openModal: (state, action: PayloadAction<keyof ModalsState>) => {
        state[action.payload] = true;
    },
    closeModal(state, action: PayloadAction<keyof ModalsState>) {
        state[action.payload] = false;
    }
  },
});

export const { openModal, closeModal } = modalsSlice.actions;
export default modalsSlice.reducer;
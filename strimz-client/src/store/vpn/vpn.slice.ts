import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface VPNState {
    isActive: boolean;
}

const initialState: VPNState = {
    isActive: false,
}

const vpnSlice = createSlice({
    name: 'vpn',
    initialState,
    reducers: {
      setIsActive(state, action: PayloadAction<boolean>) {
        state.isActive = action.payload;
      }
    },
});

export const {
  setIsActive,
} = vpnSlice.actions;

export default vpnSlice.reducer;
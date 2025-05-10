import { RootState } from "../store";

export const selectIsVpnActive = (state: RootState): boolean => state.vpn.isActive;
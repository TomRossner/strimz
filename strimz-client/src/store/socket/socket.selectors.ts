import { type Socket } from "socket.io-client";
import { RootState } from "../store";

export const selectSocket = (state: RootState): Socket | null => state.socket.socket;
import { RootState } from "../store";
import { UpdateStatus } from "./updates.slice";

export const selectUpdateStatus = (state: RootState): UpdateStatus => state.updates.status;
export const selectUpdateProgress = (state: RootState): number | null => state.updates.progress;
export const selectHighlightInstall = (state: RootState): boolean => state.updates.highlightInstall;

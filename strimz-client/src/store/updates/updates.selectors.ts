import { RootState } from "../store";
import { UpdateStatus } from "./updates.slice";

export const selectUpdateStatus = (state: RootState): UpdateStatus => state.updates.status;
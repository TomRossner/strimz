import { RootState } from "../store";

export const selectDownloads = (state: RootState) => state.downloads.downloads;
export const selectCompleted = (state: RootState) => state.downloads.completed;
export const selectDownloadsError = (state: RootState) => state.downloads.downloadsError;
export const selectIsLoadingDownloads = (state: RootState) => state.downloads.isLoadingDownloads;
export const selectDownloadedFiles = (state: RootState) => state.downloads.downloadedFiles;
export const selectIsLoadingDownloadedFiles = (state: RootState) => state.downloads.isLoadingDownloadedFiles;
export const selectDownloadedFilesError = (state: RootState) => state.downloads.downloadedFilesError;
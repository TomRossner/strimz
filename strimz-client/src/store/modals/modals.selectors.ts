import { RootState } from "../store";

export const selectTrailerModal = (state: RootState): boolean => state.modals.trailer;
export const selectFiltersModal = (state: RootState): boolean => state.modals.filters;
export const selectMovieModal = (state: RootState): boolean => state.modals.movie;
export const selectMenu = (state: RootState): boolean => state.modals.menu;
export const selectVpnModal = (state: RootState): boolean => state.modals.vpn;
export const selectPlayTorrentPrompt = (state: RootState): boolean => state.modals.playTorrentPrompt;
export const selectSubtitlesSizeModal = (state: RootState): boolean => state.modals.subtitlesSize;
export const selectMovieDownloadInfoPanel = (state: RootState): boolean => state.modals.movieDownloadInfo;
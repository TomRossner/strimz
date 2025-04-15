import { RootState } from "../store";

export const selectTrailerModal = (state: RootState): boolean => state.modals.trailer;
export const selectFiltersModal = (state: RootState): boolean => state.modals.filters;
export const selectMovieModal = (state: RootState): boolean => state.modals.movie;
export const selectMenu = (state: RootState): boolean => state.modals.menu;
import { RootState } from "../store";

export const selectMoviesMap = (state: RootState) => state.movies.movies;
export const selectIsLoading = (state: RootState) => state.movies.isLoading;
export const selectCurrentPage = (state: RootState) => state.movies.currentPage;
export const selectNextPage = (state: RootState) => state.movies.nextPage;
export const selectMoviesCount = (state: RootState) => state.movies.moviesSearchCount as number;
export const selectMaxMovieCount = (state: RootState) => state.movies.maxMovieCount;
export const selectQuery = (state: RootState) => state.movies.currentQuery;
export const selectFilters = (state: RootState) => state.movies.filters;
export const selectError = (state: RootState) => state.movies.error;
export const selectMovie = (state: RootState) => state.movies.selectedMovie;
export const selectLastFetchParams = (state: RootState) => state.movies.lastFetchParams;
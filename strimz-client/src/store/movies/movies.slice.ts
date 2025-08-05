import { getMoviesByIds } from '@/services/movies';
import { Movie } from '../../components/MovieCard';
import { DEFAULT_PAGE, API_URL, DEFAULT_MOVIES_SEARCH_COUNT, DEFAULT_PARAMS, DEFAULT_LANGUAGES, DEFAULT_SUBTITLES_SIZE } from '../../utils/constants';
import { fetchMovies } from '../../utils/fetchMovies';
import { filterByLanguage } from '../../utils/filterByLanguage';
import { Filters, Torrent } from '../../utils/types';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { isAxiosError } from 'axios';
import { enableMapSet } from 'immer';

enableMapSet();

interface MoviesState {
  movies: Map<string, Movie>;
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  nextPage: number;
  moviesSearchCount: number | null;
  filters: Filters;
  maxMovieCount: number;
  currentQuery: string;
  selectedMovie: Movie | null;
  lastFetchParams: Filters | null;
  favorites: Map<string, Movie>;
  watchList: Map<string, Movie>;
  subtitleFilePath: string | null;
  subtitleLang: string | null;
  useSubtitles: boolean;
  externalTorrent: {hash: string, title: string} | null;
  subtitlesSize: number;
  selectedTorrent: Torrent | null;
  vttSubtitlesContent: string | null;
}

const initialState: MoviesState = {
  movies: new Map(),
  isLoading: false,
  error: null,
  currentPage: DEFAULT_PAGE,
  nextPage: DEFAULT_PAGE + 1,
  moviesSearchCount: DEFAULT_MOVIES_SEARCH_COUNT,
  filters: DEFAULT_PARAMS,
  maxMovieCount: 0,
  currentQuery: '',
  selectedMovie: null,
  lastFetchParams: null,
  favorites: new Map(),
  watchList: new Map(),
  subtitleFilePath: null,
  subtitleLang: null,
  useSubtitles: true,
  externalTorrent: null,
  subtitlesSize: DEFAULT_SUBTITLES_SIZE,
  selectedTorrent: null,
  vttSubtitlesContent: null,
}

type FetchMoviesAsync = {
  movies: Map<string, Movie>; 
  moviesCount: number;
  withQuery: boolean;
  page: number;
  query: string | null;
  limit: number;
}

const constructUrl = (baseUrl: string, filters: Filters): string => {
  const query = filters.query_term ?? "";

  const filtersWithoutQuery = Object
    .entries(filters)
    .filter(([key, value]) => key !== 'query_term');
  
  const constructedUrl = filtersWithoutQuery
    .map((entry, index) => {
      const [key, value] = entry;

      if (typeof value === 'string') {
        return `${index === 0 ? "?" : "&"}${value.split(",").map(v => `${key}=${v}`).join("&")}`;
      }

      return `${index === 0 ? "?" : "&"}${key}=${value}`;
    })
    .join("");

  return `${baseUrl}${constructedUrl}&query_term=${query}`;
}

export const fetchMoviesAsync = createAsyncThunk(
  'movies/fetchMoviesAsync',
  async (filters: Filters = DEFAULT_PARAMS, {rejectWithValue}) => {
    try {
      const moviesApiUrl = `${API_URL}/movies`;
      const url = constructUrl(moviesApiUrl, filters);

      const {data} = await fetchMovies(url);
      const {data: {movies, movie_count}} = data;

      const filteredMovies: Movie[] = filterByLanguage(movies ?? [], DEFAULT_LANGUAGES).map(movie => {
        return {
          id: movie.id,
          title: movie.title,
          slug: movie.slug,
          year: movie.year,
          rating: movie.rating,
          runtime: movie.runtime,
          genres: movie.genres,
          summary: movie.summary,
          yt_trailer_code: movie.yt_trailer_code,
          language: movie.language,
          background_image: movie.background_image,
          background_image_original: movie.background_image_original,
          small_cover_image: movie.small_cover_image,
          medium_cover_image: movie.medium_cover_image,
          large_cover_image: movie.large_cover_image,
          torrents: movie.torrents,
        } as Movie;
      });

      const count = !!movies && (movies.length >= filters.limit) ? movie_count : filteredMovies.length;

      return {
        movies: filteredMovies?.length
          ? new Map(filteredMovies.map((mov: Movie) => [mov.slug, mov]))
          : new Map(),
        moviesCount: count,
        withQuery: !!filters.query_term,
        page: filters.page as number,
        query: filters.query_term as string,
        limit: filters.limit
      };
    } catch (error) {
      console.error(error);
      return rejectWithValue(isAxiosError(error)
        ? (typeof error.response?.data === 'string'
            ? error.response.data
            : error.message)
        : "We encountered an error while fetching movies.");
    }
});

export const fetchFavoritesAsync = createAsyncThunk(
  'movies/fetchFavoritesAsync',
  async (ids: string[], {rejectWithValue}) => {
    try {
      const {data: {movies}} = await getMoviesByIds(ids);

      return movies?.length
        ? new Map(movies.map((m: Movie) => [m.slug, m]))
        : new Map();
    } catch (error) {
      console.error(error);
      return rejectWithValue(error);
    }
});

export const fetchWatchListAsync = createAsyncThunk(
  'movies/fetchWatchListAsync',
  async (ids: string[], {rejectWithValue}) => {
    try {
      const {data: {movies}} = await getMoviesByIds(ids);

      return movies?.length
        ? new Map(movies.map((m: Movie) => [m.slug, m]))
        : new Map();
    } catch (error) {
      console.error(error);
      return rejectWithValue(error);
    }
});

const moviesSlice = createSlice({
  name: 'movies',
  initialState,
  reducers: {
    setMovies(state, action: PayloadAction<Map<string, Movie>>) {
      state.movies = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    setIsLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
      state.error = null;
    },
    setError(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    setFilters(state, action: PayloadAction<Filters>) {
      state.filters = action.payload;
      state.currentQuery = action.payload.query_term;
    },
    setCurrentQuery(state, action: PayloadAction<string>) {
      state.currentQuery = action.payload;
      state.filters.query_term = action.payload;
    },
    setSelectedMovie(state, action: PayloadAction<Movie | null>) {
      state.selectedMovie = action.payload;
    },
    setLastFetchParams: (state, action: PayloadAction<Filters>) => {
      state.lastFetchParams = action.payload;
    },
    setFavorites: (state, action: PayloadAction<Map<string, Movie>>) => {
      state.favorites = action.payload;
    },
    setWatchList: (state, action: PayloadAction<Map<string, Movie>>) => {
      state.watchList = action.payload;
    },
    setSubtitleFilePath: (state, action: PayloadAction<string | null>) => {
      state.subtitleFilePath = action.payload;
    },
    setSubtitleLang: (state, action: PayloadAction<string | null>) => {
      state.subtitleLang = action.payload;
    },
    setUseSubtitles(state, action: PayloadAction<boolean>) {
      state.useSubtitles = action.payload;
    },
    setExternalTorrent(state, action: PayloadAction<{hash: string, title: string} | null>) {
      state.externalTorrent = action.payload;
    },
    setSubtitlesSize(state, action: PayloadAction<number>) {
      state.subtitlesSize = action.payload;
    },
    setSelectedTorrent(state, action: PayloadAction<Torrent | null>) {
      state.selectedTorrent = action.payload;
    },
    setVttSubtitlesContent(state, action: PayloadAction<string | null>) {
      state.vttSubtitlesContent = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMoviesAsync.fulfilled, (state, action) => {
        const payload = action.payload as FetchMoviesAsync;
      
        const isNewQuery = state.currentQuery !== payload.query;
        const isClearingQuery = state.currentQuery && !payload.query;

        const shouldOverrideMovies = isNewQuery || isClearingQuery;

        const { page, moviesCount, movies, limit } = payload;
        const loadedCount = page * limit;
        const isLastPage = (loadedCount >= moviesCount) && movies.size <= limit;

        if (shouldOverrideMovies) {
          state.movies = new Map(movies);
          state.currentQuery = payload.query ?? initialState.currentQuery;
          state.currentPage = DEFAULT_PAGE;
        } else {
          movies.forEach((movie, key) => state.movies.set(key, movie));
          state.currentPage = page;
        }

        state.nextPage = isLastPage ? page : page + 1;
      
        state.moviesSearchCount = payload.moviesCount ?? DEFAULT_MOVIES_SEARCH_COUNT;
        state.maxMovieCount = payload.moviesCount >= state.maxMovieCount ? payload.moviesCount : state.maxMovieCount;
        state.isLoading = false;
        state.error = payload.movies.size ? null : "No movies were found";
      })
      .addCase(fetchMoviesAsync.pending, (state) => {
        state.isLoading = !state.moviesSearchCount || (state.moviesSearchCount > state.movies.size);
        state.error = null;
        state.movies = state.filters.page === DEFAULT_PAGE ? initialState.movies : state.movies;
      })
      .addCase(fetchMoviesAsync.rejected, (state, action) => {
        state.isLoading = false;
        console.log(action.error)
        state.error = action.payload as string;
      })

      .addCase(fetchFavoritesAsync.fulfilled, (state, action) => {
        state.favorites = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchFavoritesAsync.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchFavoritesAsync.rejected, (state) => {
        state.isLoading = false;
      })

      .addCase(fetchWatchListAsync.fulfilled, (state, action) => {
        state.watchList = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchWatchListAsync.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchWatchListAsync.rejected, (state) => {
        state.isLoading = false;
      })
  }
 });

export const {
  setMovies,
  setIsLoading,
  setError,
  setFilters,
  setCurrentQuery,
  setSelectedMovie,
  setLastFetchParams,
  setFavorites,
  setWatchList,
  setSubtitleFilePath,
  setSubtitleLang,
  setUseSubtitles,
  setExternalTorrent,
  setSubtitlesSize,
  setSelectedTorrent,
  setVttSubtitlesContent,
} = moviesSlice.actions;

export default moviesSlice.reducer;
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
  selectedSubtitleFileId: string | null;
  isSubtitlesEnabled: boolean;
  externalTorrent: {hash: string, title: string, imdbCode?: string} | null;
  subtitlesSize: number;
  subtitleDelay: number;
  selectedTorrent: Torrent | null;
  vttSubtitlesContent: string | null;
  availableSubtitlesLanguages: string[];
  unavailableSubtitlesLanguages: string[];
  languageFiles: Record<string, Array<{ fileId: string, fileName: string, uploadDate: string }>>;
  trailerCode: string | null;
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
  selectedSubtitleFileId: null,
  isSubtitlesEnabled: false,
  externalTorrent: null,
  subtitlesSize: DEFAULT_SUBTITLES_SIZE,
  subtitleDelay: 0,
  selectedTorrent: null,
  vttSubtitlesContent: null,
  availableSubtitlesLanguages: [],
  unavailableSubtitlesLanguages: [],
  languageFiles: {},
  trailerCode: null,
}

type FetchMoviesAsync = {
  movies: Map<string, Movie>; 
  moviesCount: number;
  withQuery: boolean;
  page: number;
  query: string | null;
  limit: number;
}

/** Normalize rating/runtime from API (handles different shapes and string values). */
const normalizeRating = (m: Record<string, unknown>): number | undefined => {
  const v = m.rating ?? (m as Record<string, unknown>).Rating ?? (m as Record<string, unknown>).imdb_rating;
  if (v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const normalizeRuntime = (m: Record<string, unknown>): number | undefined => {
  const v = m.runtime ?? (m as Record<string, unknown>).Runtime ?? (m as Record<string, unknown>).runtime_minutes;
  if (v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

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

      const rawMovies = (movies ?? []) as Record<string, unknown>[];
      const filteredByLang = filterByLanguage(
        rawMovies as Movie[],
        DEFAULT_LANGUAGES
      ) as Record<string, unknown>[];
      const filteredMovies: Movie[] = filteredByLang.map((movie) => ({
        id: movie.id,
        title: movie.title,
        slug: movie.slug,
        year: movie.year,
        rating: normalizeRating(movie),
        runtime: normalizeRuntime(movie),
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
        imdb_code: movie.imdb_code,
      } as Movie));

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

const rawMovieToMovie = (m: Record<string, unknown>): Movie => ({
  id: m.id as string,
  title: m.title as string,
  slug: m.slug as string,
  year: m.year as number,
  rating: normalizeRating(m),
  runtime: normalizeRuntime(m),
  genres: (m.genres as string[]) ?? [],
  summary: (m.summary as string) ?? '',
  yt_trailer_code: (m.yt_trailer_code as string) ?? '',
  language: (m.language as string) ?? '',
  background_image: (m.background_image as string) ?? '',
  background_image_original: (m.background_image_original as string) ?? '',
  small_cover_image: (m.small_cover_image as string) ?? '',
  medium_cover_image: (m.medium_cover_image as string) ?? '',
  large_cover_image: (m.large_cover_image as string) ?? '',
  torrents: (m.torrents as object[]) ?? [],
  imdb_code: (m.imdb_code as string) ?? '',
});

export const fetchFavoritesAsync = createAsyncThunk(
  'movies/fetchFavoritesAsync',
  async (ids: string[], {rejectWithValue}) => {
    try {
      const {data: {movies}} = await getMoviesByIds(ids);
      const raw = (movies ?? []) as Record<string, unknown>[];

      return raw.length
        ? new Map(raw.map((m) => [m.slug as string, rawMovieToMovie(m)]))
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
      const raw = (movies ?? []) as Record<string, unknown>[];

      return raw.length
        ? new Map(raw.map((m) => [m.slug as string, rawMovieToMovie(m)]))
        : new Map();
    } catch (error) {
      console.error(error);
      return rejectWithValue(error);
    }
});

// type FetchAvailableSubtitlesProps = {
//   imdbCode: string;
//   title: string;
//   year: string;
//   signal: AbortSignal;
// }

// export const fetchAvailableSubtitlesAsync = createAsyncThunk(
//   'movies/fetchAvailableSubtitlesAsync',
//   async (downloadProps: FetchAvailableSubtitlesProps, {rejectWithValue}) => {
//     const {imdbCode, title, year, signal} = downloadProps;

//     try {
//       const { data: availableSubs } = await fetchAvailableSubtitles(
//         imdbCode,
//         title,
//         year,
//         signal
//       );

//       const cacheKey = `${imdbCode}-${year}`;
//       setSubsCache(cacheKey, availableSubs);
      
//       return availableSubs as string[];
//     } catch (err) {
//       console.error(err);
//       return rejectWithValue(err);
//     }
// });

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
    setSelectedSubtitleFileId: (state, action: PayloadAction<string | null>) => {
      state.selectedSubtitleFileId = action.payload;
    },
    setIsSubtitlesEnabled(state, action: PayloadAction<boolean>) {
      state.isSubtitlesEnabled = action.payload;
    },
    setExternalTorrent(state, action: PayloadAction<{hash: string, title: string, imdbCode?: string} | null>) {
      state.externalTorrent = action.payload;
    },
    setSubtitlesSize(state, action: PayloadAction<number>) {
      state.subtitlesSize = action.payload;
    },
    setSubtitleDelay(state, action: PayloadAction<number>) {
      state.subtitleDelay = action.payload;
    },
    setSelectedTorrent(state, action: PayloadAction<Torrent | null>) {
      state.selectedTorrent = action.payload;
    },
    setVttSubtitlesContent(state, action: PayloadAction<string | null>) {
      state.vttSubtitlesContent = action.payload;
    },
    setAvailableSubtitlesLanguages(state, action: PayloadAction<string[]>) {
      state.availableSubtitlesLanguages = action.payload;
    },
    setUnavailableSubtitlesLanguages(state, action: PayloadAction<string[]>) {
      state.unavailableSubtitlesLanguages = action.payload;
    },
    setLanguageFiles(state, action: PayloadAction<Record<string, Array<{ fileId: string, fileName: string, uploadDate: string }>>>) {
      state.languageFiles = action.payload;
    },
    setTrailerCode(state, action: PayloadAction<string | null>) {
      state.trailerCode = action.payload;
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
      
      // .addCase(fetchAvailableSubtitlesAsync.fulfilled, (state, action) => {
      //   state.availableSubtitlesLanguages = action.payload;
      // })
      // .addCase(fetchAvailableSubtitlesAsync.rejected, (state) => {
      //   state.availableSubtitlesLanguages = [];
      // })
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
  setSelectedSubtitleFileId,
  setIsSubtitlesEnabled,
  setExternalTorrent,
  setSubtitlesSize,
  setSubtitleDelay,
  setSelectedTorrent,
  setVttSubtitlesContent,
  setAvailableSubtitlesLanguages,
  setUnavailableSubtitlesLanguages,
  setLanguageFiles,
  setTrailerCode
} = moviesSlice.actions;

export default moviesSlice.reducer;
import { GENRES, OrderBy, SortBy, TOrderBy, TQuality, TSortBy } from "../services/movies";
import { Filters } from "./types";

export const APP_NAME: string = "Strimz";

export const API_URL: string = 'http://localhost:3003/api';

export const WATCH_MOVIE_URL: string = `${API_URL}/watch/`;
export const MOVIES_FETCH_URL: string = `${API_URL}/movies`;

export const MAX_STARS: number = 5;

export const DEFAULT_FETCH_LIMIT: number = 50;
export const DEFAULT_PAGE: number = 1;
export const DEFAULT_MOVIES_SEARCH_COUNT: number | null = null;
export const DEFAULT_RATING: number = 0;
export const DEFAULT_QUALITY: TQuality = "All";
export const DEFAULT_GENRE: string = GENRES.ACTION;
export const DEFAULT_SORT_BY: TSortBy =  SortBy.DOWNLOAD_COUNT;
export const DEFAULT_ORDER_BY: TOrderBy = OrderBy.DESC;

export const DEFAULT_LANGUAGES: string[] = [
  'en',
  'fr',
]

export const DEFAULTS: Filters = {
  page: DEFAULT_PAGE,
  genre: DEFAULT_GENRE,
  limit: DEFAULT_FETCH_LIMIT,
  minimum_rating: DEFAULT_RATING,
  order_by: DEFAULT_ORDER_BY,
  quality: DEFAULT_QUALITY,
  query_term: '',
  sort_by: DEFAULT_SORT_BY,
}

export const DEFAULT_FETCH_MOVIES_URL: string = `
    ${API_URL}/movies?limit=${DEFAULT_FETCH_LIMIT}&page=${DEFAULT_PAGE}&quality=${DEFAULT_QUALITY}&sort_by=${DEFAULT_SORT_BY}&order_by=${DEFAULT_ORDER_BY}&minimum_rating=${DEFAULT_RATING}&genre=&query_term=
`;

export const DEFAULT_PARAMS: Filters & {page: number} = {
  genre: DEFAULT_GENRE,
  limit: DEFAULT_FETCH_LIMIT,
  minimum_rating: DEFAULT_RATING,
  order_by: OrderBy.DESC,
  page: DEFAULT_PAGE,
  quality: DEFAULT_QUALITY,
  query_term: '',
  sort_by: SortBy.DOWNLOAD_COUNT,
}
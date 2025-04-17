import { API_URL, MOVIES_FETCH_URL } from "../utils/constants";
import axios, { AxiosResponse } from "axios";

//?limit=50&page=1&quality=All&genre=Action&sort_by=download_count&order_by=desc&minimum_rating=0&query_term=marley'
export type TParam = 'limit' | 'page' | 'quality' | 'genre' | 'sort_by' | 'order_by' | 'minimum_rating' | 'query_term';

export type ParamValue = string | string[] | number;

export type Params = {
    [key in TParam]: ParamValue;
}

export type TLimit = number;
export type TPage = number;
export type TQuality = '480p' | '720p' | '1080p' | '1080p.x265' | '2160p' | '3D' | 'All';

export type TSortBy = 'title' |
'year' |
'rating' |
'peers' |
'seeds' |
'download_count' |
'like_count' |
'date_added';

export type TOrderBy = 'asc' | 'desc';

export type TGenre = 'Action' |
    'Adult' |
    'Adventure' |
    'Animation' |
    'Biography' |
    'Comedy' |
    'Crime' |
    'Documentary' |
    'Drama' |
    'Family' |
    'Fantasy' |
    'Film Noir' |
    'Game Show' |
    'History' |
    'Horror' |
    'Musical' |
    'Music' |
    'Mystery' |
    'News' |
    'Reality-TV' |
    'Romance' |
    'Sci-Fi' |
    'Short' |
    'Sport' |
    'Talk-Show' |
    'Thriller' |
    'War' |
    'Western';

export enum GENRES {
    ACTION = 'Action',
    ADULT = 'Adult',
    ADVENTURE = 'Adventure',
    ANIMATION = 'Animation',
    BIOGRAPHY = 'Biography',
    COMEDY = 'Comedy',
    CRIME = 'Crime',
    DOCUMENTARY = 'Documentary',
    DRAMA = 'Drama',
    FAMILY = 'Family',
    FANTASY = 'Fantasy',
    FILM_NOIR = 'Film Noir',
    GAME_SHOW = 'Game Show',
    HISTORY = 'History',
    HORROR = 'Horror',
    MUSICAL = 'Musical',
    MUSIC = 'Music',
    MYSTERY = 'Mystery',
    NEWS = 'News',
    REALITY_TV = 'Reality-TV',
    ROMANCE = 'Romance',
    SCI_FI = 'Sci-Fi',
    SHORT = 'Short',
    SPORT = 'Sport',
    TALK_SHOW = 'Talk Show',
    THRILLER = 'Thriller',
    WAR = 'War',
    WESTERN = 'Western',
}

export enum Qualities {
    'ALL' = 'All',
    '3D' = '3D',
    '480P' = '480p',
    '720P' = '720p',
    '1080P' = '1080p',
    '2160P' = '2160p',
}

export enum OrderBy {
    ASC = 'asc',
    DESC = 'desc',
}

export enum SortBy {
    TITLE = 'title',
    YEAR = 'year',
    RATING = 'rating',
    PEERS = 'peers',
    SEEDS = 'seeds',
    DOWNLOAD_COUNT = 'download_count',
    LIKE_COUNT = 'like_count',
    DATE_ADDED = 'date_added',
}

export const searchMovies = async (query: string, params?: Params): Promise<AxiosResponse> => {
    return await axios.get(MOVIES_FETCH_URL, {
        params: {
            ...params,
            query,
            languages: ['en', 'fr']
        },
    });
}

export const stopDownload = async (hash: string) => {
    return await axios.post(`${API_URL}/watch/pause/${hash}`);
}

export const getMoviesByIds = async (ids: string[]) => {
    return await axios.post(`${MOVIES_FETCH_URL}`, {ids});
}
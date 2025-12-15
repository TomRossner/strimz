import axios from "axios";
import { YTS_API_URLS, YTS_BASE_URL } from "../scraper/scraper.config.js";

type Inputs = {
    limit: number;
    page: number;

    quality?: string;
    sort_by?: string;
    order_by?: string;
    minimum_rating?: number;
    genre?: string;
    query_term?: string;

    movie_id?: string | undefined;
    with_images?: boolean;
    with_cast?: boolean;
}

type MovieParams = {
    movieId: string;
    withImages?: boolean;
    withCast?: boolean;
}

enum Limits {
    MAX = 50,
    MIN = 1,
    BASE = 20
}

enum Ratings {
    MIN = 0,
    MAX = 9,
    DEFAULT = MIN
}

enum Endpoints {
    MOVIES_LIST = 'list_movies.json',
    MOVIE_DETAILS = 'movie_details.json'
}

type QueryParam = {
    [key: string] : string;
}

class YTS {
    // Query params
    private readonly _qualities: QueryParam;
    private readonly _sort_by: QueryParam;
    private readonly _order_by: QueryParam;
    private readonly _genres: QueryParam;
    private readonly _query_term: string;
    private readonly _min_rating: number;
    private readonly _page: number;

    // Base URL
    private _BASE_URL: string;
    
    // Fetch limits
    private readonly _MAX_LIMIT: Limits.MAX;
    private readonly _MIN_LIMIT: Limits.MIN;
    private readonly _BASE_LIMIT: Limits.BASE;

    // Ratings
    private readonly _MIN_RATING: Ratings.MIN;
    private readonly _MAX_RATING: Ratings.MAX;
    private readonly _DEFAULT_RATING: Ratings.DEFAULT;

    // URL endpoints
    private readonly _MOVIES_LIST_ENDPOINT: Endpoints.MOVIES_LIST;
    private readonly _MOVIE_DETAILS_ENDPOINT: Endpoints.MOVIE_DETAILS;

    // Default page number
    private readonly _DEFAULT_PAGE_NUMBER: number;

    constructor({baseUrl = YTS_BASE_URL} = {}) {
        this._BASE_URL = baseUrl;

        this._MAX_LIMIT = Limits.MAX;
        this._MIN_LIMIT = Limits.MIN;
        this._BASE_LIMIT = Limits.BASE;
        
        this._MIN_RATING =  Ratings.MIN;
        this._MAX_RATING =  Ratings.MAX;
        this._DEFAULT_RATING =  Ratings.DEFAULT;
        
        this._MOVIES_LIST_ENDPOINT = Endpoints.MOVIES_LIST;
        this._MOVIE_DETAILS_ENDPOINT = Endpoints.MOVIE_DETAILS;

        this._DEFAULT_PAGE_NUMBER = 1;
        
        this._query_term = '';
        this._min_rating = this._MIN_RATING;
        this._page = this._DEFAULT_PAGE_NUMBER;

        this._sort_by = {
            title: 'title',
            year: 'year',
            rating: 'rating',
            peers: 'peers',
            seeds: 'seeds',
            download_count: 'download_count',
            like_count: 'like_count',
            date_added: 'date_added'
        };
        
        this._qualities = {
            'All': 'All',
            '720p': '720p',
            '1080p': '1080p',
            '2160p': '2160p',
            '3D': '3D'
        };
        
        this._order_by = {
            desc: 'desc',
            asc: 'asc'
        };
        
        this._genres = {
            'Action': 'Action',
            'Adult': 'Adult',
            'Adventure': 'Adventure',
            'Animation': 'Animation',
            'Biography': 'Biography',
            'Comedy': 'Comedy',
            'Crime': 'Crime',
            'Documentary': 'Documentary',
            'Drama': 'Drama',
            'Family': 'Family',
            'Fantasy': 'Fantasy',
            'Film Noir': 'Film Noir',
            'Game Show': 'Game Show',
            'History': 'History',
            'Horror': 'Horror',
            'Musical': 'Musical',
            'Music': 'Music',
            'Mystery': 'Mystery',
            'News': 'News',
            'Reality-TV': 'Reality-TV',
            'Romance': 'Romance',
            'Sci-Fi': 'Sci-Fi',
            'Short': 'Short',
            'Sport': 'Sport',
            'Talk-Show': 'Talk-Show',
            'Thriller': 'Thriller',
            'War': 'War',
            'Western': 'Western',
        };
    }
    
    private async _get(endpoint: string, query: Inputs | Partial<Inputs>) {
        let lastError: any = null;

        for (const url of YTS_API_URLS) {
            const URI = `${url}${endpoint}`;

            try {
                const response = await axios.get(URI, { params: query });

                if (response.status === 200) {
                    this._BASE_URL = url;
                    return response.data;
                }
            } catch (err) {
                lastError = err;
                continue;
            }
        }

        throw new Error(`Error: ${lastError?.message}`);
    }


    private _validate(inputs: Inputs | Partial<Inputs>): boolean {
        const {
            limit,
            genre,
            minimum_rating,
            order_by,
            quality,
            sort_by,
            page
        } = inputs;

        if (limit && ((limit < this._MIN_LIMIT) || (limit > this._MAX_LIMIT))) {
            throw new Error(`${limit} is not a valid value for limit. This parameter should be a number between ${this._MIN_LIMIT} and ${this._MAX_LIMIT}`);
        }

        // if (quality && !this._qualities[quality]) {
        //     throw new Error(`${quality} is not a valid value for quality`);
        // }

        // if (genre && !this._genres[genre]) {
        //     throw new Error(`${genre} is not a valid value for genre`);
        // }

        if (sort_by && !this._sort_by[sort_by]) {
            throw new Error(`${sort_by} is not a valid value for category`);
        }

        if (order_by && !this._order_by[order_by]) {
            throw new Error(`${order_by} is not a valid value for order`);
        }

        if (minimum_rating && ((minimum_rating < this._MIN_RATING) || (minimum_rating > this._MAX_RATING))) {
            throw new Error(`${minimum_rating} is not a valid value for minimum rating. This parameter should be a number between ${this._MIN_RATING} and ${this._MAX_RATING}`);
        }

        if (page && (page < 0 || isNaN(page))) {
            throw new Error(`${page} is not a valid value for page. This parameter should be a positive number`);
        }

        return true;
    }
    
    private _validateMovieParams(params: MovieParams): boolean {
        const {movieId, withImages, withCast} = params;

        if (!movieId || isNaN(Number(movieId))) {
            throw new Error(`${movieId} is not a valid value for movie_id. This parameter should be a number`);
        }

        if (typeof withImages !== 'boolean') {
            throw new Error(`${withImages} is not a valid value for with_images. This parameter should be of type boolean`);
        }

        if (typeof withCast !== 'boolean') {
            throw new Error(`${withCast} is not a valid value for with_cast. This parameter should be of type boolean`);
        }

        return true;
    }

    async getMovies(queryParams: Inputs | Partial<Inputs> = {
        limit: this._BASE_LIMIT,
        page: this._page,
        quality: this._qualities['All'],
        genre: this._genres['Action'],
        sort_by: this._sort_by.year,
        order_by: this._order_by.desc,
        query_term: this._query_term,
        minimum_rating: this._min_rating
    }) {
        const inputsValid = this._validate(queryParams);

        if (!inputsValid) throw new Error('Invalid inputs');

        return await this._get(this._MOVIES_LIST_ENDPOINT, queryParams);
    }

    async getMovie(params: MovieParams = {
        movieId: '',
        withImages: false,
        withCast: false
    }) {
        if (!this._validateMovieParams(params)) {
            throw new Error('Invalid movie parameters');
        }

        const {
            movieId,
            withImages,
            withCast
        } = params;

        return await this._get(this._MOVIE_DETAILS_ENDPOINT, {
            movie_id: movieId,
            with_images: withImages,
            with_cast: withCast
        });
    }
}

const yts = new YTS();

export type {
    Inputs,
}

export {
    yts,
    Limits,
}
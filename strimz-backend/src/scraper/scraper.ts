import { FETCH_LIMIT, PAGE_NUMBER } from "../utils/constants.js";
import { yts } from "../yts/yts.js";

type Filters = {
    genre: string;
    sortBy: string;
    orderBy: string;
    minRating: number;
}

const getAllMovies = async (
    filters: Filters,
    pageNum: number = PAGE_NUMBER,
    fetchLimit: number = FETCH_LIMIT,
    input: string = ''
): Promise<any> => {

    const {
        genre,
        sortBy,
        orderBy,
        minRating
    } = filters;
    
    return await yts.getMovies({
        limit: fetchLimit,
        sort_by: sortBy,
        order_by: orderBy,
        page: pageNum,
        query_term: input,
        genre,
        minimum_rating: minRating
    })
}

const getMovieCast = async (movieId: string) => {
    return await yts.getMovie({movieId, withImages: false, withCast: true});
}

export type {
    Filters
}

export {
    getAllMovies,
    getMovieCast
}
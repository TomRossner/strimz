import { OrderBy, SortBy } from '../services/movies';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCurrentQuery, setFilters } from '../store/movies/movies.slice';
import React, { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BiSearch } from 'react-icons/bi';
import { DEFAULT_FETCH_LIMIT, DEFAULT_GENRE, DEFAULT_PAGE, DEFAULT_QUALITY, DEFAULT_RATING } from '../utils/constants';
import { selectFilters, selectQuery } from '../store/movies/movies.selectors';
import { Filters } from '../utils/types';
import { extractImdbCodeFromText } from '../utils/extractImdbCode';
import Button from './Button';

const scrollToTop = () => {
    window.scrollTo({top: 0, behavior: 'smooth'});
}

const Search = () => {
    const [query, setQuery] = useState<string>('');
    const dispatch = useAppDispatch();
    const currentQuery = useAppSelector(selectQuery);
    const filters = useAppSelector(selectFilters);

    const hasMounted = useRef(false);
    
    const onInputChange = (ev: ChangeEvent<HTMLInputElement>) => {
        setQuery(ev.target.value);
    }

    const params: Filters = useMemo(() => {
        const trimmedQuery = query.trim();
        const extractedQuery = trimmedQuery ? extractImdbCodeFromText(trimmedQuery) || trimmedQuery : '';
        
        return {
            genre: filters.genre ?? DEFAULT_GENRE,
            limit: filters.limit ?? DEFAULT_FETCH_LIMIT,
            minimum_rating: filters.minimum_rating ?? DEFAULT_RATING,
            order_by: filters.order_by ?? OrderBy.DESC,
            page: query ? DEFAULT_PAGE : filters.page,
            quality: filters.quality ?? DEFAULT_QUALITY,
            query_term: extractedQuery as string,
            sort_by: filters.sort_by ?? SortBy.DOWNLOAD_COUNT,
        }
    }, [filters, query]);

    const onFormSubmit = useCallback((ev: FormEvent<HTMLFormElement>) => {
        ev.preventDefault();
        scrollToTop();
        dispatch(setFilters(params));
    }, [params, dispatch]);

    useEffect(() => {
        setQuery(currentQuery ?? '');
    }, [currentQuery]);

    useEffect(() => {
        if (!hasMounted.current) {
            hasMounted.current = true;
    
            if (currentQuery && !query.length) {
                const extractedQuery = extractImdbCodeFromText(currentQuery) || currentQuery;
                const newParams: Filters = {
                    ...params,
                    page: DEFAULT_PAGE,
                    query_term: extractedQuery,
                }
    
                dispatch(setFilters(newParams));
            }
        }
    }, []);

  return (
    <form
        onSubmit={onFormSubmit}
        className='flex items-center w-full md:w-fit justify-end'
    >
        <input
            type="search"
            id='searchInput'
            autoComplete='off'
            placeholder='Search movies or IMDb codes...'
            className='text-black text-sm font-semibold px-1 py-1 placeholder:opacity-75 outline-none rounded-l-sm bg-white w-full md:w-[200px] md:focus:w-[320px] lg:w-[320px] lg:focus:w-[440px] transition-all duration-100'
            value={query as string}
            onChange={onInputChange}
            onBlur={() => dispatch(setCurrentQuery(query))}
        />

        <Button
            type='submit'
            title='Search'
            disabled={!query.length}
            className={`
                bg-gray-50
                hover:bg-blue-400
                hover:text-white
                border-stone-200
                text-stone-800
                p-1
                text-xl
                rounded-tl-none
                rounded-bl-none
                disabled:bg-gray-300
                disabled:hover:bg-gray-300
                disabled:hover:text-stone-500
                disabled:text-stone-500
            `}
        >
            <BiSearch />
        </Button>
    </form>
  )
}

export default Search;
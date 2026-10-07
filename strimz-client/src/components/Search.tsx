import { OrderBy, SortBy } from '../services/movies';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setCurrentQuery, setFilters } from '../store/movies/movies.slice';
import React, { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { BiSearch } from 'react-icons/bi';
import { API_URL, DEFAULT_FETCH_LIMIT, DEFAULT_GENRE, DEFAULT_PAGE, DEFAULT_QUALITY, DEFAULT_RATING } from '../utils/constants';
import { selectFilters, selectQuery } from '../store/movies/movies.selectors';
import { Filters } from '../utils/types';
import { extractImdbCodeFromText } from '../utils/extractImdbCode';
import Button from './Button';
import axios from 'axios';
import { clearRecentSearches, getLibrarySnapshot, rememberSearch, subscribeLibrary } from '@/services/library';

const scrollToTop = () => {
    window.scrollTo({top: 0, behavior: 'smooth'});
}

const Search = () => {
    const [query, setQuery] = useState<string>('');
    const [suggestion, setSuggestion] = useState<string | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const { recentSearches } = useSyncExternalStore(subscribeLibrary, getLibrarySnapshot);
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
            ...filters,
            genre: filters.genre ?? DEFAULT_GENRE,
            limit: filters.limit ?? DEFAULT_FETCH_LIMIT,
            minimum_rating: filters.minimum_rating ?? DEFAULT_RATING,
            order_by: filters.order_by ?? OrderBy.DESC,
            page: query ? DEFAULT_PAGE : filters.page,
            quality: filters.quality ?? DEFAULT_QUALITY,
            query_term: extractedQuery as string,
            sort_by: filters.sort_by ?? SortBy.DOWNLOAD_COUNT,
            year_from: filters.year_from || '',
            year_to: filters.year_to || '',
            languages: filters.languages || '',
        }
    }, [filters, query]);

    const runSearch = useCallback((term: string) => {
        const next = term.trim();
        if (!next) return;
        rememberSearch(next);
        setQuery(next);
        setMenuOpen(false);
        scrollToTop();
        dispatch(setFilters({
            ...params,
            page: DEFAULT_PAGE,
            query_term: extractImdbCodeFromText(next) || next,
        }));
    }, [dispatch, params]);

    const onFormSubmit = useCallback((ev: FormEvent<HTMLFormElement>) => {
        ev.preventDefault();
        runSearch(query);
    }, [query, runSearch]);

    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length < 3) {
            setSuggestion(null);
            return;
        }
        const timer = setTimeout(() => {
            axios.get(`${API_URL}/movies/spell`, { params: { q: trimmed } })
                .then(({ data }) => setSuggestion(data.suggestion || null))
                .catch(() => setSuggestion(null));
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

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
        className='relative flex items-center w-full md:w-fit justify-end'
    >
        <input
            type="search"
            id='searchInput'
            autoComplete='off'
            placeholder='Search movies or IMDb codes...'
            className='text-black text-sm font-semibold px-1 py-1 placeholder:opacity-75 outline-none rounded-l-sm bg-white w-full md:w-[200px] md:focus:w-[320px] lg:w-[320px] lg:focus:w-[440px] transition-all duration-100'
            value={query as string}
            onChange={onInputChange}
            onFocus={() => setMenuOpen(true)}
            onBlur={() => {
                dispatch(setCurrentQuery(query));
                setTimeout(() => setMenuOpen(false), 150);
            }}
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
        {menuOpen && (suggestion || recentSearches.length > 0) && (
            <div className='absolute top-full right-0 z-30 mt-1 w-full min-w-56 bg-stone-900 border border-stone-700 rounded-sm p-2 flex flex-col gap-1'>
                {suggestion && (
                    <button type='button' className='text-left text-sm text-blue-300 hover:text-blue-200' onMouseDown={() => runSearch(suggestion)}>
                        Did you mean {suggestion}?
                    </button>
                )}
                {recentSearches.map((entry) => (
                    <button
                        key={entry}
                        type='button'
                        className='w-full cursor-pointer rounded-sm px-2 py-1.5 text-left text-sm text-stone-200 transition-colors duration-150 hover:bg-stone-700 hover:text-white'
                        onMouseDown={() => runSearch(entry)}
                    >
                        {entry}
                    </button>
                ))}
                {recentSearches.length > 0 && (
                    <button type='button' className='w-full cursor-pointer rounded-sm px-2 py-1.5 text-left text-xs text-stone-500 transition-colors duration-150 hover:bg-stone-700 hover:text-white' onMouseDown={clearRecentSearches}>Clear recent searches</button>
                )}
            </div>
        )}
    </form>
  )
}

export default Search;
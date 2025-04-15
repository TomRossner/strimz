import React, { useCallback, useEffect, useMemo } from 'react';
import MovieCard from './MovieCard';
import { twMerge } from 'tailwind-merge';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchMoviesAsync, setFilters, setLastFetchParams } from '../store/movies/movies.slice';
import { selectCurrentPage, selectError, selectFilters, selectIsLoading, selectLastFetchParams, selectMoviesMap, selectNextPage, selectQuery } from '../store/movies/movies.selectors';
import MoviesListSkeleton from './MoviesListSkeleton';
import { DEFAULT_FETCH_LIMIT, DEFAULT_GENRE, DEFAULT_QUALITY, DEFAULT_RATING } from '../utils/constants';
import { OrderBy, SortBy } from '../services/movies';
import { openModal } from '../store/modals/modals.slice';
import { Filters } from '../utils/types';
import { selectSettings } from '../store/settings/settings.selectors';
import Button from './Button';

const MoviesList = () => {
  const dispatch = useAppDispatch();
  const moviesMap = useAppSelector(selectMoviesMap);
  const isLoading = useAppSelector(selectIsLoading);

  const currentPage = useAppSelector(selectCurrentPage);
  const nextPage = useAppSelector(selectNextPage);
  const filters = useAppSelector(selectFilters);
  const error = useAppSelector(selectError);
  const currentQuery = useAppSelector(selectQuery);

  const settings = useAppSelector(selectSettings);

  const lastFetchParams = useAppSelector(selectLastFetchParams);

  const hasNextPage = useMemo(() => {
    return nextPage > currentPage;
  }, [nextPage, currentPage]);

  const params: Filters = useMemo(() => {
    return {
      genre: filters.genre ?? DEFAULT_GENRE,
      limit: filters.limit ?? DEFAULT_FETCH_LIMIT,
      minimum_rating: filters.minimum_rating ?? DEFAULT_RATING,
      order_by: filters.order_by ?? OrderBy.DESC,
      page: filters.page,
      quality: filters.quality ?? DEFAULT_QUALITY,
      query_term: filters.query_term === currentQuery ? filters.query_term : currentQuery,
      sort_by: filters.sort_by ?? SortBy.DOWNLOAD_COUNT,
    }
  }, [filters, currentQuery]);


  const handleLoadMore = useCallback(() => {
    if (!isLoading) {
      dispatch(setFilters({
        ...params,
        page: nextPage
      }));
    }
  }, [params, nextPage, dispatch, isLoading]);

  useEffect(() => {
    const shouldFetch: boolean = !lastFetchParams || (JSON.stringify(params) !== JSON.stringify(lastFetchParams));
  
    if (shouldFetch) {
      dispatch(fetchMoviesAsync(params));
      dispatch(setLastFetchParams(params));
    }
  }, [params, dispatch]);

  const handleScroll = useCallback(() => {
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight) {
      handleLoadMore();
    }
  }, [handleLoadMore]);

  useEffect(() => {
    if (hasNextPage && settings.loadOnScroll) window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    }

  }, [hasNextPage, settings.loadOnScroll, handleScroll]);

  return (
    <div
      className={twMerge(`
        grid
        grid-cols-3
        xs:grid-cols-4
        sm:grid-cols-3
        md:grid-cols-4
        lg:grid-cols-5
        xl:grid-cols-7
        2xl:grid-cols-8
        gap-3
        w-full
        p-2
        min-h-auto
        transition-opacity
        duration-100
      `)}
    >
      {!!moviesMap.size
        && (
          <>
            {Array.from(moviesMap.values()).map(m => (
              <MovieCard
                movie={m}
                key={m.id}
                setOpen={() => dispatch(openModal('movie'))}
              />
            ))}
          </>
        )
      }

      {hasNextPage && !error && !settings.loadOnScroll && (
        <Button
          onClick={handleLoadMore}
          disabled={isLoading}
          hidden={isLoading}
          className={`
            col-span-full
            text-slate-400
            self-center
            py-2
            bg-stone-700
            hover:bg-stone-600
            w-full
            disabled:hover:text-white
          `}
        >
          {isLoading ? "Loading..." : "Load more..."}
        </Button>
      )}

      {isLoading && <MoviesListSkeleton />}
    </div>
  )
}

export default MoviesList;
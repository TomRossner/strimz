import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Movie } from '../MovieCard';
import { BsCircleFill } from 'react-icons/bs';
import Rating from './Rating';
import WatchTrailerButton from './WatchTrailerButton';
import Summary from './Summary';
import Genres from './Genres';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { openModal } from '../../store/modals/modals.slice';
import Button from '../Button';
import { addToFavorites, addToWatchList, getFavorites, getWatchList, removeFromFavorites, removeFromWatchList } from '@/services/localStorage';
import { setFavorites, setTrailerCode, setWatchList } from '@/store/movies/movies.slice';
import { selectFavorites, selectWatchList } from '@/store/movies/movies.selectors';
import { getMovieMetadata } from '@/services/movies';
import { MdFavoriteBorder, MdFavorite } from "react-icons/md";
import { ImEye, ImEyeBlocked } from "react-icons/im";
import LoadingIcon from '../LoadingIcon';

const GENRES_TO_LOAD = 3;

const formatMinutes = (minutes: number): string => {
    return minutes < 10 ? `0${minutes}` : `${minutes}`;
}

const calculateRuntime = (totalMinutes: number | undefined): string => {
    if (totalMinutes == null || !Number.isFinite(totalMinutes)) return 'Unknown duration';

    const minutes = formatMinutes(totalMinutes % 60);
    const hours = Math.floor(totalMinutes / 60);

    return `${hours}h ${minutes}m`;
}

interface MetadataProps {
    movie: Movie;
}

const normalizeGenres = (movie: { genres?: unknown; genre?: unknown }): string[] => {
    const raw = movie.genres ?? movie.genre;
    if (Array.isArray(raw) && raw.length > 0) {
        const first = raw[0];
        if (typeof first === 'string') return raw as string[];
        if (typeof first === 'object' && first !== null && 'name' in first) {
            return (raw as { name: string }[]).map((g) => g.name);
        }
    }
    if (typeof raw === 'string' && raw.trim()) {
        const split = raw.split(/[,/]/).map((s) => s.trim()).filter(Boolean);
        if (split.length > 0) return split;
        return [raw.trim()];
    }
    return [];
};

const Metadata = ({movie}: MetadataProps) => {
    const {
        language,
        rating: movieRating,
        runtime: movieRuntime,
        year,
        id,
        slug,
        imdb_code,
    } = movie;
    const movieGenres = normalizeGenres(movie);

    const dispatch = useAppDispatch();

    const favorites = useAppSelector(selectFavorites);
    const watchList = useAppSelector(selectWatchList);

    const [tmdbMetadata, setTmdbMetadata] = useState<{ runtime?: number; rating?: number; summary?: string; yt_trailer_code?: string; genres?: string[] | { id: number; name: string }[] } | null>(null);
    const tmdbGenresNormalized = useMemo((): string[] => {
        const raw = tmdbMetadata?.genres;
        if (!raw || !Array.isArray(raw) || raw.length === 0) return [];
        const first = raw[0];
        if (typeof first === 'string') return raw as string[];
        if (typeof first === 'object' && first !== null && 'name' in first) {
            return (raw as { id?: number; name: string }[]).map((g) => (g?.name ?? '')).filter(Boolean);
        }
        return [];
    }, [tmdbMetadata?.genres]);
    const genres = movieGenres.length > 0 ? movieGenres : tmdbGenresNormalized;
    const [isLoadingTmdb, setIsLoadingTmdb] = useState(false);

    const movieSummary = movie?.summary || movie?.description_full;
    const needsTmdb = !!imdb_code;
    const isLoadingRating = needsTmdb && movieRating == null && isLoadingTmdb;
    const isLoadingRuntime = needsTmdb && movieRuntime == null && isLoadingTmdb;
    const isLoadingSummary = needsTmdb && !movieSummary?.length && isLoadingTmdb;
    const isLoadingGenres = needsTmdb && movieGenres.length === 0 && isLoadingTmdb;

    useEffect(() => {
        setTmdbMetadata(null);
        setIsLoadingTmdb(false);
        dispatch(setTrailerCode(null));
    }, [imdb_code, dispatch]);

    useEffect(() => {
        if (!needsTmdb) {
            setIsLoadingTmdb(false);
            return;
        }
        let cancelled = false;
        setIsLoadingTmdb(true);
        getMovieMetadata(imdb_code!)
            .then((data) => {
                if (!cancelled) {
                    setTmdbMetadata({ runtime: data.runtime, rating: data.rating, summary: data.summary, yt_trailer_code: data.yt_trailer_code, genres: data.genres });
                    dispatch(setTrailerCode(data.yt_trailer_code ?? null));
                    setIsLoadingTmdb(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setTmdbMetadata(null);
                    setIsLoadingTmdb(false);
                }
            });
        return () => { cancelled = true; };
    }, [imdb_code, needsTmdb, dispatch]);

    const runtime = movieRuntime ?? tmdbMetadata?.runtime;
    const rating = movieRating ?? tmdbMetadata?.rating;
    const summaryText = movieSummary ?? tmdbMetadata?.summary;

    const formattedSummary = useMemo((): string | undefined => {
        if (!summaryText?.length) {
            return isLoadingSummary ? undefined : "No summary";
        }

        const regex = /\s+[-–—]+[^-–—]*\.?$|[-–—]\.$/;
        const punctuationRegex = /[?.!]$/;

        const cleaned = summaryText.replace(regex, "").trim();
        return `${cleaned}${punctuationRegex.test(cleaned) ? "" : "."}`;
    }, [summaryText, isLoadingSummary]);

    const handleSummaryClick = () => {
        dispatch(openModal('summary'));
    }

    const handlePlayTrailer = () => {
        dispatch(openModal('trailer'));
    }

    const ytTrailerCode = tmdbMetadata?.yt_trailer_code;

    const handleFavorites = useCallback((id: string) => {
        const userFavorites = getFavorites();
    
        if (userFavorites?.find(f => f === id)) {
            removeFromFavorites(id);
    
            const updatedFavoritesMap = new Map(
                Array.from(favorites.entries()).filter(([, value]) => value.id !== id)
            );
            dispatch(setFavorites(updatedFavoritesMap));
    
            return;
        }
    
        addToFavorites(id);
    
        const updatedFavoritesMap = new Map(favorites);
        updatedFavoritesMap.set(slug, movie);
        dispatch(setFavorites(updatedFavoritesMap));
    }, [dispatch, slug, favorites, movie]);
    
    
    const handleWatchList = useCallback((id: string) => {
        const userWatchList = getWatchList();

        if (userWatchList?.find(i => i === id)) {
            removeFromWatchList(id);

            const updatedWatchListMap = new Map(Array.from(watchList.entries()).filter(([, value]) => value.id !== id));
            dispatch(setWatchList(updatedWatchListMap));

            return;
        }

        addToWatchList(id);

        const updatedWatchListMap = new Map(watchList);
        updatedWatchListMap.set(slug, movie);
        dispatch(setWatchList(updatedWatchListMap));
    }, [dispatch, slug, watchList, movie]);

  return (
    <div className='flex flex-col gap-1.5 text-white w-full'>
        <p className='text-white flex items-center gap-2 flex-wrap'>
            {language && (
                <span
                    title={language.toUpperCase()}
                    className='rounded-md px-2 py-1 text-sm text-center bg-blue-400'
                >
                    {language.toUpperCase()}
                </span>
            )}

            <span className='text-[4px]'><BsCircleFill/></span>

            {year}

            <span className='text-[4px]'><BsCircleFill/></span>

            {isLoadingRuntime || isLoadingRating ? (
                <span className="flex items-center gap-1 text-stone-400 animate-pulse italic font-light">
                    <LoadingIcon size={16} />
                    Loading metadata...
                </span>
            ) : (
                <>
                    {calculateRuntime(runtime)}
                    <span className='text-[4px]'><BsCircleFill/></span>

                    <Rating rating={rating} />
                </>
            )}
        </p>

        {isLoadingGenres ? (
            <div className='flex gap-1 items-center flex-wrap mb-3' aria-label="Loading categories">
                {[...Array(GENRES_TO_LOAD)].map((_, index) => (
                    <span key={index} className="inline-block text-sm py-1 px-2 bg-gray-500 rounded-md animate-pulse w-14 min-h-[28px]" />
                ))}
            </div>
        ) : (
            <Genres genres={genres} />
        )}

        <Summary onClick={handleSummaryClick} summary={formattedSummary ?? undefined} isLoading={isLoadingSummary} />
        {/* <Cast movie={movie} /> */}
        <WatchTrailerButton isDisabled={!ytTrailerCode} onPlay={handlePlayTrailer} ytTrailerCode={ytTrailerCode ?? ''} />

        <div className='w-full flex items-center gap-2'>
            <Button
                onClick={() => handleWatchList(id)}
                className='w-full gap-2 bg-stone-950 border border-stone-800 hover:border-stone-500 hover:bg-stone-900 group py-0.5'
                title={watchList?.has(slug) ? 'Remove from watch list' : 'Add to watch list'}
            >
                <span className='group-hover:text-blue-400 flex text-center items-center gap-2 transition-all duration-100'>
                    {watchList?.has(slug)
                        ? <><ImEyeBlocked className='text-2xl' /> <span className='text-sm font-light'>Remove from watch list</span></>
                        : <><ImEye className='text-2xl' /> <span className='text-sm font-light'>Add to watch list</span></>
                    }
                </span>
            </Button>

            <Button
                onClick={() => handleFavorites(id)}
                className='w-full gap-2 bg-stone-950 border border-stone-800 hover:border-stone-500 hover:bg-stone-900 group'
                title={favorites?.has(slug) ? 'Remove from favorites' : 'Add to favorites'}
            >
                <span className='group-hover:text-red-300 transition-all duration-100 flex text-center gap-2 items-center'>
                    {favorites?.has(slug)
                        ? <><MdFavorite className='text-red-500 text-xl' /> <span className='text-sm font-light'>Remove from favorites</span></>
                        : <><MdFavoriteBorder className='text-red-500 text-xl' /> <span className='text-sm font-light'>Add to favorites</span></>
                    }
                </span>
            </Button>
        </div>
    </div>
  )
}

export default Metadata;
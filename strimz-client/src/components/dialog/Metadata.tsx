import React, { useCallback, useMemo } from 'react';
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
import { setFavorites, setWatchList } from '@/store/movies/movies.slice';
import { selectFavorites, selectWatchList } from '@/store/movies/movies.selectors';
import { MdFavoriteBorder, MdFavorite } from "react-icons/md";
import { ImEye, ImEyeBlocked } from "react-icons/im";

const formatMinutes = (minutes: number): string => {
    return minutes < 10 ? `0${minutes}` : `${minutes}`;
}

const calculateRuntime = (totalMinutes: number): string => {
    if (!totalMinutes) return 'Unknown duration';

    const minutes = formatMinutes(totalMinutes % 60);
    const hours = Math.floor(totalMinutes / 60);

    return `${hours}h ${minutes}m`;
}

interface MetadataProps {
    movie: Movie;
}

const Metadata = ({movie}: MetadataProps) => {
    const {
        language,
        rating,
        genres,
        runtime,
        yt_trailer_code,
        year,
        id,
        slug,
    } = movie;

    const dispatch = useAppDispatch();

    const favorites = useAppSelector(selectFavorites);
    const watchList = useAppSelector(selectWatchList);

    const movieSummary = useMemo(() => {
        if (!movie?.summary?.length && !movie?.description_full?.length) {
            return "No summary"
        }

        const regex = /\s*[-–—]+[^-–—]*\.?$|[-–—]\.$/;
        const punctuationRegex = /[?.!]$/;

        const summary = movie.summary ? movie.summary.replace(regex, "").trim() : movie.description_full!.replace(regex, "").trim();

        return `${summary}${punctuationRegex.test(summary) ? "" : "."}`;
    }, [movie]);

    const handleSummaryClick = () => {
        dispatch(openModal('summary'));
    }

    const handlePlayTrailer = () => {
        dispatch(openModal('trailer'));
    }

    const handleFavorites = useCallback((id: string) => {
        const userFavorites = getFavorites();
    
        if (userFavorites?.find(f => f === id)) {
            removeFromFavorites(id);
    
            const updatedFavoritesMap = new Map(
                Array.from(favorites.entries()).filter(([key, value]) => value.id !== id)
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

            const updatedWatchListMap = new Map(Array.from(watchList.entries()).filter(([key, value]) => value.id !== id));
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
            <span
                title={language.toUpperCase()}
                className='rounded-md px-2 py-1 text-sm text-center bg-blue-400'
            >
                {language.toUpperCase()}
            </span>

            <span className='text-[4px]'><BsCircleFill/></span>

            {year}

            <span className='text-[4px]'><BsCircleFill/></span>

            {calculateRuntime(runtime)}

            <span className='text-[4px]'><BsCircleFill/></span>

            <Rating rating={rating} />
        </p>

        <Genres genres={genres} />
        <Summary onClick={handleSummaryClick} summary={movieSummary} />
        <WatchTrailerButton isDisabled={!yt_trailer_code} onPlay={handlePlayTrailer} ytTrailerCode={yt_trailer_code} />

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
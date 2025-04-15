import React, { useMemo, useState } from 'react';
import { Movie } from '../MovieCard';
import { BsCircleFill } from 'react-icons/bs';
import Rating from './Rating';
import WatchTrailerButton from './WatchTrailerButton';
import Summary from './Summary';
import Genres from './Genres';
import { useAppDispatch } from '../../store/hooks';
import { openModal } from '../../store/modals/modals.slice';

// const circleIcon = ;

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
    } = movie;

    const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
    const dispatch = useAppDispatch();

    const movieSummary = useMemo(() => {
        if (!movie?.summary.length) {
            return "No summary"
        }

        const regex = /\s*[-–—]+[^-–—]*\.?$|[-–—]\.$/;
        const punctuationRegex = /[?.!]$/;

        const summary = movie.summary.replace(regex, "").trim();

        return `${summary}${punctuationRegex.test(summary) ? "" : "."}`;
    }, [movie?.summary]);

    const handleSummaryClick = () => {
        setIsSummaryExpanded(!isSummaryExpanded);
    }

    const handlePlayTrailer = () => {
        dispatch(openModal('trailer'));
    }
  return (
    <div className='flex flex-col gap-2 text-white w-full'>
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
        <Summary isExpanded={isSummaryExpanded} onClick={handleSummaryClick} summary={movieSummary} />
        <WatchTrailerButton isDisabled={!yt_trailer_code} onPlay={handlePlayTrailer} ytTrailerCode={yt_trailer_code} />
    </div>
  )
}

export default Metadata;
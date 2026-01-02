import React from 'react';
import { Qualities } from '../utils/qualities';
import { Torrent } from '../utils/types';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setSelectedMovie } from '../store/movies/movies.slice';
import Button from './Button';
import { selectFavorites } from '@/store/movies/movies.selectors';

export type Movie = {
  id: string;
  title: string;
  slug: string;
  year: number;
  rating: number;
  runtime: number;
  genres: string[];
  summary: string;
  yt_trailer_code: string;
  language: string;
  background_image: string;
  background_image_original: string;
  small_cover_image: string;
  medium_cover_image: string;
  large_cover_image: string;
  torrents: object[];
  description_full?: string;
  imdb_code: string;
}

type Props = {
  movie: Movie;
  setOpen: () => void;
}

const QUALITIES = {
  '3D': '3D',
  '720p': '720p',
  '1080p': '1080p',
  '2160p': '2160p',
}

const getBestTorrentQuality = (torrents: Torrent[]): Qualities => {
  const qualities = torrents.map(t => t.quality);
  const map = new Map();

  for (const q of qualities) {
    if (!map.has(q)) {
      map.set(q, true);
    }
  }

  if (map.has(QUALITIES['2160p'])) {
    return Qualities['4K'];
  } else if (map.has(QUALITIES['1080p'])) {
    return Qualities['1080p'];
  } else if (map.has(QUALITIES['720p'])) {
    return Qualities['720p'];
  } else return Qualities['3D'];
}

const MovieCard = ({ movie, setOpen }: Props) => {
  const {
    id,
    title,
    large_cover_image,
    torrents,
  } = movie;

  const dispatch = useAppDispatch();
  const favorites = useAppSelector(selectFavorites);

  const handleClick = () => {
    dispatch(setSelectedMovie(movie));
    setOpen();
  };

  return (
    <Button
      key={id}
      onClick={handleClick}
      className={`
        relative
        flex-col
        aspect-[2/3]
        min-w-[100px]
        max-w-[200px]
        md:min-w-[150px]
        md:max-w-[250px]
        w-full
        overflow-hidden
        max-h-[524px]
        duration-150
        hover:scale-[1.04]
        hover:border
        ${favorites.has(movie.slug) && "border-2 border-yellow-300"}
        ${favorites.has(movie.slug) ? "hover:border-yellow-300" : "hover:border-gray-300"}
        p-0
      `}
    >
      <div className="absolute z-[5] bg-white text-black drop-shadow-md top-1 right-1 rounded-sm font-semibold px-2 py-1 text-center">
        {getBestTorrentQuality(torrents as Torrent[])}
      </div>
      <img
        src={large_cover_image}
        alt={title}
        width={250}
        height={375}
        className="opacity-80 hover:opacity-100 transition-all w-full h-full object-cover"
      />
    </Button>
  )
}

export default MovieCard;
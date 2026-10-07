import { useEffect, useState } from 'react';
import { Movie } from './MovieCard';
import { getMoviesInTheatres } from '@/services/movies';
import { useAppDispatch } from '../store/hooks';
import { openModal } from '../store/modals/modals.slice';
import MovieCarousel from './MovieCarousel';

let cachedMovies: Movie[] | null = null;

const toOptionalNumber = (value: unknown): number | undefined => {
  if (value == null) return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toMovie = (movie: Record<string, unknown>): Movie => ({
  id: movie.id as string,
  title: movie.title as string,
  slug: movie.slug as string,
  year: movie.year as number,
  rating: toOptionalNumber(movie.rating),
  runtime: toOptionalNumber(movie.runtime),
  genres: (movie.genres as string[]) ?? [],
  summary: (movie.summary as string) ?? '',
  yt_trailer_code: (movie.yt_trailer_code as string) ?? '',
  language: (movie.language as string) ?? '',
  background_image: (movie.background_image as string) ?? '',
  background_image_original: (movie.background_image_original as string) ?? '',
  small_cover_image: (movie.small_cover_image as string) ?? '',
  medium_cover_image: (movie.medium_cover_image as string) ?? '',
  large_cover_image: (movie.large_cover_image as string) ?? '',
  torrents: (movie.torrents as object[]) ?? [],
  imdb_code: (movie.imdb_code as string) ?? '',
});

const InTheatresCarousel = () => {
  const dispatch = useAppDispatch();
  const [movies, setMovies] = useState<Movie[]>(cachedMovies ?? []);
  const [isLoading, setIsLoading] = useState(cachedMovies === null);

  useEffect(() => {
    let cancelled = false;

    if (!cachedMovies) {
      setIsLoading(true);
    }

    getMoviesInTheatres()
      .then(({ data }) => {
        if (cancelled) return;
        const nextMovies = (data?.movies ?? []).map(toMovie);
        cachedMovies = nextMovies;
        setMovies(nextMovies);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled && !cachedMovies) {
          setMovies([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const openMovie = () => {
    dispatch(openModal('movie'));
  };

  return (
    <MovieCarousel
      title="In Theatres"
      movies={movies}
      isLoading={isLoading}
      collapsible
      onOpenMovie={openMovie}
    />
  );
};

export default InTheatresCarousel;

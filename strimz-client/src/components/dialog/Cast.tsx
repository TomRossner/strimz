import React, { useEffect, useState } from 'react';
import { Movie } from '../MovieCard';
import { getMovieCast, CastMember, DirectorMember, WriterMember } from '@/services/movies';
import LoadingIcon from '../LoadingIcon';
import { GrGroup } from "react-icons/gr";
import { MdMovieCreation } from "react-icons/md";
import { MdEdit } from "react-icons/md";

interface CastProps {
  movie: Movie;
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w185';

function PersonCard({
  name,
  profilePath,
  sublabel,
}: { name: string; profilePath?: string; sublabel?: string }) {
  const imgSrc = profilePath ? `${TMDB_IMAGE_BASE}${profilePath}` : null;
  return (
    <div className="flex flex-col items-center text-center gap-1">
      <div className="w-28 h-36 lg:w-36 lg:h-48 rounded-3xl overflow-hidden bg-stone-700 shrink-0 flex items-center justify-center">
        {imgSrc ? (
          <img src={imgSrc} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-500 text-xl font-medium">
            {name.charAt(0)}
          </div>
        )}
      </div>
      <span className="text-white text-sm font-medium truncate w-full" title={name}>
        {name}
      </span>
      {sublabel && (
        <span className="text-stone-400 text-xs italic truncate w-full" title={sublabel}>
          {sublabel}
        </span>
      )}
    </div>
  );
}

const Cast = ({ movie }: CastProps) => {
  const [cast, setCast] = useState<CastMember[]>([]);
  const [directors, setDirectors] = useState<DirectorMember[]>([]);
  const [writers, setWriters] = useState<WriterMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!movie?.imdb_code) {
      setCast([]);
      setDirectors([]);
      setWriters([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchCast = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getMovieCast(movie.imdb_code);
        if (!cancelled) {
          setCast(Array.isArray(data?.cast) ? data.cast : []);
          setDirectors(Array.isArray(data?.directors) ? data.directors : []);
          setWriters(Array.isArray(data?.writers) ? data.writers : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load cast');
          setCast([]);
          setDirectors([]);
          setWriters([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchCast();
    return () => {
      cancelled = true;
    };
  }, [movie?.imdb_code]);

  if (isLoading) {
    return (
      <>
        <p className="text-white flex items-center gap-2">
          <GrGroup className="text-2xl" />
          <span className="flex items-center gap-2">Cast</span>
        </p>
        <div className="flex gap-1 items-center flex-wrap px-2 py-1 rounded-md my-1">
          <LoadingIcon size={16} />
          <span className="text-stone-400 text-sm animate-pulse">Loading cast...</span>
        </div>
      </>
    );
  }

  if (error) {
    return null;
  }

  const hasCast = cast.length > 0;
  const hasDirectors = directors.length > 0;
  const hasWriters = writers.length > 0;
  if (!hasCast && !hasDirectors && !hasWriters) {
    return null;
  }

  return (
    <div className="my-1 overflow-y-auto overflow-x-hidden min-h-0 h-full">
      {hasDirectors && (
        <div className="mb-6">
          <p className="text-white flex items-center gap-2 mb-3">
            <MdMovieCreation className="text-2xl" />
            <span className="text-xl font-medium">Directors</span>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3">
            {directors.map((member, index) => (
              <PersonCard
                key={`${member?.name}-${index}`}
                name={member?.name ?? ''}
                profilePath={member?.profile_path}
              />
            ))}
          </div>
        </div>
      )}

      {hasWriters && (
        <div className="mb-6">
          <p className="text-white flex items-center gap-2 mb-3">
            <MdEdit className="text-2xl" />
            <span className="text-xl font-medium">Writers</span>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {writers.map((member, index) => (
              <PersonCard
                key={`${member?.name}-${index}`}
                name={member?.name ?? ''}
                profilePath={member?.profile_path}
              />
            ))}
          </div>
        </div>
      )}

      {hasCast && (
        <>
          <p className="text-white flex items-center gap-2 mb-3">
            <GrGroup className="text-2xl" />
            <span className="text-xl font-medium">Cast</span>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-2">
            {cast.map((member, index) => (
              <PersonCard
                key={`${member?.name}-${index}`}
                name={member?.name ?? ''}
                profilePath={member?.profile_path}
                sublabel={member?.character_name}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Cast;

import { useState } from 'react';
import { BiChevronDown, BiChevronLeft, BiChevronRight } from 'react-icons/bi';
import MovieCard, { Movie } from './MovieCard';
import { useAppSelector } from '../store/hooks';
import { selectQuery } from '../store/movies/movies.selectors';
import { HORIZONTAL_SCROLLER_CLASS, useHorizontalDragScroll } from './useHorizontalDragScroll';

const CARD_CLASS = 'shrink-0 w-[120px] sm:w-[140px] md:w-[160px]';

interface MovieCarouselProps {
  title: string;
  movies: Movie[];
  isLoading?: boolean;
  collapsible?: boolean;
  onOpenMovie: (movie: Movie) => void;
}

const MovieCarousel = ({ title, movies, isLoading = false, collapsible = false, onOpenMovie }: MovieCarouselProps) => {
  const currentQuery = useAppSelector(selectQuery);
  const [expanded, setExpanded] = useState(true);
  const isExpanded = !collapsible || expanded;
  const {
    scrollerRef,
    canScrollLeft,
    canScrollRight,
    scrollByPage,
    onDragPointerDown,
    onDragPointerMove,
    onDragPointerEnd,
    onDragClickCapture,
  } = useHorizontalDragScroll(`${movies.length}:${isLoading}:${currentQuery}:${isExpanded}`);

  if (currentQuery || (!isLoading && movies.length === 0)) {
    return null;
  }

  const backdrop = movies.find((movie) => movie.background_image || movie.background_image_original);
  const backdropSrc = backdrop?.background_image || backdrop?.background_image_original;

  return (
    <section className="relative z-0 mb-4 w-full min-w-0 overflow-hidden rounded-md bg-stone-950" aria-label={title}>
      {isExpanded && backdropSrc && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url(${backdropSrc})` }}
        />
      )}
      {isExpanded && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/85 to-stone-950/50" />
      )}

      <div className="relative py-3">
        {collapsible ? (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((open) => !open)}
            className={`flex w-full cursor-pointer items-center justify-between px-2 text-left ${isExpanded ? 'mb-2' : ''}`}
          >
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <BiChevronDown className={`text-2xl text-white transition-transform ${expanded ? '' : '-rotate-90'}`} />
          </button>
        ) : (
          <h2 className="px-2 mb-2 text-xl font-semibold text-white">{title}</h2>
        )}

        {isExpanded && isLoading ? (
          <div className="flex gap-3 overflow-hidden px-2 py-2">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className={`${CARD_CLASS} aspect-[2/3] animate-pulse rounded-sm bg-stone-700`}
              />
            ))}
          </div>
        ) : isExpanded ? (
          <div className="relative">
            {canScrollLeft && (
              <button
                type="button"
                aria-label={`Scroll ${title} left`}
                onClick={() => scrollByPage(-1)}
                className="absolute left-1 top-1/2 z-[1] flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
              >
                <BiChevronLeft className="text-3xl" />
              </button>
            )}

            <div
              ref={scrollerRef}
              onPointerDown={onDragPointerDown}
              onPointerMove={onDragPointerMove}
              onPointerUp={onDragPointerEnd}
              onPointerCancel={onDragPointerEnd}
              onClickCapture={onDragClickCapture}
              onDragStart={(event) => event.preventDefault()}
              className={HORIZONTAL_SCROLLER_CLASS}
            >
              {movies.map((movie) => (
                <div key={movie.imdb_code || movie.id} className={CARD_CLASS}>
                  <MovieCard
                    movie={movie}
                    setOpen={() => onOpenMovie(movie)}
                  />
                </div>
              ))}
            </div>

            {canScrollRight && (
              <button
                type="button"
                aria-label={`Scroll ${title} right`}
                onClick={() => scrollByPage(1)}
                className="absolute right-1 top-1/2 z-[1] flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
              >
                <BiChevronRight className="text-3xl" />
              </button>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default MovieCarousel;

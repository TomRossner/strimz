import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { BiChevronLeft, BiChevronRight } from 'react-icons/bi';
import MovieCard, { Movie } from './MovieCard';
import { getMoviesInTheatres } from '@/services/movies';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { openModal } from '../store/modals/modals.slice';
import { selectQuery } from '../store/movies/movies.selectors';

const CARD_CLASS = 'shrink-0 w-[120px] sm:w-[140px] md:w-[160px]';
const DRAG_START_DISTANCE = 5;
const MOMENTUM_SAMPLE_MS = 100;
const MOMENTUM_MIN_VELOCITY = 0.08;
const MOMENTUM_MAX_VELOCITY = 1.8;
const MOMENTUM_DECAY_MS = 420;

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
  const currentQuery = useAppSelector(selectQuery);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    pointerId: -1,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
  });
  const velocitySamplesRef = useRef<{ x: number; time: number }[]>([]);
  const momentumRef = useRef<number | null>(null);
  const [movies, setMovies] = useState<Movie[]>(cachedMovies ?? []);
  const [isLoading, setIsLoading] = useState(cachedMovies === null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    setCanScrollLeft(scroller.scrollLeft > 4);
    setCanScrollRight(scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 4);
  }, []);

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

  useLayoutEffect(() => {
    updateScrollState();
  }, [movies, isLoading, currentQuery, updateScrollState]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      scroller.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [movies, isLoading, currentQuery, updateScrollState]);

  const stopMomentum = useCallback(() => {
    if (momentumRef.current == null) return;
    cancelAnimationFrame(momentumRef.current);
    momentumRef.current = null;
  }, []);

  useEffect(() => stopMomentum, [stopMomentum]);

  const scrollByPage = (direction: -1 | 1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    stopMomentum();
    scroller.scrollBy({
      left: direction * Math.max(scroller.clientWidth * 0.8, 180),
      behavior: 'smooth',
    });
  };

  const recordVelocitySample = (x: number, time: number) => {
    const samples = velocitySamplesRef.current;
    samples.push({ x, time });
    const earliest = time - MOMENTUM_SAMPLE_MS;
    while (samples.length > 2 && samples[0].time < earliest) {
      samples.shift();
    }
  };

  const releaseScroll = (scroller: HTMLDivElement, coast: boolean) => {
    const samples = velocitySamplesRef.current;
    const first = samples[0];
    const last = samples[samples.length - 1];
    velocitySamplesRef.current = [];

    const elapsed = first && last ? last.time - first.time : 0;
    let velocity = coast && elapsed > 0 ? -(last.x - first.x) / elapsed : 0;
    velocity = Math.max(-MOMENTUM_MAX_VELOCITY, Math.min(MOMENTUM_MAX_VELOCITY, velocity));

    if (!coast || Math.abs(velocity) < MOMENTUM_MIN_VELOCITY) {
      scroller.style.scrollBehavior = '';
      return;
    }

    scroller.style.scrollBehavior = 'auto';
    let lastFrame = performance.now();

    const tick = (now: number) => {
      const frameElapsed = now - lastFrame;
      lastFrame = now;
      scroller.scrollLeft += velocity * frameElapsed;
      velocity *= Math.exp(-frameElapsed / MOMENTUM_DECAY_MS);

      const maxScroll = scroller.scrollWidth - scroller.clientWidth;
      const atEdge = scroller.scrollLeft <= 0 || scroller.scrollLeft >= maxScroll - 1;
      if (atEdge || Math.abs(velocity) < 0.02) {
        momentumRef.current = null;
        scroller.style.scrollBehavior = '';
        return;
      }

      momentumRef.current = requestAnimationFrame(tick);
    };

    momentumRef.current = requestAnimationFrame(tick);
  };

  const onDragPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;

    const wasCoasting = momentumRef.current != null;
    stopMomentum();
    velocitySamplesRef.current = [{ x: event.clientX, time: event.timeStamp }];
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: event.currentTarget.scrollLeft,
      moved: wasCoasting,
    };
  };

  const onDragPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) return;

    const scroller = event.currentTarget;
    const delta = event.clientX - dragRef.current.startX;
    recordVelocitySample(event.clientX, event.timeStamp);
    if (!dragRef.current.moved) {
      if (Math.abs(delta) <= DRAG_START_DISTANCE) return;
      dragRef.current.moved = true;
      scroller.style.scrollBehavior = 'auto';
      scroller.setPointerCapture(event.pointerId);
    }

    scroller.scrollLeft = dragRef.current.startScrollLeft - delta;
  };

  const onDragPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) return;

    const scroller = event.currentTarget;
    if (scroller.hasPointerCapture(event.pointerId)) {
      scroller.releasePointerCapture(event.pointerId);
    }
    dragRef.current.pointerId = -1;
    releaseScroll(scroller, dragRef.current.moved && event.type !== 'pointercancel');
  };

  const onDragClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current.moved) return;

    dragRef.current.moved = false;
    event.preventDefault();
    event.stopPropagation();
  };

  if (currentQuery || (!isLoading && movies.length === 0)) {
    return null;
  }

  const backdrop = movies.find((movie) => movie.background_image || movie.background_image_original);
  const backdropSrc = backdrop?.background_image || backdrop?.background_image_original;

  return (
    <section className="relative z-0 mb-4 w-full min-w-0 overflow-hidden rounded-md bg-stone-950" aria-label="In Theatres">
      {backdropSrc && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url(${backdropSrc})` }}
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/85 to-stone-950/50" />

      <div className="relative py-3">
      <h2 className="px-2 mb-2 text-xl font-semibold text-white">In Theatres</h2>

      {isLoading ? (
        <div className="flex gap-3 overflow-hidden px-2 py-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className={`${CARD_CLASS} aspect-[2/3] animate-pulse rounded-sm bg-stone-700`}
            />
          ))}
        </div>
      ) : (
        <div className="relative">
          {canScrollLeft && (
            <button
              type="button"
              aria-label="Scroll in theatres left"
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
            className="flex cursor-grab select-none gap-3 overflow-x-auto scroll-smooth px-2 py-2 active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&_img]:[-webkit-user-drag:none]"
          >
            {movies.map((movie) => (
              <div key={movie.imdb_code || movie.id} className={CARD_CLASS}>
                <MovieCard
                  movie={movie}
                  setOpen={() => dispatch(openModal('movie'))}
                />
              </div>
            ))}
          </div>

          {canScrollRight && (
            <button
              type="button"
              aria-label="Scroll in theatres right"
              onClick={() => scrollByPage(1)}
              className="absolute right-1 top-1/2 z-[1] flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
            >
              <BiChevronRight className="text-3xl" />
            </button>
          )}
        </div>
      )}
      </div>
    </section>
  );
};

export default InTheatresCarousel;

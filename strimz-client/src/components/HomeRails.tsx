import { useCallback, useEffect, useRef, useState } from 'react';
import { BsPlayFill } from 'react-icons/bs';
import { Movie } from './MovieCard';
import MovieCarousel from './MovieCarousel';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectQuery } from '@/store/movies/movies.selectors';
import { openModal } from '@/store/modals/modals.slice';
import { getLibrarySnapshot, isMostlyWatched, recordWatchProgress, subscribeLibrary, WatchHistoryItem } from '@/services/library';
import { getMovieSuggestions } from '@/services/suggestions';
import axios from 'axios';
import { API_URL } from '@/utils/constants';
import { posterForWatch } from '@/utils/downloadsCache';
import { matchRelease, releaseTitle } from '@/utils/downloadPoster';
import { useNavigate } from 'react-router-dom';
import { formatTime } from '@/utils/formatTime';
import { setSelectedMovie } from '@/store/movies/movies.slice';

const toMovie = (movie: Record<string, unknown>): Movie => ({
    id: String(movie.id),
    title: String(movie.title || ''),
    slug: String(movie.slug || ''),
    year: Number(movie.year) || 0,
    rating: Number(movie.rating) || undefined,
    runtime: Number(movie.runtime) || undefined,
    genres: (movie.genres as string[]) ?? [],
    summary: String(movie.summary || ''),
    yt_trailer_code: String(movie.yt_trailer_code || ''),
    language: String(movie.language || ''),
    background_image: String(movie.background_image || ''),
    background_image_original: String(movie.background_image_original || ''),
    small_cover_image: String(movie.small_cover_image || ''),
    medium_cover_image: String(movie.medium_cover_image || ''),
    large_cover_image: String(movie.large_cover_image || ''),
    torrents: (movie.torrents as object[]) ?? [],
    imdb_code: String(movie.imdb_code || ''),
});

const fetchRail = async (sortBy: string) => {
    const { data } = await axios.get(`${API_URL}/movies`, {
        params: {
            limit: 20,
            page: 1,
            quality: 'All',
            sort_by: sortBy,
            order_by: 'desc',
            minimum_rating: 0,
            genre: '',
            query_term: '',
        },
    });
    const movies = data?.data?.movies || data?.movies || [];
    return (movies as Record<string, unknown>[]).map(toMovie);
};

const resumeItem = (
    item: WatchHistoryItem,
    dispatch: ReturnType<typeof useAppDispatch>,
    navigate: ReturnType<typeof useNavigate>,
) => {
    if (item.movie) dispatch(setSelectedMovie(item.movie));
    if (item.slug && item.hash) {
        const params = new URLSearchParams({
            hash: item.hash,
            title: item.title,
        });
        if (item.poster) params.set('poster', item.poster);
        if (item.kind === 'episode') {
            params.set('kind', 'episode');
            params.set('watchKey', item.key);
        }
        navigate(`/stream/${item.slug}?${params.toString()}`, {
            state: item.kind === 'episode' ? { from: '/tv' } : undefined,
        });
        return;
    }
    if (item.fileName) {
        const streamUrl = `${API_URL}/stream/file/stream?path=${encodeURIComponent(item.fileName)}`;
        const params = new URLSearchParams({
            src: streamUrl,
            title: item.title,
        });
        if (item.poster) params.set('poster', item.poster);
        navigate(`/watch-file?${params.toString()}`);
    }
};

export const ContinueWatching = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const currentQuery = useAppSelector(selectQuery);
    const [history, setHistory] = useState<WatchHistoryItem[]>(() => getLibrarySnapshot().history);
    const titleLookupRef = useRef(new Set<string>());

    useEffect(() => subscribeLibrary(() => setHistory(getLibrarySnapshot().history)), []);

    useEffect(() => {
        const pending = history.filter((item) => {
            if (item.kind === 'episode' || item.movie?.title || titleLookupRef.current.has(item.key)) return false;
            const parsed = releaseTitle(item.title).title;
            return parsed.length > 1 && parsed !== item.title;
        });
        if (!pending.length) return;
        let cancelled = false;
        pending.forEach((item) => titleLookupRef.current.add(item.key));

        pending.forEach((item) => {
            matchRelease(item.title).then((match) => {
                if (cancelled || !match || match.title === item.title) return;
                recordWatchProgress({
                    ...item,
                    title: match.title,
                    year: match.year ?? item.year,
                    poster: item.poster || match.poster,
                });
            }).catch((error) => console.error(error));
        });

        return () => {
            cancelled = true;
        };
    }, [history]);

    useEffect(() => {
        const missing = history.filter((item) => item.position > 5 && !(item.duration > 0) && item.fileName);
        if (!missing.length) return;
        let cancelled = false;
        const videos: HTMLVideoElement[] = [];

        missing.forEach((item) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.src = `${API_URL}/stream/file/stream?path=${encodeURIComponent(item.fileName || '')}`;
            videos.push(video);
            video.onloadedmetadata = () => {
                if (cancelled || !Number.isFinite(video.duration) || video.duration <= 0) return;
                recordWatchProgress({ ...item, duration: video.duration });
                video.removeAttribute('src');
                video.load();
            };
        });

        return () => {
            cancelled = true;
            videos.forEach((video) => {
                video.onloadedmetadata = null;
                video.removeAttribute('src');
                video.load();
            });
        };
    }, [history]);

    const items = history.filter((item) => !isMostlyWatched(item) && item.position > 5 && (item.kind === 'movie' || item.kind === 'episode'));
    if (currentQuery || items.length === 0) return null;

    return (
        <section className='relative z-0 mb-4 w-full min-w-0 overflow-hidden rounded-md bg-stone-950' aria-label='Continue watching'>
            <div className='relative py-3'>
                <h2 className='px-2 mb-2 text-xl font-semibold text-white'>Continue watching</h2>
                <div className='flex gap-3 overflow-x-auto px-2 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'>
                    {items.map((item) => {
                        const progress = item.duration > 0 ? Math.min(100, (item.position / item.duration) * 100) : 0;
                        const isEpisode = item.kind === 'episode';
                        const poster = posterForWatch(item);
                        const displayTitle = isEpisode
                            ? item.title
                            : (item.movie?.title || releaseTitle(item.title).title || item.title);
                        return (
                            <button
                                key={item.key}
                                type='button'
                                onClick={() => resumeItem(item, dispatch, navigate)}
                                title={`Continue ${displayTitle}`}
                                className={`group shrink-0 cursor-pointer text-left ${isEpisode ? 'w-[220px] sm:w-[260px]' : 'w-[120px] sm:w-[140px] md:w-[160px]'}`}
                            >
                                <span className={`relative block overflow-hidden rounded-sm bg-stone-800 ${isEpisode ? 'aspect-video' : 'aspect-[2/3]'}`}>
                                    {poster && (
                                        <img src={poster} alt='' className='h-full w-full object-cover' />
                                    )}
                                    <span className='absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100'>
                                        <span className='flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-lg'>
                                            <BsPlayFill className='ml-0.5 text-3xl' />
                                        </span>
                                    </span>
                                    {item.duration > 0 && (
                                        <span className='absolute bottom-0 left-0 right-0 z-10 h-1 bg-black/60'>
                                            <span className='block h-full bg-blue-500' style={{ width: `${progress}%` }} />
                                        </span>
                                    )}
                                </span>
                                <span className='mt-1 block text-sm text-white line-clamp-2'>{displayTitle}</span>
                                <span className='block text-xs text-stone-400'>
                                    {item.duration > 0
                                        ? `${formatTime(item.position)} / ${formatTime(item.duration)}`
                                        : `${formatTime(item.position)} in`}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export const LastWatched = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const currentQuery = useAppSelector(selectQuery);
    const [history, setHistory] = useState<WatchHistoryItem[]>(() => getLibrarySnapshot().history);

    useEffect(() => subscribeLibrary(() => setHistory(getLibrarySnapshot().history)), []);

    const item = history.find((entry) => entry.kind === 'movie' && isMostlyWatched(entry));
    if (currentQuery || !item) return null;

    const openFinished = () => {
        if (item.movie) {
            dispatch(setSelectedMovie(item.movie));
            dispatch(openModal('movie'));
            return;
        }
        resumeItem(item, dispatch, navigate);
    };

    return (
        <section className='relative z-0 mb-4 w-full min-w-0 overflow-hidden rounded-md bg-stone-950' aria-label='Last watched'>
            <div className='relative py-3'>
                <h2 className='px-2 mb-2 text-xl font-semibold text-white'>Last watched</h2>
                <div className='px-2 py-2'>
                    <button
                        type='button'
                        onClick={openFinished}
                        title={item.title}
                        className='group w-[120px] shrink-0 cursor-pointer text-left sm:w-[140px] md:w-[160px]'
                    >
                        <span className='relative block aspect-[2/3] overflow-hidden rounded-sm bg-stone-800'>
                            {posterForWatch(item) && (
                                <img src={posterForWatch(item)} alt='' className='h-full w-full object-cover' />
                            )}
                            <span className='absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100'>
                                <span className='flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-lg'>
                                    <BsPlayFill className='ml-0.5 text-3xl' />
                                </span>
                            </span>
                        </span>
                        <span className='mt-1 block line-clamp-2 text-sm text-white'>{item.title}</span>
                        <span className='block text-xs text-stone-400'>{item.year || 'Watched'}</span>
                    </button>
                </div>
            </div>
        </section>
    );
};

export const BecauseYouWatched = () => {
    const dispatch = useAppDispatch();
    const [history, setHistory] = useState<WatchHistoryItem[]>(() => getLibrarySnapshot().history);
    const [because, setBecause] = useState<Movie[]>([]);
    const [becauseTitle, setBecauseTitle] = useState('');

    useEffect(() => subscribeLibrary(() => setHistory(getLibrarySnapshot().history)), []);

    const loadBecause = useCallback(async (item?: WatchHistoryItem) => {
        if (!item?.movie?.id) {
            setBecause([]);
            setBecauseTitle('');
            return;
        }
        setBecauseTitle(item.title);
        try {
            const response = await getMovieSuggestions(item.movie.id);
            const movies = response.data?.data?.movies || response.data?.movies || [];
            setBecause((movies as Record<string, unknown>[]).map(toMovie));
        } catch (error) {
            console.error(error);
            setBecause([]);
        }
    }, []);

    useEffect(() => {
        const finished = history.find((item) => item.kind === 'movie' && isMostlyWatched(item) && item.movie?.id);
        const latest = history.find((item) => item.movie?.id);
        loadBecause(finished || latest);
    }, [history, loadBecause]);

    return (
        <MovieCarousel
            title={`Because you watched ${becauseTitle}`}
            movies={because}
            onOpenMovie={() => dispatch(openModal('movie'))}
        />
    );
};

const HomeRails = () => {
    const dispatch = useAppDispatch();
    const [recent, setRecent] = useState<Movie[]>([]);
    const [rated, setRated] = useState<Movie[]>([]);
    const [isLoadingRails, setIsLoadingRails] = useState(true);

    useEffect(() => {
        Promise.all([
            fetchRail('date_added').then(setRecent),
            fetchRail('rating').then(setRated),
        ]).catch((error) => console.error(error))
            .finally(() => setIsLoadingRails(false));
    }, []);

    return (
        <div className='w-full mb-6'>
            <MovieCarousel
                title="Recently added"
                movies={recent}
                isLoading={isLoadingRails}
                collapsible
                onOpenMovie={() => dispatch(openModal('movie'))}
            />

            <MovieCarousel
                title="Highest rated"
                movies={rated}
                isLoading={isLoadingRails}
                collapsible
                onOpenMovie={() => dispatch(openModal('movie'))}
            />
        </div>
    );
};

export default HomeRails;

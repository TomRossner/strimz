import { useCallback, useEffect, useState } from 'react';
import { BsPlayFill } from 'react-icons/bs';
import { Movie } from './MovieCard';
import MovieCarousel from './MovieCarousel';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectQuery } from '@/store/movies/movies.selectors';
import { openModal } from '@/store/modals/modals.slice';
import { getLibrarySnapshot, subscribeLibrary, WatchHistoryItem } from '@/services/library';
import { getMovieSuggestions } from '@/services/suggestions';
import axios from 'axios';
import { API_URL } from '@/utils/constants';
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
    }
};

export const ContinueWatching = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const currentQuery = useAppSelector(selectQuery);
    const [history, setHistory] = useState<WatchHistoryItem[]>(() => getLibrarySnapshot().history);

    useEffect(() => subscribeLibrary(() => setHistory(getLibrarySnapshot().history)), []);

    const items = history.filter((item) => !item.watched && item.position > 5 && (item.kind === 'movie' || item.kind === 'episode'));
    if (currentQuery || items.length === 0) return null;

    return (
        <section className='relative z-0 mb-4 w-full min-w-0 overflow-hidden rounded-md bg-stone-950' aria-label='Continue watching'>
            <div className='relative py-3'>
                <h2 className='px-2 mb-2 text-xl font-semibold text-white'>Continue watching</h2>
                <div className='flex gap-3 overflow-x-auto px-2 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'>
                    {items.map((item) => {
                        const progress = item.duration > 0 ? Math.min(100, (item.position / item.duration) * 100) : 0;
                        const isEpisode = item.kind === 'episode';
                        return (
                            <button
                                key={item.key}
                                type='button'
                                onClick={() => resumeItem(item, dispatch, navigate)}
                                title={`Continue ${item.title}`}
                                className={`group shrink-0 cursor-pointer text-left ${isEpisode ? 'w-[220px] sm:w-[260px]' : 'w-[120px] sm:w-[140px] md:w-[160px]'}`}
                            >
                                <span className={`relative block overflow-hidden rounded-sm bg-stone-800 ${isEpisode ? 'aspect-video' : 'aspect-[2/3]'}`}>
                                    {item.poster && (
                                        <img src={item.poster} alt='' className='h-full w-full object-cover' />
                                    )}
                                    <span className='absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100'>
                                        <span className='flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-lg'>
                                            <BsPlayFill className='ml-0.5 text-3xl' />
                                        </span>
                                    </span>
                                    {item.duration > 0 && (
                                        <span className='absolute bottom-0 left-0 right-0 h-1 bg-stone-700'>
                                            <span className='block h-full bg-blue-500' style={{ width: `${progress}%` }} />
                                        </span>
                                    )}
                                </span>
                                <span className='mt-1 block text-sm text-white line-clamp-2'>{item.title}</span>
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

const HomeRails = () => {
    const dispatch = useAppDispatch();
    const [recent, setRecent] = useState<Movie[]>([]);
    const [rated, setRated] = useState<Movie[]>([]);
    const [isLoadingRails, setIsLoadingRails] = useState(true);
    const [because, setBecause] = useState<Movie[]>([]);
    const [becauseTitle, setBecauseTitle] = useState('');
    const [history, setHistory] = useState<WatchHistoryItem[]>(() => getLibrarySnapshot().history);

    useEffect(() => subscribeLibrary(() => setHistory(getLibrarySnapshot().history)), []);

    useEffect(() => {
        Promise.all([
            fetchRail('date_added').then(setRecent),
            fetchRail('rating').then(setRated),
        ]).catch((error) => console.error(error))
            .finally(() => setIsLoadingRails(false));
    }, []);

    const loadBecause = useCallback(async (item?: WatchHistoryItem) => {
        if (!item?.movie?.id) {
            setBecause([]);
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
        const latest = history.find((item) => item.movie?.id);
        loadBecause(latest);
    }, [history, loadBecause]);

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

            <MovieCarousel
                title={`Because you watched ${becauseTitle}`}
                movies={because}
                onOpenMovie={() => dispatch(openModal('movie'))}
            />
        </div>
    );
};

export default HomeRails;

import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import Container from '@/components/Container';
import Page from '@/components/Page';
import PageDescription from '@/components/PageDescription';
import PageTitle from '@/components/PageTitle';
import { clearHistory, getLibrarySnapshot, removeHistoryItem, subscribeLibrary, WatchHistoryItem } from '@/services/library';
import { useAppDispatch } from '@/store/hooks';
import { openModal } from '@/store/modals/modals.slice';
import { setSelectedMovie } from '@/store/movies/movies.slice';
import { formatTime } from '@/utils/formatTime';
import React, { useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';

const HistoryPage = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { history } = useSyncExternalStore(subscribeLibrary, getLibrarySnapshot);

    const resume = (item: WatchHistoryItem) => {
        if (item.movie) {
            dispatch(setSelectedMovie(item.movie));
        }
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
        if (item.movie) {
            dispatch(openModal('movie'));
        }
    };

    return (
        <Page>
            <Container id='historyPage' className='grow'>
                <PageTitle>
                    <BackButton cb={() => navigate(-1)} />
                    <span className='grow -mt-1'>History</span>
                    {history.length > 0 && (
                        <Button onClick={clearHistory} className='text-sm bg-stone-800'>Clear</Button>
                    )}
                </PageTitle>
                <PageDescription>Movies and episodes you have started.</PageDescription>

                {history.length === 0 ? (
                    <p className='text-xl font-semibold text-stone-700 text-center mt-10'>Nothing played yet</p>
                ) : (
                    <ul className='flex flex-col gap-2 w-full'>
                        {history.map((item) => (
                            <li key={item.key} className='flex gap-3 items-center bg-stone-800 p-2 rounded-sm'>
                                {item.poster && (
                                    <img src={item.poster} alt='' className={`object-cover rounded-sm ${item.kind === 'episode' ? 'h-12 w-20' : 'w-12 aspect-[2/3]'}`} />
                                )}
                                <div className='grow min-w-0'>
                                    <p className='text-white truncate'>{item.title}</p>
                                    <p className='text-xs text-stone-400'>
                                        {item.watched ? 'Watched' : item.duration ? `${formatTime(item.position)} / ${formatTime(item.duration)}` : 'In progress'}
                                        {item.kind === 'episode' ? ' · Episode' : ''}
                                    </p>
                                </div>
                                <Button onClick={() => resume(item)} className='bg-blue-500 hover:bg-blue-400 text-sm'>Resume</Button>
                                <Button onClick={() => removeHistoryItem(item.key)} className='bg-stone-700 text-sm'>Remove</Button>
                            </li>
                        ))}
                    </ul>
                )}
            </Container>
        </Page>
    );
};

export default HistoryPage;

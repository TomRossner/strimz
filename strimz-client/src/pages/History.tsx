import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import Container from '@/components/Container';
import Dialog from '@/components/Dialog';
import Page from '@/components/Page';
import PageDescription from '@/components/PageDescription';
import PageTitle from '@/components/PageTitle';
import { clearHistory, getLibrarySnapshot, isMostlyWatched, removeHistoryItem, subscribeLibrary, WatchHistoryItem } from '@/services/library';
import { useAppDispatch } from '@/store/hooks';
import { openModal } from '@/store/modals/modals.slice';
import { setSelectedMovie } from '@/store/movies/movies.slice';
import { API_URL } from '@/utils/constants';
import { posterForWatch } from '@/utils/downloadsCache';
import { formatTime } from '@/utils/formatTime';
import React, { useState, useSyncExternalStore } from 'react';
import { BsPlayFill, BsTrash } from 'react-icons/bs';
import { RxCross2 } from 'react-icons/rx';
import { useNavigate } from 'react-router-dom';

const HistoryPage = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { history } = useSyncExternalStore(subscribeLibrary, getLibrarySnapshot);
    const [confirmClear, setConfirmClear] = useState(false);
    const [pendingRemove, setPendingRemove] = useState<WatchHistoryItem | null>(null);
    const confirmOpen = confirmClear || pendingRemove !== null;

    const closeConfirm = () => {
        setConfirmClear(false);
        setPendingRemove(null);
    };

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
        if (item.fileName) {
            const streamUrl = `${API_URL}/stream/file/stream?path=${encodeURIComponent(item.fileName)}`;
            const params = new URLSearchParams({
                src: streamUrl,
                title: item.title,
            });
            if (item.poster) params.set('poster', item.poster);
            navigate(`/watch-file?${params.toString()}`);
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
                        <Button onClick={() => setConfirmClear(true)} className='gap-1.5 text-sm bg-stone-800'>
                            <BsTrash />
                            Clear
                        </Button>
                    )}
                </PageTitle>
                <PageDescription>Movies and episodes you have started.</PageDescription>

                {history.length === 0 ? (
                    <p className='text-xl font-semibold text-stone-700 text-center mt-10'>Nothing played yet</p>
                ) : (
                    <ul className='flex flex-col gap-2 w-full'>
                        {history.map((item) => {
                            const poster = posterForWatch(item);
                            return (
                            <li key={item.key} className='flex gap-3 items-center bg-stone-800 p-2 rounded-sm'>
                                {poster && (
                                    <img src={poster} alt='' className={`object-cover rounded-sm ${item.kind === 'episode' ? 'h-12 w-20' : 'w-12 aspect-[2/3]'}`} />
                                )}
                                <div className='grow min-w-0'>
                                    <p className='text-white truncate'>{item.title}</p>
                                    <p className='text-xs text-stone-400'>
                                        {isMostlyWatched(item) ? 'Watched' : item.duration ? `${formatTime(item.position)} / ${formatTime(item.duration)}` : 'In progress'}
                                        {item.kind === 'episode' ? ' · Episode' : ''}
                                    </p>
                                </div>
                                <Button onClick={() => resume(item)} className='gap-1.5 bg-blue-500 hover:bg-blue-400 text-sm'>
                                    <BsPlayFill />
                                    Resume
                                </Button>
                                <Button onClick={() => setPendingRemove(item)} className='gap-1.5 bg-stone-700 text-sm'>
                                    <BsTrash />
                                    Remove
                                </Button>
                            </li>
                            );
                        })}
                    </ul>
                )}
            </Container>
            {confirmOpen && (
                <button
                    type='button'
                    aria-label='Close'
                    className='fixed inset-0 z-20 cursor-pointer bg-black/40 backdrop-blur-sm'
                    onClick={closeConfirm}
                />
            )}
            <Dialog
                isOpen={confirmOpen}
                size='small'
                title={confirmClear ? 'Clear history' : 'Remove from history'}
                className='z-30 flex-col px-2'
            >
                <p className='px-2 text-white'>
                    {confirmClear
                        ? 'Are you sure you want to delete your watch history?'
                        : `Are you sure you want to remove ${pendingRemove?.title} from your watch history?`}
                </p>
                <div className='flex w-full justify-end gap-2 py-2'>
                    <Button onClick={closeConfirm} className='gap-1.5 bg-stone-800'>
                        <RxCross2 />
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            if (confirmClear) clearHistory();
                            else if (pendingRemove) removeHistoryItem(pendingRemove.key);
                            closeConfirm();
                        }}
                        className='gap-1.5 bg-red-700 hover:bg-red-600'
                    >
                        <BsTrash />
                        {confirmClear ? 'Delete history' : 'Remove'}
                    </Button>
                </div>
            </Dialog>
        </Page>
    );
};

export default HistoryPage;

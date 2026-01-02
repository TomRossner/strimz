import React from 'react';
import Dialog from './Dialog';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectPlayTorrentPrompt } from '@/store/modals/modals.selectors';
import { selectExternalTorrent } from '@/store/movies/movies.selectors';
import Button from './Button';
import { useNavigate } from 'react-router-dom';
import { closeModal } from '@/store/modals/modals.slice';
import { setExternalTorrent } from '@/store/movies/movies.slice';

const PlayTorrentPrompt = () => {
    const isOpen = useAppSelector(selectPlayTorrentPrompt);
    const torrent = useAppSelector(selectExternalTorrent);

    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const handleClose = () => {
        dispatch(closeModal('playTorrentPrompt'));
        dispatch(setExternalTorrent(null));
    }

    const handlePlay = () => {
        if (!torrent) return;

        dispatch(closeModal('playTorrentPrompt'));
        dispatch(closeModal('error'));
        navigate(`/stream/${torrent.hash}?hash=${torrent.hash}&title=${torrent.title}`);
    }

  return (
    <Dialog
        isOpen={isOpen && !!torrent}
        size='medium'
        title={`Play external torrent?`}
        className='z-40'
    >
        <div className='w-full flex flex-col gap-4 p-2'>
            <p className='text-stone-400 italic'>Do you want to play the following torrent:</p>
            <span className='text-white font-semibold px-2 py-0.5 bg-stone-700 rounded-sm'>{torrent?.title}</span>

            <div className='flex gap-1 items-center justify-end w-full'>
                <Button onClick={handlePlay} className='bg-green-600 hover:bg-green-500'>Yes, continue</Button>
                <Button onClick={handleClose} className='hover:bg-stone-600'>No</Button>
            </div>
        </div>
    </Dialog>
  )
}

export default PlayTorrentPrompt;
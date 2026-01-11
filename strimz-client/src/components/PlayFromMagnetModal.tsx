import React, { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Dialog from './Dialog';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectPlayFromMagnetModal } from '@/store/modals/modals.selectors';
import CloseButton from './CloseButton';
import { closeModal, openModal } from '@/store/modals/modals.slice';
import Button from './Button';
import PageDescription from './PageDescription';
import { selectSettings } from '@/store/settings/settings.selectors';
import { getTorrentData } from '@/services/movies';
import { setError, setExternalTorrent } from '@/store/movies/movies.slice';
import LoadingIcon from './LoadingIcon';
import { IoWarningOutline, IoCloseCircle } from 'react-icons/io5';
import { MAGNET_REGEX } from '@/utils/constants';

const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

const PlayFromMagnetModal = () => {
    const isOpen = useAppSelector(selectPlayFromMagnetModal);
    const dispatch = useAppDispatch();

    const settings = useAppSelector(selectSettings);

    const inputRef = useRef<HTMLInputElement>(null);

    const [magnetLink, setMagnetLink] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');

    const handleChange = (ev: ChangeEvent<HTMLInputElement>) => {
        setMagnetLink(ev.target.value);
        setErrorMessage(''); // Clear error when user types
    }

    const handleSubmit = useCallback((ev: FormEvent<HTMLFormElement>) => {
        ev.preventDefault();

        setIsLoading(true);
        setErrorMessage(''); // Clear previous errors

        if (!magnetLink) return;

        const getTorrentDataFromMagnetLink = async (magnetLink: string) => {
            if (!settings.downloadsFolderPath.length) {
                return;
            }

            // Create a timeout promise
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => {
                    reject(new Error('Request timeout: The operation took too long to complete. Please try again.'));
                }, REQUEST_TIMEOUT_MS);
            });

            try {
                // Race between the actual request and the timeout
                const {data: {hash, title, imdbCode}} = await Promise.race([
                    getTorrentData(magnetLink, settings.downloadsFolderPath),
                    timeoutPromise
                ]);
                
                dispatch(setExternalTorrent({hash, title, imdbCode}));

                dispatch(closeModal('playFromMagnet'));
                dispatch(openModal('playTorrentPrompt'));
            } catch (error) {
                const errorMsg = error instanceof Error 
                    ? error.message 
                    : typeof error === 'string' 
                        ? error 
                        : 'An error occurred while fetching torrent data.';
                
                setErrorMessage(errorMsg);
                dispatch(setError(errorMsg));
            } finally {
                setIsLoading(false);
            }
        }

        getTorrentDataFromMagnetLink(magnetLink);
    }, [magnetLink, dispatch, settings?.downloadsFolderPath]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }

        return () => {
            setMagnetLink('');
            setErrorMessage(''); // Clear error when modal closes
        }
    }, [isOpen]);

  return (
    <Dialog isOpen={isOpen} size='medium' title='Play from Magnet Link' className='flex-col px-2'>
        <CloseButton onClose={() => dispatch(closeModal('playFromMagnet'))} className='md:block absolute p-1 text-base' />
        <PageDescription className='self-start mb-1 text-stone-400'>A magnet link is a URL that lets you download files from peers using BitTorrent, based on a unique file hash.</PageDescription>

        <form onSubmit={handleSubmit} className='flex w-full items-center flex-col gap-3 py-3'>
            <label htmlFor="magnetLink" className='self-start text-white'>Enter magnet link:</label>
            <input
                type="text"
                name="magnetLink"
                id="magnetLink"
                readOnly={isLoading}
                disabled={isLoading}
                ref={inputRef}
                placeholder="magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&dn=Example+File+Name&tr=udp://tracker.example.com:80/announce"
                value={magnetLink}
                onChange={handleChange}
                className='bg-white rounded-sm px-2 py-0.5 text-black w-full outline-none placeholder:text-sm placeholder:italic disabled:text-slate-400'
            />

            {magnetLink && !MAGNET_REGEX.test(magnetLink) && (
                <p className='flex items-center gap-2 text-yellow-300 px-2 italic rounded-sm w-full text-sm font-normal'>
                    <IoWarningOutline className='text-lg' />
                    Invalid magnet link. Make sure it starts with "magnet:?xt=urn:btih:" and includes a valid hash.
                </p>
            )}

            {errorMessage && (
                <p className='flex items-center gap-2 text-red-400 px-2 italic rounded-sm w-full text-sm font-normal'>
                    <IoCloseCircle className='text-lg' />
                    {errorMessage}
                </p>
            )}
            
            <div className='flex w-full items-center justify-end gap-1'>
                <Button
                    type='submit'
                    disabled={!MAGNET_REGEX.test(magnetLink) || isLoading}
                    className='bg-blue-500 hover:bg-blue-400 w-1/3 disabled:text-white disabled:bg-blue-300 disabled:hover:bg-blue-300'
                >
                    {isLoading
                        ? <p className='flex items-center gap-2'><LoadingIcon size={20} /> Loading...</p> 
                        : 'Submit'
                    }
                </Button>

                <Button
                    type='button'
                    onClick={() => dispatch(closeModal('playFromMagnet'))}
                    className='hover:bg-stone-600'
                >
                    Cancel
                </Button>
            </div>
        </form>
    </Dialog>
  )
}

export default PlayFromMagnetModal;
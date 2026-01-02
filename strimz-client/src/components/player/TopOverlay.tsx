import React, { RefObject } from 'react';
import BackButton from '../BackButton';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { closeModal, openModal } from '@/store/modals/modals.slice';
import Button from '../Button';
import { BsInfoCircle } from 'react-icons/bs';
import MovieInfoPanel from './InfoPanel';
import { selectExternalTorrent, selectSelectedTorrent } from '@/store/movies/movies.selectors';
import { setAvailableSubtitlesLanguages, setSubtitleLang, setSubtitleFilePath, setIsSubtitlesEnabled, setSubtitleDelay, setVttSubtitlesContent, setSelectedMovie } from '@/store/movies/movies.slice';
import { selectMovieDownloadInfoPanel } from '@/store/modals/modals.selectors';
import { DownloadProgressData } from '@/utils/types';
import { pauseDownload } from '@/services/movies';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

interface TopOverlayProps {
    isVisible: boolean;
    title: string;
    videoDimensions: { height: number, width: number };
    downloadInfo: DownloadProgressData | null;
    videoRef: RefObject<HTMLVideoElement>
}

const TopOverlay = ({isVisible, title, videoDimensions: { height }, downloadInfo, videoRef}: TopOverlayProps) => {
    const dispatch = useAppDispatch();
    const externalTorrent = useAppSelector(selectExternalTorrent);
    const isInfoPanelOpen = useAppSelector(selectMovieDownloadInfoPanel);
    const selectedTorrent = useAppSelector(selectSelectedTorrent);
    const [searchParams] = useSearchParams();
    const hash = searchParams.get('hash'); // Get hash from URL params

    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from;
    
  return (
    <div
        className={`
            absolute
            top-0
            text-lg
            font-medium
            text-white
            transition-all
            duration-300
            py-4
            px-3
            w-full
            flex
            justify-between
            gap-2
            z-[9999]
        `}
        style={{
            background: 'linear-gradient(to bottom, black 0%, transparent 100%)',
            opacity: isVisible ? 1 : 0,
            pointerEvents: isVisible ? 'all' : 'none',
            willChange: 'opacity',
            height: `${height as number * 0.15}px`,
        }}
    >
        <p className='flex items-start gap-2'>
            <BackButton
                cb={async () => {
                    if (externalTorrent) return;

                    const video = videoRef.current;
                    if (video) {
                        video.pause();
                        video.src = "";
                        video.load();
                    }

                    // Clear all subtitle state before navigating away
                    // Clear selectedMovie only if playing from Downloads page
                    dispatch(setAvailableSubtitlesLanguages([]));
                    dispatch(setSubtitleLang(null));
                    dispatch(setSubtitleFilePath(null));
                    dispatch(setIsSubtitlesEnabled(false));
                    dispatch(setSubtitleDelay(0));
                    dispatch(setVttSubtitlesContent(null));
                    if (from === '/downloads') {
                        dispatch(setSelectedMovie(null));
                    }

                    // Pause download if we have a hash (torrent-based download)
                    // Try hash from URL params first, then downloadInfo, then selectedTorrent
                    const downloadHash = hash || downloadInfo?.hash || selectedTorrent?.hash;
                    if (downloadHash) {
                        try {
                            await pauseDownload(downloadHash);
                        } catch (error) {
                            console.error('Error pausing download:', error);
                        }
                    }
                    
                    if (from === '/') {
                        navigate('/', {
                            state: {
                                from: '/stream/:slug'
                            }
                        });
                        dispatch(openModal('movie'));
                    } else {
                        navigate(-1);
                    }
                }}
            />
            {title}
        </p>

        <div className='flex gap-4'>
            {selectedTorrent?.quality && (
                <span>{selectedTorrent.quality === '2160p' ? '4K' : selectedTorrent.quality}</span>
            )}

            {/* Only show info button if we have download info (torrent-based download) */}
            {downloadInfo && (
                <Button
                    title='Info'
                    onClick={() => isInfoPanelOpen ? dispatch(closeModal('movieDownloadInfo')) : dispatch(openModal('movieDownloadInfo'))}
                    className='w-9 h-9 bg-transparent aspect-square justify-center p-0 text-white text-2xl hover:bg-stone-800 duration-200 cursor-pointer'
                >
                    <BsInfoCircle />
                </Button>
            )}
        </div>

        <MovieInfoPanel
            isOpen={isInfoPanelOpen}
            downloadInfo={downloadInfo}
        />
    </div>
  )
}

export default TopOverlay;
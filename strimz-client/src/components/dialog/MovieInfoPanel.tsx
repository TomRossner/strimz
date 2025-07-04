import React, { useEffect, useMemo, useState } from 'react';
import TitleWrapper from './TitleWrapper';
import { Movie } from '../MovieCard';
import { DiskSpaceInfo, Torrent } from '../../utils/types';
import QualitySelector from './QualitySelector';
import TorrentSelector from './TorrentSelector';
import FileSize from './FileSize';
import PlayButton from './PlayButton';
import MobileCoverSpacer from './MobileCoverSpacer';
import Metadata from './Metadata';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/store/hooks';
import { setSelectedTorrent, setSubtitleFilePath } from '@/store/movies/movies.slice';
import SubtitlesSelector from './SubtitlesSelector';

interface MovieInfoPanelProps {
    movie: Movie;
    close: () => void;
}

const MovieInfoPanel = ({movie, close}: MovieInfoPanelProps) => {
    const {
        torrents,
        slug,
        background_image,
        title
    } = movie;

    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [hash, setHash] = useState<string>('');
    const [selectedQuality, setSelectedQuality] = useState<string>('');

    const selectedTorrent: Torrent | null = useMemo(() => {
        const torrents = movie?.torrents as Torrent[];

        if (hash && selectedQuality) {
            const torrent: Torrent | undefined = torrents.find(t => (t.quality === selectedQuality) && (t.hash === hash));
            
            if (torrent) {
                dispatch(setSelectedTorrent(torrent));
            }

            return torrent || null;
        }

        return null;
    }, [hash, selectedQuality, movie?.torrents, dispatch]);

    const [diskSpace, setDiskSpace] = useState<DiskSpaceInfo | null>(null);

    const fileSizeInBytes = selectedTorrent ? selectedTorrent.size_bytes : 0;

    const hasEnoughSpace = diskSpace
        ? diskSpace.free >= fileSizeInBytes
        : null;

    const handleClose = () => {
        close();
        setHash('');
        setSelectedQuality('');
        dispatch(setSubtitleFilePath(null));
    }

    const handleTorrentSelect = (hash: string) => {
        setHash(hash);
    }

    const handleQualityChange = (quality: string) => {
        setSelectedQuality(quality);
        setHash('');
    }

    const handlePlay = () => {
        navigate(`/watch/${slug}?hash=${hash}&title=${title}&poster=${background_image}`);
    }

    useEffect(() => {
        if (!selectedTorrent) return;

        const getDiskSpace = async () => {
            setDiskSpace(null);
            
            try {
                const diskInfo = await window.electronAPI.checkDiskSpace();
                setDiskSpace(diskInfo as DiskSpaceInfo);
            } catch (err) {
                console.error('Failed to get disk space', err);
            }
        }

        getDiskSpace();
    }, [selectedTorrent]);

    useEffect(() => {
        if (!selectedQuality) return;
        setDiskSpace(null);
    }, [selectedQuality]);
    
  return (
    <div className='min-h-full overflow-y-auto md:relative w-full flex flex-col justify-between absolute top-0 md:grow md:justify-center'>
        <MobileCoverSpacer />

        <div className='flex flex-col inset-0 bg-gradient-to-t from-stone-950 from-30% md:from-40% md:grow px-2 relative'>
            <TitleWrapper onClose={handleClose} title={title} />
            <Metadata movie={movie} />

            <div className='py-1 flex w-full gap-3 md:h-full h-32 flex-col'>
                <QualitySelector selected={selectedQuality} torrents={torrents} handleSelect={handleQualityChange} />
                <TorrentSelector handleSelect={handleTorrentSelect} quality={selectedQuality} torrents={torrents} hash={hash} />
            </div>

            <SubtitlesSelector />
            
            <FileSize size={selectedTorrent?.size} selectedTorrent={selectedTorrent} />

            <div className='flex w-full items-center justify-center flex-col py-1 gap-1'>
                <PlayButton
                    isDisabled={!selectedTorrent || !selectedQuality || hasEnoughSpace === false || !diskSpace}
                    onPlay={handlePlay}
                    diskSpaceInfo={{ hasEnoughSpace, fileSizeInBytes, freeBytes: diskSpace?.free ?? 0 }}
                />
            </div>
        </div>
    </div>
  )
}

export default MovieInfoPanel;
import React, { ChangeEvent, useMemo, useState } from 'react';
import TitleWrapper from './TitleWrapper';
import { Movie } from '../MovieCard';
import { Torrent } from '../../utils/types';
import QualitySelector from './QualitySelector';
import TorrentSelector from './TorrentSelector';
import FileSize from './FileSize';
import PlayButton from './PlayButton';
import MobileCoverSpacer from './MobileCoverSpacer';
import Metadata from './Metadata';
import { useNavigate } from 'react-router-dom';

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
    const [hash, setHash] = useState<string>('');
    const [selectedQuality, setSelectedQuality] = useState<string>('');

    const selectedTorrent: Torrent | null = useMemo(() => {
        const torrents = movie?.torrents as Torrent[];

        if (hash && selectedQuality) {
            return torrents.find(t => (t.quality === selectedQuality) && (t.hash === hash)) as Torrent ?? null;
        }

        return null;
    }, [hash, selectedQuality, movie?.torrents]);


    const handleClose = () => {
        close();
        setHash('');
        setSelectedQuality('');
    }

    const handleTorrentSelect = (hash: string) => {
        setHash(hash);
    }

    const handleQualityChange = (ev: ChangeEvent<HTMLSelectElement>) => {
        const {currentTarget: {value}} = ev;

        setSelectedQuality(value);
        setHash('');
    }

    const handlePlay = () => {
        navigate(`/watch/${slug}?hash=${hash}&title=${title}&poster=${background_image}`);
    }

  return (
    <div className='min-h-full overflow-y-auto md:relative w-full flex flex-col justify-between absolute top-0 md:grow md:justify-center'>
        <MobileCoverSpacer />

        <div className='flex flex-col inset-0 bg-gradient-to-t from-stone-950 from-30% md:from-40% md:grow px-2'>
            <TitleWrapper onClose={handleClose} title={title} />
            <Metadata movie={movie} />

            <div className='py-2 flex w-full gap-4 md:h-full min-h-32 justify-between md:flex-row flex-col'>
                <QualitySelector selected={selectedQuality} torrents={torrents} handleSelect={handleQualityChange} />
                <TorrentSelector handleSelect={handleTorrentSelect} quality={selectedQuality} torrents={torrents} hash={hash} />
            </div>

            <FileSize size={selectedTorrent?.size} />

            <div className='flex w-full items-center justify-center flex-col py-1 gap-1'>
                <p className='italic w-full mx-auto text-white font-thin md:text-center text-sm rounded-sm'>Note: Higher quality torrents may take more time to load.</p>

                <PlayButton isDisabled={!selectedTorrent || !selectedQuality} onPlay={handlePlay} />
            </div>
        </div>
    </div>
  )
}

export default MovieInfoPanel;
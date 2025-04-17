import { Torrent } from '../../utils/types';
import React from 'react';
import { BiMovie } from 'react-icons/bi';
import { twMerge } from 'tailwind-merge';

interface TorrentSelectorProps {
    torrents: object[];
    quality: string;
    handleSelect: (hash: string) => void;
    hash: string;
}

const TorrentSelector = ({torrents, quality, handleSelect, hash}: TorrentSelectorProps) => {
  return (
    <div className='flex flex-col gap-5 w-full'>
        <p className='text-white flex items-center gap-1'>
            <BiMovie className='text-xl' />
            Available torrents
        </p>

        <div className='flex flex-col gap-2 grow w-full max-h-[60px] overflow-y-auto'>
            {(torrents as Torrent[])
                .filter(t => t.quality === quality)
                .map(t => (
                    <div key={t.hash} className='flex gap-2 items-center w-full'>
                        <input
                            hidden
                            type="radio"
                            name="torrents"
                            id={t.hash}
                            onChange={() => handleSelect(t.hash)}
                            value={t.hash}
                        />

                        <label
                            htmlFor={t.hash}
                            className={twMerge(`
                                cursor-pointer
                                w-full
                                text-center
                                rounded-sm
                                bg-stone-800
                                text-white
                                ${t.hash === hash && 'bg-blue-400'}
                            `)}
                        >
                            {t.peers} peers / {t.seeds} seeds
                        </label>
                    </div>
                ))
            }
        </div>
    </div>
  )
}

export default TorrentSelector;
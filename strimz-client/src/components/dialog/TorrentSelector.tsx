import { Torrent } from '../../utils/types';
import React from 'react';
import { BiMovie } from 'react-icons/bi';
import { BsInfoCircle } from 'react-icons/bs';
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
            <span className='flex items-center gap-2'>
                Available torrents
                <BsInfoCircle className='text-blue-500' title='Higher seed and peer counts mean faster, more reliable downloads.' />
            </span>
        </p>

        <div className='flex flex-col gap-2 grow w-full max-h-[75px] overflow-y-auto'>
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
                                text-white
                                p-1
                                ${t.hash === hash ? 'bg-blue-500 hover:bg-blue-400' : 'bg-stone-800 hover:bg-stone-700'}
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
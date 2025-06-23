import { Qualities } from '../../utils/qualities';
import { Torrent } from '../../utils/types';
import React, { ChangeEvent } from 'react';
import { BsInfoCircle } from 'react-icons/bs';
import { MdOutlineHighQuality } from 'react-icons/md';
import { twMerge } from 'tailwind-merge';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

const getMovieQualities = (torrents: Torrent[]): string[] => {
    const qualities = new Set<string>();

    for (const torrent of torrents) {
        if (!qualities.has(torrent.quality)) {
            qualities.add(torrent.quality);
        }
    }

    return Array.from(qualities);
}

interface QualitySelectorProps {
    torrents: object[];
    handleSelect: (ev: ChangeEvent<HTMLSelectElement>) => void;
    selected: string;
}

const QualitySelector = ({torrents, handleSelect, selected}: QualitySelectorProps) => {
  return (
    <div className='flex flex-col gap-5 w-full'>
        <p className='text-white flex items-center gap-1'>
            <MdOutlineHighQuality className='text-2xl' />
            <span className='flex items-center gap-2'>
                Quality
                <Tooltip delayDuration={200}>
                    <TooltipTrigger className='text-blue-500'>
                        <BsInfoCircle />
                    </TooltipTrigger>
                    <TooltipContent>Higher quality torrents may take more time to load.</TooltipContent>
                </Tooltip>
            </span>
        </p>

        <select
            name="qualities"
            id="qualities"
            onChange={handleSelect}
            className='cursor-pointer min-w-fit p-1 w-full outline-none rounded-sm text-white bg-stone-800 hover:bg-stone-700'
        >
            <option className='text-white cursor-pointer' value={undefined}>Select quality</option>
            {(getMovieQualities(torrents as Torrent[]))
                .toReversed()
                .map(q => (
                    <option
                        key={q}
                        value={q}
                        className={twMerge(`
                            ${q === selected
                                ? 'bg-blue-500 text-white'
                                : 'bg-stone-800 text-white'
                            }
                        `)}
                    >
                        {q === '2160p' ? Qualities['4K'] : q}
                    </option>
                ))
            }
        </select>
    </div>
  )
}

export default QualitySelector;
import { QUALITIES, Qualities } from '../../utils/qualities';
import { Torrent } from '../../utils/types';
import React from 'react';
import { BsInfoCircle } from 'react-icons/bs';
import { MdOutlineHighQuality } from 'react-icons/md';
import { twMerge } from 'tailwind-merge';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

const getMovieQualities = (torrents: Torrent[]): string[] => {
    const qualities = new Set<string>();

    if (!torrents || !Array.isArray(torrents)) {
        return [];
    }

    for (const torrent of torrents) {
        if (torrent && torrent.quality) {
            if (!qualities.has(torrent.quality)) {
                qualities.add(torrent.quality);
            }
        }
    }

    return Array.from(qualities);
}

interface QualitySelectorProps {
    torrents: object[];
    handleSelect: (quality: string) => void;
    selected: string;
}

const QualitySelector = ({torrents, handleSelect, selected}: QualitySelectorProps) => {
  return (
    <div className='flex flex-col gap-2 w-full'>
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

        <div className='min-w-fit p-1 w-full rounded-sm text-white flex items-center gap-1'>
            {Array.from(Object.values(QUALITIES))
                .map(q => {
                    const availableQualities = getMovieQualities((torrents || []) as Torrent[]);
                    const isAvailable: boolean = availableQualities.some(qual => qual === q);
                    return (
                        <div key={q} className='flex gap-2 items-center w-fit rounded-md'>
                            <input
                                hidden
                                type="radio"
                                name="qualities"
                                id={q}
                                onChange={(ev) => isAvailable ? handleSelect(ev.target.value) : undefined}
                                value={q}
                            />

                            <label
                                htmlFor={q}
                                className={twMerge(`
                                    cursor-pointer
                                    w-full
                                    text-center
                                    rounded-sm
                                    text-white
                                    px-2
                                    py-1
                                    flex
                                    items-center
                                    justify-between
                                    ${q === selected ? 'bg-blue-500 hover:bg-blue-400' : 'bg-stone-800 hover:bg-stone-700'}
                                `)}
                                style={{
                                    pointerEvents: isAvailable ? 'all' : 'none',
                                    opacity: isAvailable ? '1' : '0.5',
                                }}
                            >
                                <p className='truncate text-sm font-light'>{q.toLowerCase() === '2160p' ? Qualities['4K'] : q}</p>
                            </label>
                        </div>
                    )
                })
            }
        </div>
    </div>
  )
}

export default QualitySelector;
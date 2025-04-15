import { Qualities } from '../../utils/qualities'
import { Torrent } from '../../utils/types'
import React, { ChangeEvent } from 'react'
import { MdOutlineHighQuality } from 'react-icons/md'
import { twMerge } from 'tailwind-merge'

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
            Quality
        </p>

        <select
            name="qualities"
            id="qualities"
            onChange={handleSelect}
            className='min-w-fit w-full outline-none rounded-sm text-black bg-white'
        >
            <option value={undefined}>Select quality</option>
            {(getMovieQualities(torrents as Torrent[]))
                .toReversed()
                .map(q => (
                    <option
                        key={q}
                        value={q}
                        className={twMerge(`
                            ${q === selected
                                ? 'bg-blue-500 text-white'
                                : 'text-black'
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

export default QualitySelector
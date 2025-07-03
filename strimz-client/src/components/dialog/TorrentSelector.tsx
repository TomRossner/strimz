import { Torrent } from '../../utils/types';
import React from 'react';
import { BiMovie } from 'react-icons/bi';
import { BsInfoCircle } from 'react-icons/bs';
import { twMerge } from 'tailwind-merge';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { useAppSelector } from '@/store/hooks';
import { selectMovie } from '@/store/movies/movies.selectors';
import { Qualities } from '@/utils/qualities';

interface TorrentSelectorProps {
    torrents: object[];
    quality: string;
    handleSelect: (hash: string) => void;
    hash: string;
}

const TorrentSelector = ({torrents, quality, handleSelect, hash}: TorrentSelectorProps) => {
    const movie = useAppSelector(selectMovie);
  return (
    <div className='flex flex-col gap-2 w-full'>
        <p className='text-white flex items-center gap-1'>
            <BiMovie className='text-xl' />
            <span className='flex items-center gap-2'>
                Available torrents
                <Tooltip delayDuration={200}>
                    <TooltipTrigger className='text-blue-500'>
                        <BsInfoCircle />
                    </TooltipTrigger>
                    <TooltipContent>Higher seed and peer counts mean faster, more reliable downloads.</TooltipContent>
                </Tooltip>
            </span>
        </p>

        <ol className='flex flex-col gap-2 w-full h-auto max-h-[95px] overflow-y-auto'>
            {torrents.length && quality ? (
                <>
                {(torrents as Torrent[])
                    .filter(t => t.quality === quality)
                    .map((t, idx) => (
                        <li key={t.hash} className='flex gap-2 items-center w-full'>
                            <Tooltip delayDuration={1000}>
                                <TooltipTrigger className='w-full'>
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
                                            flex
                                            items-center
                                            justify-between
                                            gap-2
                                            ${t.hash === hash ? 'bg-blue-500 hover:bg-blue-400' : 'bg-stone-800 hover:bg-stone-700'}
                                        `)}
                                    >
                                        <p className='truncate text-sm font-light'>{idx + 1}. {movie?.title} - {t.quality.toLowerCase() === '2160p' ? Qualities['4K'] : t.quality}</p>
                                        <p className='text-nowrap font-medium'>{t.peers} peers / {t.seeds} seeds</p>
                                    </label>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className='text-sm font-light'>
                                        {movie?.title} - {t.quality.toLowerCase() === '2160p' ? Qualities['4K'] : t.quality} - {t.peers} peers / {t.seeds} seeds
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </li>
                    ))
                }
                </>
            ) : (
                <p className='italic font-light text-stone-500 px-3 text-[15px]'>Please select a quality</p>
            )}
        </ol>
    </div>
  )
}

export default TorrentSelector;
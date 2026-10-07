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
    title?: string;
    idPrefix?: string;
}

const TorrentSelector = ({torrents, quality, handleSelect, hash, title, idPrefix = ''}: TorrentSelectorProps) => {
    const movie = useAppSelector(selectMovie);
    const displayTitle = title || movie?.title;
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

        <ol className='flex flex-col gap-2 w-full h-auto max-h-[160px] overflow-y-auto'>
            {torrents && Array.isArray(torrents) && torrents.length > 0 && quality ? (
                <>
                {(torrents as Torrent[])
                    .filter(t => t && t.quality === quality)
                    .map((t, idx) => (
                        <li key={t.hash} className='flex gap-2 items-center w-full'>
                            <Tooltip delayDuration={1000}>
                                <TooltipTrigger className='w-full'>
                                    <input
                                        hidden
                                        type="radio"
                                        name={`${idPrefix}torrents`}
                                        id={`${idPrefix}${t.hash}`}
                                        onChange={() => handleSelect(t.hash)}
                                        value={t.hash}
                                    />

                                    <label
                                        htmlFor={`${idPrefix}${t.hash}`}
                                        className={twMerge(`
                                            cursor-pointer
                                            w-full
                                            text-left
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
                                        <span className={twMerge('flex min-w-0 items-center gap-2 text-sm', t.hash === hash ? 'font-bold' : 'font-light')}>
                                            <span className='truncate'>{idx + 1}. {displayTitle} - {t.quality.toLowerCase() === '2160p' ? Qualities['4K'] : t.quality}</span>
                                            {t.size && <span className='shrink-0 opacity-80'>{t.size}</span>}
                                        </span>
                                        <p className={twMerge('shrink-0 text-nowrap text-sm', t.hash === hash ? 'font-bold' : 'font-medium')}>{t.peers} peers / {t.seeds} seeds</p>
                                    </label>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className='text-sm font-light'>
                                        {displayTitle} - {t.quality.toLowerCase() === '2160p' ? Qualities['4K'] : t.quality}{t.size ? ` - ${t.size}` : ''} - {t.peers} peers / {t.seeds} seeds
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
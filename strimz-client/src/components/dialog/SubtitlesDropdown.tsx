import { normalizeLanguageCode, resolveCountryCode, getSubtitleMetadata } from '@/utils/detectLanguage';
import { useState, useRef, useEffect, useMemo } from 'react';
import Flag from 'react-world-flags';
import Button from '../Button';
import { BsChevronUp } from 'react-icons/bs';
import { twMerge } from 'tailwind-merge';
import { useAppSelector } from '@/store/hooks';
import { selectSubtitleLang } from '@/store/movies/movies.selectors';
import LoadingIcon from '../LoadingIcon';
import { MdCheck } from 'react-icons/md';
import { RxCross2 } from 'react-icons/rx';
import { COMMON_LANGUAGES } from '@/utils/languages';

interface SubtitleDropdownProps {
  languages: string[];
  onSelect: (langId: string) => void;
  isLoading: boolean;
  isDownloading?: boolean;
  availableSubs: string[];
  notAvailableSubs: string[];
}

const LOAD_BATCH = 10;

const SubtitleDropdown = ({ languages, onSelect, isLoading, isDownloading = false, availableSubs = [], notAvailableSubs = [] }: SubtitleDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [visibleCount, setVisibleCount] = useState(COMMON_LANGUAGES.length);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const subtitleLang = useAppSelector(selectSubtitleLang);

    const normalizedSubs = useMemo(() => {
        return languages.map(l => {
            const [rawCode, label] = l.split('-'); // e.g., 'fre-French'
            const iso3 = normalizeLanguageCode(rawCode); // fra
            return { iso3, label };
        });
    }, [languages]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + LOAD_BATCH, languages.length));
  };

    const visibleSubs = [
        ...COMMON_LANGUAGES.filter((lang) => languages.includes(lang)),
        ...languages.filter((lang) => !COMMON_LANGUAGES.includes(lang)).slice(
            0,
            visibleCount - COMMON_LANGUAGES.length
        ),
    ];

    const normalizedVisibleSubs = visibleSubs.map(sub => {
        const [rawCode, label] = sub.split('-'); // e.g., "fre-French"
        const iso3 = normalizeLanguageCode(rawCode); // canonical ISO3, e.g., "fra"
        return { iso3, label };
    });

  const normalizedSubtitleLang = subtitleLang ? normalizeLanguageCode(subtitleLang.toLowerCase()) : null;
  const selectedLabel = normalizedSubs.find(sub => sub.iso3.toLowerCase() === normalizedSubtitleLang)?.label;
  // Fallback to getSubtitleMetadata if label not found in normalizedSubs
  const fallbackLabel = subtitleLang ? getSubtitleMetadata(subtitleLang)?.label : null;
  const displayLabel = selectedLabel || fallbackLabel || subtitleLang?.toUpperCase();

  return (
    <div className="relative w-full inline-block" ref={dropdownRef}>
        <Button
            onClick={() => setIsOpen((prev) => !prev)}
            className="w-full hover:bg-stone-600 justify-between"
        >
            {subtitleLang ? (
              <div className={`flex w-full items-center gap-1 justify-between ${(isLoading || isDownloading) && 'justify-between'}`}>
                  <span className='flex gap-2 text-sm'>
                      <Flag code={resolveCountryCode(subtitleLang) as string} title={subtitleLang.toUpperCase()} className='w-5 aspect-auto' />
                      {displayLabel}
                  </span>

                  {(isLoading || isDownloading) && (
                    <p className='text-stone-500 italic text-[12px] flex items-center gap-1 mr-3'>
                        <LoadingIcon size={14} />
                        <span>{isDownloading ? 'Downloading...' : 'Checking availability...'}</span>
                    </p>
                  )}

                  {!isLoading && !isDownloading && (
                      <>
                          {availableSubs.some(a => a.toLowerCase() === subtitleLang.toLowerCase()) && (
                            <p className='flex items-center gap-1 px-2'>
                                <MdCheck className='text-green-400 text-sm' />
                                <span className='text-green-400 text-[12px] italic'>Available</span>
                            </p>
                          )}
                          {notAvailableSubs.some(a => a.toLowerCase() === subtitleLang.toLowerCase()) && (
                            <p className='flex items-center gap-1 px-2'>
                              <RxCross2 className='text-red-400 text-sm' />
                              <span className='text-red-400 text-[12px] italic'>Not available</span>
                            </p>
                          )}
                      </>
                  )}
              </div>
            ) : (
                <span className='text-sm'>Select subtitles</span>
            )}
            
            <BsChevronUp className={twMerge(
                'transition-transform text-sm',
                isOpen ? 'rotate-180' : ''
            )} />
        </Button>

        <div className={twMerge(`
            absolute
            bottom-full
            left-0
            mb-1
            w-full
            bg-stone-900
            border
            border-stone-700
            rounded-sm
            shadow-lg
            overflow-x-hidden
            overflow-y-auto
            transform
            origin-bottom
            transition-all
            duration-150
            max-h-52
            z-20
            ${isOpen
                ? 'scale-y-100 opacity-100'
                : 'scale-y-0 opacity-0 pointer-events-none'}
            `)}
        >
            {normalizedVisibleSubs.map(({ iso3, label }) => {
                const countryCode = resolveCountryCode(iso3);

                return (
                    <Button
                        key={iso3}
                        onClick={() => {
                            // Only call onSelect if clicking a different language
                            // If clicking the already selected language, just close the dropdown
                            if (!normalizedSubtitleLang || iso3.toLowerCase() !== normalizedSubtitleLang) {
                                onSelect(iso3);
                            }
                            setIsOpen(false);
                        }}
                        className={`w-full py-2 rounded-none justify-start text-sm flex gap-2 text-white transition-none
                                    ${normalizedSubtitleLang && iso3.toLowerCase() === normalizedSubtitleLang ? 'bg-stone-700 hover:bg-stone-600' : 'bg-stone-800 hover:bg-stone-700'}`}
                    >
                        {countryCode && (
                            <Flag
                                code={countryCode}
                                title={iso3.toUpperCase()}
                                className='w-5 aspect-auto'
                            />
                        )}
                        {label}

                        {availableSubs.some(a => a.toLowerCase() === iso3.toLowerCase()) && (
                            <MdCheck className='text-green-300 ml-auto'/>
                        )}

                        {notAvailableSubs.some(a => a.toLowerCase() === iso3.toLowerCase()) && (
                            <RxCross2 className='text-red-400 ml-auto'/>
                        )}
                    </Button>
                );
            })}

          {visibleCount < languages.length && (
            <Button
              onClick={handleLoadMore}
              className="w-full py-2 transition-none justify-start rounded-none text-sm bg-stone-800 hover:bg-stone-600 text-white"
            >
              Load more...
            </Button>
          )}
        </div>
    </div>
  );
};

export default SubtitleDropdown;
import { normalizeLanguageCode, resolveCountryCode, getSubtitleMetadata } from '@/utils/detectLanguage';
import { useState, useRef, useEffect, useMemo } from 'react';
import Flag from 'react-world-flags';
import Button from '../Button';
import { BsChevronUp, BsCheck } from 'react-icons/bs';
import { twMerge } from 'tailwind-merge';
import { useAppSelector } from '@/store/hooks';
import { selectSubtitleLang, selectSelectedSubtitleFileId } from '@/store/movies/movies.selectors';
import LoadingIcon from '../LoadingIcon';

interface SubtitleFile {
    fileId: string;
    fileName: string;
    uploadDate: string;
}

interface SubtitleDropdownProps {
  languages: string[];
  languageFiles: Record<string, Array<SubtitleFile>>;
  onSelect: (langId: string, fileId: string) => void;
  isLoading: boolean;
  isDownloading?: boolean;
}

const LOAD_BATCH = 10;

const SubtitleDropdown = ({ languages, languageFiles, onSelect, isLoading, isDownloading = false }: SubtitleDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [expandedLanguage, setExpandedLanguage] = useState<string | null>(null);
    const [visibleCount, setVisibleCount] = useState(LOAD_BATCH);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const subtitleLang = useAppSelector(selectSubtitleLang);
    const selectedFileId = useAppSelector(selectSelectedSubtitleFileId);

    // Reset visibleCount when languages change
    useEffect(() => {
        setVisibleCount(Math.min(LOAD_BATCH, languages.length || LOAD_BATCH));
    }, [languages.length]);

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
        setExpandedLanguage(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + LOAD_BATCH, languages.length));
  };

    // Show languages from API search results
    const visibleSubs = languages.slice(0, visibleCount);

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

  const handleLanguageClick = (iso3: string) => {
    if (expandedLanguage === iso3) {
      setExpandedLanguage(null);
    } else {
      setExpandedLanguage(iso3);
    }
  };

  const handleFileSelect = (langId: string, fileId: string) => {
    onSelect(langId, fileId);
    setIsOpen(false);
    setExpandedLanguage(null);
  };

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
                        {isDownloading && <span>Downloading...</span>}
                        {isLoading && <span>Loading...</span>}
                    </p>
                  )}
              </div>
            ) : (
                <span className={twMerge('text-sm flex items-center gap-2', isLoading && 'italic text-stone-400')}>
                    {isLoading && (
                      <span className='flex items-center gap-2'>
                        <LoadingIcon size={14} />
                        <span>Loading subtitles...</span>
                      </span>
                    )}
                    {selectedLabel && !isLoading ? selectedLabel : ''}
                    {!selectedLabel && !isLoading && 'Select subtitles'}
                </span>
            )}
            
            <BsChevronUp className={twMerge(
                'transition-transform text-sm',
                isOpen ? '' : 'rotate-180'
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
            max-h-96
            z-[60]
            ${isOpen
                ? 'scale-y-100 opacity-100'
                : 'scale-y-0 opacity-0 pointer-events-none'}
            `)}
        >
            {normalizedVisibleSubs.length === 0 ? (
                <div className="px-4 py-2 text-sm text-stone-400 text-center">
                    {isLoading ? 'Loading subtitles...' : 'No subtitles available'}
                </div>
            ) : null}
            {normalizedVisibleSubs.map(({ iso3, label }) => {
                const countryCode = resolveCountryCode(iso3);
                const files = languageFiles[iso3] || [];
                const isExpanded = expandedLanguage === iso3;
                const isSelected = normalizedSubtitleLang && iso3.toLowerCase() === normalizedSubtitleLang.toLowerCase();

                return (
                    <div key={iso3}>
                        <Button
                            onClick={() => handleLanguageClick(iso3)}
                            className={`w-full py-2 rounded-none justify-between text-sm flex gap-2 text-white transition-none
                                        ${isSelected ? 'bg-blue-600 hover:bg-blue-500' : 'bg-stone-800 hover:bg-stone-700'}`}
                        >
                            <div className="flex gap-2 items-center">
                                {countryCode && (
                                    <Flag
                                        code={countryCode}
                                        title={iso3.toUpperCase()}
                                        className='w-5 aspect-auto'
                                    />
                                )}
                                <span>{label}</span>
                                {files.length > 0 && (
                                    <span className="text-stone-400 text-[10px] italic">
                                        {files.length} {files.length === 1 ? 'file' : 'files'} available
                                    </span>
                                )}
                            </div>
                            {files.length > 0 && (
                                <BsChevronUp className={twMerge(
                                    'transition-transform text-xs',
                                    isExpanded ? '' : 'rotate-180'
                                )} />
                            )}
                        </Button>
                        
                        {isExpanded && files.length > 0 && (
                            <div className="bg-stone-800 border-l-2 border-stone-600">
                                {files.map((file, index) => {
                                    const isFileSelected = isSelected && selectedFileId === file.fileId;
                                    // Format date: convert ISO date to readable format (e.g., "2024-01-15" -> "Jan 15, 2024")
                                    const formatDate = (dateString: string) => {
                                        if (!dateString) return '';
                                        try {
                                            const date = new Date(dateString);
                                            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                                        } catch {
                                            return dateString;
                                        }
                                    };
                                    const formattedDate = formatDate(file.uploadDate);
                                    return (
                                        <Button
                                            key={file.fileId}
                                            onClick={() => handleFileSelect(iso3, file.fileId)}
                                            className={`w-full py-2 pl-8 rounded-none justify-between text-xs flex gap-2 text-white transition-none
                                                        ${isFileSelected ? 'bg-blue-600 hover:bg-blue-500' : 'bg-stone-800 hover:bg-stone-700'}`}
                                        >
                                            <span className="flex items-center gap-2">
                                                {isFileSelected && (
                                                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-green-500">
                                                        <BsCheck className="text-white text-xs" />
                                                    </span>
                                                )}
                                                <span>{`${label}-${index + 1}`}</span>
                                            </span>
                                            {formattedDate && (
                                                <span className="text-stone-400 text-[10px]">{formattedDate}</span>
                                            )}
                                        </Button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
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

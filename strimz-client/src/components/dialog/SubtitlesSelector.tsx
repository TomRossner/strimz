import React, { useCallback, useEffect, useMemo } from 'react';
import Button from '../Button';
import { PiSubtitles } from 'react-icons/pi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectSubtitleFilePath, selectSubtitleLang, selectIsSubtitlesEnabled } from '@/store/movies/movies.selectors';
import { setSubtitleFilePath, setSubtitleLang, setVttSubtitlesContent } from '@/store/movies/movies.slice';
import { twMerge } from 'tailwind-merge';
import { RxCross2 } from 'react-icons/rx';
import { detectLanguageFromSubtitle, extractTextFromSubtitle, getFlagEmoji, getSubtitleMetadata, resolveCountryCode } from '@/utils/detectLanguage';
import Flag from "react-world-flags";
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { BsInfoCircle } from 'react-icons/bs';
import SubtitleDropdown from './SubtitlesDropdown';

interface SubtitlesSelectorProps {
    buttonOnly?: boolean;
    buttonClassName?: string;
    reverseButtonPosition?: boolean;
    containerClassName?: string;
    useOnSelect?: boolean;
    onSelectSubtitle: (langId: string) => void;
    subtitleContainerClassName?: string;
    isSelected?: boolean;
    isLoading: boolean;
    isDownloading?: boolean;
    languages: string[];
    availableSubs: string[];
    notAvailableSubs: string[];
}

const SubtitlesSelector = ({
    buttonOnly = false,
    buttonClassName,
    reverseButtonPosition = false,
    containerClassName,
    subtitleContainerClassName,
    onSelectSubtitle,
    useOnSelect,
    languages = [],
    availableSubs = [],
    notAvailableSubs = [],
    isLoading,
    isDownloading = false,
}: SubtitlesSelectorProps) => {
    const dispatch = useAppDispatch();
    const subtitleFilePath = useAppSelector(selectSubtitleFilePath);
    const subtitleLang = useAppSelector(selectSubtitleLang);

    const countryCode = useMemo(() => resolveCountryCode(subtitleLang as string),[subtitleLang]);

    const flag = useMemo(() => countryCode ? getFlagEmoji(countryCode) : '', [countryCode]);

    const isSubtitlesEnabled = useAppSelector(selectIsSubtitlesEnabled);

    const { lang } = useMemo(() => getSubtitleMetadata(subtitleLang as string), [subtitleLang]);

    const handleSubtitleFileUpload = (path: string | null) => {
        if (!path) return;

        dispatch(setSubtitleFilePath(path));
    }

    const getSubtitleLanguage = useCallback(async () => {
        const content = await window.electronAPI.detectSubtitlesLanguage(subtitleFilePath as string);

        if (content) {
            const cleanText = extractTextFromSubtitle(content);
            const detectedLang = detectLanguageFromSubtitle(cleanText);

            dispatch(setSubtitleLang(detectedLang));
        } else {
            dispatch(setSubtitleLang(null));
        }
    }, [subtitleFilePath, dispatch]);

    useEffect(() => {
        if (!subtitleFilePath) return;

        getSubtitleLanguage();
    }, [subtitleFilePath, getSubtitleLanguage]);
    
    useEffect(() => {
        const handleSrtSubs = async (srtFilePath: string, lang: string) => {
            const vttText = await window.electronAPI.convertSRTtoVTT(srtFilePath, lang);

            if (vttText) {
                dispatch(setVttSubtitlesContent(vttText));
            }
        }

        if (subtitleFilePath && lang) {
            handleSrtSubs(subtitleFilePath, lang);
        }
    }, [subtitleFilePath, lang, dispatch]);

  return (
    <div className={twMerge(`flex w-full ${buttonOnly ? 'my-0' : 'my-2'} gap-1 ${reverseButtonPosition ? 'flex-col-reverse' : 'flex-col'} ${containerClassName}`)}>
        {!buttonOnly && (
            <p className='text-white w-full flex items-center justify-between'>
                <span className='flex gap-2 items-center'>
                    <PiSubtitles className='text-xl' />
                    Subtitles
                </span>
                
                <span className='flex items-center py-0 gap-1 w-full justify-end'>
                    <Button
                        onClick={() => window.electronAPI.openSubtitleFileDialog().then(handleSubtitleFileUpload)}
                        className={twMerge(`text-sm text-blue-500 hover:text-blue-400 bg-transparent ${buttonClassName}`)}
                    >
                        Choose subtitle file
                    </Button>

                    <Tooltip delayDuration={200}>
                        <TooltipTrigger className='text-blue-500'>
                            <BsInfoCircle />
                        </TooltipTrigger>
                        <TooltipContent>Only .SRT files are supported.</TooltipContent>
                    </Tooltip>
                </span>
            </p>
        )}

        {subtitleFilePath && (
            <div
                onClick={() => onSelectSubtitle(subtitleLang as string)}
                className={twMerge(`
                    flex
                    items-center
                    gap-1
                    justify-between
                    px-1
                    rounded-sm
                    w-full
                    ${subtitleFilePath ? 'bg-stone-800' : 'bg-transparent'}
                    ${subtitleContainerClassName}
                    ${isSubtitlesEnabled && subtitleFilePath ? 'bg-blue-500 hover:bg-blue-400' : ''}
                `)}
            >
                {subtitleFilePath && flag &&
                    <Flag
                        code={countryCode as string}
                        className='w-5 aspect-auto'
                        title={subtitleLang ? subtitleLang.toUpperCase() : ''}
                    />
                }

                <input
                    readOnly
                    type="text"
                    name="subtitles"
                    id="subtitles"
                    title={subtitleFilePath ? subtitleFilePath.split('\\').pop()?.split('/').pop() : ''}
                    value={subtitleFilePath ? subtitleFilePath.split('\\').pop()?.split('/').pop() : ''}
                    className={twMerge(`w-full text-white text-[11px] min-h-5 outline-0 border-none truncate ${useOnSelect ? 'cursor-pointer' : ''}`)}
                />

                {subtitleFilePath &&
                    <Button
                        className='text-[12px] px-0.5 py-0.5 bg-stone-800 hover:bg-stone-700'
                        onClick={() => dispatch(setSubtitleFilePath(null))}
                    >
                        <RxCross2 />
                    </Button>
                }
            </div>
        )}

        <SubtitleDropdown
            notAvailableSubs={notAvailableSubs}
            availableSubs={availableSubs}
            languages={languages}
            onSelect={onSelectSubtitle}
            isLoading={isLoading}
            isDownloading={isDownloading}
        />
    </div>
  )
}

export default SubtitlesSelector;
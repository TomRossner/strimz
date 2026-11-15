import React, { useCallback, useEffect, useMemo } from 'react';
import Button from '../Button';
import { PiSubtitles } from 'react-icons/pi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectSubtitleFilePath, selectSubtitleLang, selectIsSubtitlesEnabled, selectSelectedSubtitleFileId } from '@/store/movies/movies.selectors';
import { setSelectedSubtitleFileId, setSubtitleFilePath, setSubtitleLang } from '@/store/movies/movies.slice';
import { twMerge } from 'tailwind-merge';
import { RxCross2 } from 'react-icons/rx';
import { detectLanguageFromSubtitle, extractTextFromSubtitle, getFlagEmoji, resolveCountryCode } from '@/utils/detectLanguage';
import Flag from "../Flag";
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { BsInfoCircle } from 'react-icons/bs';
import SubtitleDropdown from './SubtitlesDropdown';
import WithTooltip from '../WithTooltip';

interface SubtitleFile {
    fileId: string;
    fileName: string;
    uploadDate: string;
}

interface SubtitlesSelectorProps {
    buttonOnly?: boolean;
    buttonClassName?: string;
    reverseButtonPosition?: boolean;
    containerClassName?: string;
    useOnSelect?: boolean;
    onSelectSubtitle: (langId: string, fileId: string) => void;
    subtitleContainerClassName?: string;
    isSelected?: boolean;
    isLoading: boolean;
    isDownloading?: boolean;
    languages: string[];
    languageFiles: Record<string, Array<SubtitleFile>>;
    availableSubs?: string[];
    notAvailableSubs?: string[];
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
    languageFiles = {},
    availableSubs = [],
    notAvailableSubs = [],
    isLoading,
    isDownloading = false,
}: SubtitlesSelectorProps) => {
    const dispatch = useAppDispatch();
    const subtitleFilePath = useAppSelector(selectSubtitleFilePath);
    const subtitleLang = useAppSelector(selectSubtitleLang);
    const selectedSubtitleFileId = useAppSelector(selectSelectedSubtitleFileId);

    const countryCode = useMemo(() => resolveCountryCode(subtitleLang as string),[subtitleLang]);

    const flag = useMemo(() => countryCode ? getFlagEmoji(countryCode) : '', [countryCode]);

    const isSubtitlesEnabled = useAppSelector(selectIsSubtitlesEnabled);
    const subtitleFileName = subtitleFilePath ? subtitleFilePath.split(/[\\/]/).pop() || '' : '';


    const handleSubtitleFileUpload = (path: string | null) => {
        if (!path) return;

        // A manually chosen file is not an OpenSubtitles file: drop the previous selection
        // so its language is detected from the file instead.
        dispatch(setSelectedSubtitleFileId(null));
        dispatch(setSubtitleLang(null));
        dispatch(setSubtitleFilePath(path));
    }

    const getSubtitleLanguage = useCallback(async (isCancelled: () => boolean) => {
        const content = await window.electronAPI.detectSubtitlesLanguage(subtitleFilePath as string);
        // Another file was selected (or the player closed) while reading this one
        if (isCancelled()) return;

        if (content) {
            const cleanText = extractTextFromSubtitle(content);
            const detectedLang = detectLanguageFromSubtitle(cleanText);

            dispatch(setSubtitleLang(detectedLang));
        } else {
            dispatch(setSubtitleLang(null));
        }
    }, [subtitleFilePath, dispatch]);

    useEffect(() => {
        // Subtitles picked from the list already have a known language. Guessing it from the
        // text would overwrite it (a mis-decoded Hebrew file can be guessed as English), and
        // the changed language re-triggers downloads that then serve the wrong file.
        if (!subtitleFilePath || selectedSubtitleFileId) return;

        let cancelled = false;
        getSubtitleLanguage(() => cancelled);
        return () => {
            cancelled = true;
        };
    }, [subtitleFilePath, selectedSubtitleFileId, getSubtitleLanguage]);
    
    // SRT -> VTT conversion happens only in Player, which cancels outdated conversions.
    // A second, unsynchronized conversion here could finish late and show a previous file's cues.

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
                onClick={() => {
                    // Get fileId from languageFiles if available
                    const files = languageFiles[subtitleLang as string] || [];
                    const fileId = files.length > 0 ? files[0].fileId : '';
                    if (fileId) {
                        onSelectSubtitle(subtitleLang as string, fileId);
                    }
                }}
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

                <WithTooltip label={subtitleFileName}>
                    <input
                        readOnly
                        type="text"
                        name="subtitles"
                        id="subtitles"
                        value={subtitleFileName}
                        className={twMerge(`w-full text-white text-[11px] min-h-5 outline-0 border-none truncate ${useOnSelect ? 'cursor-pointer' : ''}`)}
                    />
                </WithTooltip>

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
            languages={languages}
            languageFiles={languageFiles}
            onSelect={onSelectSubtitle}
            isLoading={isLoading}
            isDownloading={isDownloading}
        />
    </div>
  )
}

export default SubtitlesSelector;
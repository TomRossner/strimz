import React, { useCallback, useEffect, useMemo } from 'react';
import Button from '../Button';
import { PiSubtitles } from 'react-icons/pi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectSubtitleFilePath, selectSubtitleLang } from '@/store/movies/movies.selectors';
import { setSubtitleFilePath, setSubtitleLang } from '@/store/movies/movies.slice';
import { twMerge } from 'tailwind-merge';
import { RxCross2 } from 'react-icons/rx';
import { detectLanguageFromSubtitle, extractTextFromSubtitle, getCountryCodeFromIso3, getFlagEmoji } from '@/utils/detectLanguage';
import Flag from "react-world-flags";

const SubtitlesSelector = () => {
    const dispatch = useAppDispatch();
    const subtitleFilePath = useAppSelector(selectSubtitleFilePath);
    const subtitleLang = useAppSelector(selectSubtitleLang);

    const countryCode = useMemo(() => getCountryCodeFromIso3(subtitleLang as string), [subtitleLang]);
    const flag = useMemo(() => countryCode ? getFlagEmoji(countryCode) : '', [countryCode]);

    const handleSubtitleFileUpload = (path: string | null) => {
        if (!path) return;

        dispatch(setSubtitleFilePath(path));
    }

    const getSubtitleLanguage = useCallback(async () => {
        const content = await window.electronAPI.readSubtitleFile(subtitleFilePath as string);

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

  return (
    <div className='flex w-full flex-col my-3 gap-1'>
        <p className='text-white w-full flex items-center justify-between'>
            <span className='flex gap-2 items-center'>
                <PiSubtitles className='text-xl' />
                Subtitles
            </span>
            
            <Button
                onClick={() => window.electronAPI.openSubtitleFileDialog().then(handleSubtitleFileUpload)}
                className='px-3 py-0 text-sm text-blue-500 hover:text-blue-400 bg-transparent'
            >
                Choose subtitle file
            </Button>
        </p>

        <div className={twMerge(`flex items-center gap-1 justify-between ${subtitleFilePath ? 'bg-stone-800' : 'bg-transparent'} px-1 rounded-sm`)}>
            {subtitleFilePath && flag &&
                <Flag
                    code={countryCode}
                    className='w-5 aspect-auto'
                    title={subtitleLang ? subtitleLang.toUpperCase() : ''}
                />
            }

            <input
                readOnly
                type="text"
                name="subtitles"
                id="subtitles"
                value={subtitleFilePath ? subtitleFilePath.split('\\').pop()?.split('/').pop() : ''}
                className='w-full text-white text-[10px] min-h-5 outline-0 border-none truncate'
            />

            {subtitleFilePath &&
                <Button
                    className='text-[10px] px-0.5 py-0.5 bg-transparent hover:bg-stone-700'
                    onClick={() => dispatch(setSubtitleFilePath(null))}
                >
                    <RxCross2 />
                </Button>
            }
        </div>
    </div>
  )
}

export default SubtitlesSelector;
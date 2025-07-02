import { useAppSelector } from '@/store/hooks';
import { selectSubtitleFilePath, selectSubtitleLang, selectSubtitlesSize, selectUseSubtitles } from '@/store/movies/movies.selectors';
import { getSubtitleMetadata } from '@/utils/detectLanguage';
import { getFileExtension } from '@/utils/getFileExtension';
import { isRTL, parseSRTtoVTT } from '@/utils/subtitles';
import { Cue } from '@/utils/types';
import React, {  useEffect, useMemo, useRef } from 'react';
import { twMerge } from 'tailwind-merge';

interface SubtitlesProps {
    parsedSubtitles: Cue[];
    setParsedSubtitles: (cueArr: Cue[]) => void;
    currentSubtitle: string;
    setCurrentSubtitle: (str: string) => void;
    videoDimensions: { width: number, height: number };
}

const Subtitles = ({setParsedSubtitles, currentSubtitle, setCurrentSubtitle, videoDimensions: { width = 0, height = 0 }}: SubtitlesProps) => {
    const subtitleFilePath = useAppSelector(selectSubtitleFilePath);
    const subtitleLang = useAppSelector(selectSubtitleLang);
    const { lang } = useMemo(() => getSubtitleMetadata(subtitleLang as string), [subtitleLang]);
    const hasSubtitles = useAppSelector(selectUseSubtitles);

    const subtitlesContainerRef = useRef<HTMLDivElement | null>(null);

    const subtitlesSize = useAppSelector(selectSubtitlesSize);

    useEffect(() => {
            const cleanup = () => {
                setParsedSubtitles([]);
                setCurrentSubtitle('');
            }
    
            if (!subtitleFilePath || !lang) {
                cleanup();
                return;
            }
    
            const loadSubtitle = async () => {
                try {
                    const content = await window.electronAPI.readSubtitleFile(subtitleFilePath as string);
                    const ext = getFileExtension(subtitleFilePath as string);
    
                    if (ext === "srt") {
                        const parsed = parseSRTtoVTT(content as string, lang);
                        setParsedSubtitles(parsed);
                    } else {
                        console.log("Non-SRT subtitles not yet handled for custom rendering");
                        setParsedSubtitles([]);
                        setCurrentSubtitle('');
                    }
                } catch (error) {
                    console.error("Error loading subtitle:", error);
                    setCurrentSubtitle('Error loading subtitles.');
                    setParsedSubtitles([]);
                }
            }
    
            loadSubtitle();
    
            return cleanup;
    }, [subtitleFilePath, lang]);
    
  return hasSubtitles ? (
    <div
        ref={subtitlesContainerRef}
        dir={isRTL(lang) ? 'rtl' : 'ltr'}
        className={twMerge(`w-full text-center text-white px-4 z-10`)}
        style={{
            direction: isRTL(lang as string) ? 'rtl' : 'ltr',
            unicodeBidi: 'embed',
            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
            whiteSpace: 'pre-line',
            fontSize: `${subtitlesSize}px`,
            maxHeight: `${height * 0.25}px`,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            position: 'absolute',
            userSelect: 'none',
            bottom: width > 1280 && !document.fullscreenElement
                ? `${height * 0.09}px`
                : `${height * (document.fullscreenElement ? 0.13 : 0.18)}px`,
        }}
        dangerouslySetInnerHTML={{ __html: currentSubtitle }}
    />
  ) : null
}

export default Subtitles;
import { useAppSelector } from '@/store/hooks';
import { selectSubtitleLang, selectSubtitlesSize, selectIsSubtitlesEnabled, selectVttSubtitlesContent } from '@/store/movies/movies.selectors';
import { getSubtitleMetadata } from '@/utils/detectLanguage';
import { isRTL, parseVTTToCues } from '@/utils/subtitles';
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

const Subtitles = React.memo(({
    setParsedSubtitles,
    currentSubtitle,
    setCurrentSubtitle,
    videoDimensions: {
        width = 0,
        height = 0
    }
}: SubtitlesProps) => {
    const subtitleLang = useAppSelector(selectSubtitleLang);
    const { lang } = useMemo(() => getSubtitleMetadata(subtitleLang as string), [subtitleLang]);
    const hasSubtitles = useAppSelector(selectIsSubtitlesEnabled);

    const subtitlesContainerRef = useRef<HTMLDivElement | null>(null);

    const subtitlesSize = useAppSelector(selectSubtitlesSize);

    const vttSubtitlesContent = useAppSelector(selectVttSubtitlesContent);

    useEffect(() => {
        const loadSubtitle = async () => {
            try {
                if (vttSubtitlesContent) {
                    const parsed = parseVTTToCues(vttSubtitlesContent as string);
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

        return () => {
            setParsedSubtitles([]);
            setCurrentSubtitle('');
        }
    }, [vttSubtitlesContent]);
    
  return hasSubtitles ? (
    <div
        ref={subtitlesContainerRef}
        dir={isRTL(lang) ? 'rtl' : 'ltr'}
        className={twMerge(`w-full text-center text-white px-4 z-10`)}
        style={{
            direction: isRTL(lang as string) ? 'rtl' : 'ltr',
            unicodeBidi: 'embed',
            textShadow: '2px 2px 3px rgba(0, 0, 0, 1)',
            whiteSpace: 'pre-line',
            fontSize: `${subtitlesSize}px`,
            maxHeight: `${height * 0.25}px`,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            position: 'absolute',
            userSelect: 'none',
            willChange: 'transform, opacity',
            bottom: width > 1280 && !document.fullscreenElement
                ? `${height * 0.09}px`
                : `${height * (document.fullscreenElement ? 0.13 : 0.18)}px`,
        }}
        dangerouslySetInnerHTML={{ __html: currentSubtitle }}
    />
  ) : null
});

export default Subtitles;
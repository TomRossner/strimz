import { useAppSelector } from '@/store/hooks';
import { selectSubtitleFilePath, selectSubtitleLang, selectUseSubtitles } from '@/store/movies/movies.selectors';
import { getSubtitleMetadata } from '@/utils/detectLanguage';
import { getFileExtension } from '@/utils/getFileExtension';
import { isRTL, parseSRTtoVTT } from '@/utils/subtitles';
import { Cue } from '@/utils/types';
import React, {  useEffect, useMemo, useRef } from 'react';

interface SubtitlesProps {
    parsedSubtitles: Cue[];
    setParsedSubtitles: (cueArr: Cue[]) => void;
    currentSubtitle: string;
    setCurrentSubtitle: (str: string) => void;
}

const Subtitles = ({setParsedSubtitles, currentSubtitle, setCurrentSubtitle}: SubtitlesProps) => {
    const subtitleFilePath = useAppSelector(selectSubtitleFilePath);
    const subtitleLang = useAppSelector(selectSubtitleLang);
    const { lang } = useMemo(() => getSubtitleMetadata(subtitleLang as string), [subtitleLang]);
    const useSubtitles = useAppSelector(selectUseSubtitles);

    const subtitlesContainerRef = useRef<HTMLDivElement | null>(null);

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
    
  return useSubtitles ? (
    <div
        ref={subtitlesContainerRef}
        dir={isRTL(lang) ? 'rtl' : 'ltr'}
        className="absolute bottom-[22%] lg:bottom-[14%] lg:text-2xl w-full text-center text-white text-xl px-4 z-10 h-auto"
        style={{
            direction: isRTL(lang as string) ? 'rtl' : 'ltr',
            unicodeBidi: 'embed',
            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
            whiteSpace: 'pre-line'
        }}
    >
        {currentSubtitle}
    </div>
  ) : null
}

export default Subtitles;
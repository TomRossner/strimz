import { useAppSelector } from '@/store/hooks';
import { selectSubtitleLang, selectSubtitlesSize, selectIsSubtitlesEnabled, selectVttSubtitlesContent } from '@/store/movies/movies.selectors';
import { getPlayerPrefs, subscribePlayerPrefs } from '@/services/playerPrefs';
import { getSubtitleMetadata } from '@/utils/detectLanguage';
import { detectTextDirection, parseVTTToCues, subtitleTextToHTML } from '@/utils/subtitles';
import { Cue } from '@/utils/types';
import React, {  useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { twMerge } from 'tailwind-merge';
import '../../styles/subtitles.css';

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
    // Direction of the loaded file, derived from its text (see detectTextDirection)
    const [direction, setDirection] = useState<'rtl' | 'ltr'>('ltr');

    const subtitlesSize = useAppSelector(selectSubtitlesSize);
    const appearance = useSyncExternalStore(subscribePlayerPrefs, getPlayerPrefs);

    const vttSubtitlesContent = useAppSelector(selectVttSubtitlesContent);

    // Track fullscreen state to avoid checking document.fullscreenElement on every render
    const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement);

    // Listen to fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, []);

    useEffect(() => {
        const loadSubtitle = async () => {
            try {
                if (vttSubtitlesContent) {
                    const parsed = parseVTTToCues(vttSubtitlesContent as string);
                    setDirection(detectTextDirection(parsed, lang));
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vttSubtitlesContent, lang]);

    // Calculate style values (but don't create object yet to avoid unnecessary re-renders)
    const styleValues = useMemo(() => {
        const actualHeight = height || 720;
        const actualWidth = width || 1280;
        const bottomPosition = actualWidth > 1280 && !isFullscreen
            ? actualHeight * 0.09
            : actualHeight * (isFullscreen ? 0.13 : 0.18);
        
        return {
            direction,
            bottom: `${bottomPosition}px`,
            fontSize: `${subtitlesSize}px`,
            maxHeight: `${actualHeight * 0.25}px`,
        };
    }, [direction, subtitlesSize, height, width, isFullscreen]);

    // Memoize complete style object to avoid recreating it
    const subtitleStyle = useMemo(() => ({
        direction: styleValues.direction,
        unicodeBidi: 'isolate' as const,
        textShadow: '2px 2px 3px rgba(0, 0, 0, 1)',
        whiteSpace: 'pre-line' as const,
        color: appearance.subtitleColor,
        // Not a background on this full-width container (that drew a band across the whole
        // video): each line's box reads it through this variable (styles/subtitles.css).
        '--subtitle-bg': appearance.subtitleBackground,
        fontFamily: appearance.subtitleFont,
        fontSize: styleValues.fontSize,
        maxHeight: styleValues.maxHeight,
        overflow: 'hidden' as const,
        display: 'flex' as const,
        flexDirection: 'column' as const,
        alignItems: 'center' as const,
        justifyContent: 'flex-end' as const,
        position: 'absolute' as const,
        userSelect: 'none' as const,
        width: '100%',
        left: '0',
        right: '0',
        bottom: styleValues.bottom,
        textAlign: 'center' as const,
        pointerEvents: 'none' as const,
    }) as React.CSSProperties, [styleValues, appearance.subtitleColor, appearance.subtitleBackground, appearance.subtitleFont]);

    const subtitleHTML = useMemo(() => subtitleTextToHTML(currentSubtitle, direction), [currentSubtitle, direction]);

    // Update subtitle text directly via ref to avoid React re-renders and flickering.
    // hasSubtitles is a dependency because toggling subtitles back on mounts a new, empty element.
    useEffect(() => {
        const element = subtitlesContainerRef.current;
        if (!element) return;
        element.innerHTML = subtitleHTML;
    }, [subtitleHTML, hasSubtitles]);

    return hasSubtitles ? (
                <div
                    ref={subtitlesContainerRef}
                    dir={direction}
                    className={twMerge(`w-full text-center text-white px-4 z-10`)}
                    style={subtitleStyle}
                />
    ) : null
}, (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    // Only re-render if these specific props change
    // Note: setParsedSubtitles and setCurrentSubtitle are stable functions, so we don't compare them
    return (
        prevProps.currentSubtitle === nextProps.currentSubtitle &&
        prevProps.videoDimensions.width === nextProps.videoDimensions.width &&
        prevProps.videoDimensions.height === nextProps.videoDimensions.height &&
        prevProps.parsedSubtitles.length === nextProps.parsedSubtitles.length
    );
});

Subtitles.displayName = 'Subtitles';

export default Subtitles;
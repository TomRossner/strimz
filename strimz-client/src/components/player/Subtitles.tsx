import { useAppSelector } from '@/store/hooks';
import { selectSubtitleLang, selectSubtitlesSize, selectIsSubtitlesEnabled, selectVttSubtitlesContent } from '@/store/movies/movies.selectors';
import { getSubtitleMetadata } from '@/utils/detectLanguage';
import { isRTL, parseVTTToCues } from '@/utils/subtitles';
import { Cue } from '@/utils/types';
import React, {  useEffect, useMemo, useRef, useState } from 'react';
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
    const previousSubtitleRef = useRef<string>('');

    const subtitlesSize = useAppSelector(selectSubtitlesSize);

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
    }, [vttSubtitlesContent]);

    // Calculate style values (but don't create object yet to avoid unnecessary re-renders)
    const styleValues = useMemo(() => {
        const isRTLDirection = isRTL(lang as string);
        const actualHeight = height || 720;
        const actualWidth = width || 1280;
        const bottomPosition = actualWidth > 1280 && !isFullscreen
            ? actualHeight * 0.09
            : actualHeight * (isFullscreen ? 0.13 : 0.18);
        
        return {
            direction: (isRTLDirection ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
            bottom: `${bottomPosition}px`,
            fontSize: `${subtitlesSize}px`,
            maxHeight: `${actualHeight * 0.25}px`,
        };
    }, [lang, subtitlesSize, height, width, isFullscreen]);

    // Memoize complete style object to avoid recreating it
    const subtitleStyle = useMemo(() => ({
        direction: styleValues.direction,
        unicodeBidi: 'embed' as const,
        textShadow: '2px 2px 3px rgba(0, 0, 0, 1)',
        whiteSpace: 'pre-line' as const,
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
        // GPU acceleration
        transform: 'translate3d(0, 0, 0)',
        backfaceVisibility: 'hidden' as const,
        WebkitBackfaceVisibility: 'hidden' as const,
        willChange: 'transform' as const,
    }), [styleValues]);

    // Update subtitle text directly via ref to avoid React re-renders and flickering
    useEffect(() => {
        if (!subtitlesContainerRef.current) return;
        
        // Only update if text actually changed
        if (previousSubtitleRef.current === currentSubtitle) return;

        // Use requestAnimationFrame for smoother updates
        requestAnimationFrame(() => {
            const element = subtitlesContainerRef.current;
            if (!element) return;

            // Update content only if it changed - preserve newlines for multi-line subtitles
            // whiteSpace: 'pre-line' will preserve newlines, so we can use innerHTML directly
            if (element.innerHTML !== currentSubtitle) {
                element.innerHTML = currentSubtitle;
            }
            previousSubtitleRef.current = currentSubtitle;
        });
    }, [currentSubtitle]);

    return hasSubtitles ? (
        <div
            ref={subtitlesContainerRef}
            dir={isRTL(lang) ? 'rtl' : 'ltr'}
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
import React, { CSSProperties } from 'react';
import { twMerge } from 'tailwind-merge';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectSubtitlesSize } from '@/store/movies/movies.selectors';
import { setSubtitlesSize } from '@/store/movies/movies.slice';
import {
    DEFAULT_SUBTITLES_SIZE,
    MAX_SUBTITLES_SIZE,
    MIN_SUBTITLES_SIZE,
    SUBTITLES_SIZE_PRESETS,
    SUBTITLES_SIZE_STEP,
} from '@/utils/constants';
import '../../styles/subtitleSizeRange.css';
import WithTooltip from '../WithTooltip';

const clampSize = (size: number) => Math.min(MAX_SUBTITLES_SIZE, Math.max(MIN_SUBTITLES_SIZE, Math.round(size)));

/**
 * Inline font size setting of the subtitles panel. Changes apply live, so the subtitles on
 * screen are the preview. Persisted to the player prefs by Player like the other settings.
 */
const SubtitleFontSizeControl = () => {
    const dispatch = useAppDispatch();
    const size = useAppSelector(selectSubtitlesSize);

    const setSize = (next: number) => {
        const clamped = clampSize(next);
        if (clamped !== size) dispatch(setSubtitlesSize(clamped));
    };

    const fill = ((clampSize(size) - MIN_SUBTITLES_SIZE) / (MAX_SUBTITLES_SIZE - MIN_SUBTITLES_SIZE)) * 100;
    const sliderStyle: CSSProperties = {
        // Blue up to the thumb, grey after it
        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${fill}%, #57534e ${fill}%, #57534e 100%)`,
    };

    const stepButtonClass = `
        flex items-center justify-center w-7 h-7 shrink-0 rounded-sm text-stone-300
        hover:bg-stone-700 hover:text-white transition-colors cursor-pointer
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent
    `;

    return (
        <div className='flex flex-col gap-2 w-full'>
            <div className='flex items-center justify-between'>
                <span className='text-sm text-stone-400'>Font size</span>
                <div className='flex items-center gap-2'>
                    {size !== DEFAULT_SUBTITLES_SIZE && (
                        <button
                            type='button'
                            onClick={() => setSize(DEFAULT_SUBTITLES_SIZE)}
                            className='text-xs text-blue-500 hover:text-blue-400 cursor-pointer'
                        >
                            Reset
                        </button>
                    )}
                    <span className='min-w-11 text-center rounded-sm bg-stone-700 px-1.5 py-0.5 text-xs font-medium tabular-nums text-stone-200'>
                        {size}px
                    </span>
                </div>
            </div>

            <div className='flex items-center gap-1'>
                <WithTooltip label={`Smaller (-${SUBTITLES_SIZE_STEP}px)`} wrap>
                    <button
                        type='button'
                        aria-label='Decrease subtitle size'
                        disabled={size <= MIN_SUBTITLES_SIZE}
                        onClick={() => setSize(size - SUBTITLES_SIZE_STEP)}
                        className={twMerge(stepButtonClass, 'text-xs font-semibold')}
                    >
                        A
                    </button>
                </WithTooltip>

                <input
                    type='range'
                    aria-label='Subtitle size'
                    min={MIN_SUBTITLES_SIZE}
                    max={MAX_SUBTITLES_SIZE}
                    step={1}
                    value={clampSize(size)}
                    onChange={(e) => setSize(e.target.valueAsNumber)}
                    style={sliderStyle}
                    className='subtitle-size-range grow h-1 rounded-full appearance-none cursor-pointer'
                />

                <WithTooltip label={`Larger (+${SUBTITLES_SIZE_STEP}px)`} wrap>
                    <button
                        type='button'
                        aria-label='Increase subtitle size'
                        disabled={size >= MAX_SUBTITLES_SIZE}
                        onClick={() => setSize(size + SUBTITLES_SIZE_STEP)}
                        className={twMerge(stepButtonClass, 'text-lg font-semibold')}
                    >
                        A
                    </button>
                </WithTooltip>
            </div>

            <div className='grid grid-cols-4 gap-1'>
                {SUBTITLES_SIZE_PRESETS.map((preset) => (
                    <WithTooltip key={preset.label} label={`${preset.title} (${preset.size}px)`}>
                    <button
                        type='button'
                        aria-label={`${preset.title} (${preset.size}px)`}
                        onClick={() => setSize(preset.size)}
                        className={twMerge(`
                            cursor-pointer rounded-sm py-1 text-xs font-medium transition-colors
                            ${size === preset.size ? 'bg-blue-500 text-white' : 'bg-stone-700 text-stone-200 hover:bg-stone-600'}
                        `)}
                    >
                        {preset.label}
                    </button>
                    </WithTooltip>
                ))}
            </div>
        </div>
    );
};

export default SubtitleFontSizeControl;

import React, { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { BsChevronDown, BsChevronUp } from 'react-icons/bs';
import WithTooltip from '../WithTooltip';

export const SUBTITLE_DELAY_STEP = 0.5;
const MIN_DELAY = -60;
const MAX_DELAY = 60;

// Partial input accepted while typing: "", "-", "2.", "-0.", "-2.6"...
const PARTIAL_NUMBER = /^-?\d*\.?\d*$/;

const clamp = (value: number) => Math.min(MAX_DELAY, Math.max(MIN_DELAY, value));
// Avoids floating point noise such as 0.30000000000000004 after stepping
const round = (value: number) => Math.round(value * 1000) / 1000;

const parseDelay = (text: string): number | null => {
    if (!text || text === '-' || text === '.' || text === '-.') return null;
    const value = Number(text);
    return Number.isFinite(value) ? round(clamp(value)) : null;
};

interface SubtitleDelayInputProps {
    value: number;
    onChange: (value: number) => void;
}

/**
 * Subtitle delay field. The arrows/buttons step by 0.5s from the current value (0.3 -> 0.8,
 * not snapped to 0.5), while any exact value such as 0.3 or -2.6 can be typed in.
 */
const SubtitleDelayInput = ({ value, onChange }: SubtitleDelayInputProps) => {
    const [draft, setDraft] = useState(String(value));
    const isEditingRef = useRef(false);

    // Follow outside changes (reset, file switch) unless the user is typing
    useEffect(() => {
        if (!isEditingRef.current) setDraft(String(value));
    }, [value]);

    const stepBy = (direction: 1 | -1) => {
        const current = parseDelay(draft) ?? value;
        const next = round(clamp(current + direction * SUBTITLE_DELAY_STEP));
        setDraft(String(next));
        onChange(next);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            stepBy(e.key === 'ArrowUp' ? 1 : -1);
        } else if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    };

    const stepButtonClass = 'flex items-center justify-center h-1/2 px-1 text-[10px] text-stone-300 hover:bg-stone-600 hover:text-white cursor-pointer';

    return (
        <div className='flex items-stretch h-7 bg-stone-700 border border-stone-600 rounded focus-within:border-blue-500 overflow-hidden'>
            <WithTooltip label={<>Arrow keys change the delay by {SUBTITLE_DELAY_STEP}s.<br />Any value can be typed, e.g. 0.3 or -2.6.</>}>
            <input
                type='text'
                inputMode='decimal'
                aria-label='Subtitle delay in seconds'
                value={draft}
                placeholder='0.0'
                onFocus={() => {
                    isEditingRef.current = true;
                }}
                onChange={(e) => {
                    const text = e.target.value.replace(',', '.').trim();
                    if (!PARTIAL_NUMBER.test(text)) return;
                    setDraft(text);
                    const parsed = parseDelay(text);
                    // Incomplete input ("-", "2.") is kept on screen without changing the delay
                    if (parsed !== null) onChange(parsed);
                }}
                onBlur={() => {
                    isEditingRef.current = false;
                    const parsed = parseDelay(draft) ?? 0;
                    setDraft(String(parsed));
                    if (parsed !== value) onChange(parsed);
                }}
                onKeyDown={handleKeyDown}
                className='w-14 pl-2 text-base font-medium text-stone-300 bg-transparent outline-none'
            />
            </WithTooltip>
            <div className='flex flex-col border-l border-stone-600'>
                <WithTooltip label={`+${SUBTITLE_DELAY_STEP}s`} side='right'>
                    <button
                        type='button'
                        tabIndex={-1}
                        aria-label={`Increase delay by ${SUBTITLE_DELAY_STEP}s`}
                        onClick={() => stepBy(1)}
                        className={stepButtonClass}
                    >
                        <BsChevronUp />
                    </button>
                </WithTooltip>
                <WithTooltip label={`-${SUBTITLE_DELAY_STEP}s`} side='right'>
                    <button
                        type='button'
                        tabIndex={-1}
                        aria-label={`Decrease delay by ${SUBTITLE_DELAY_STEP}s`}
                        onClick={() => stepBy(-1)}
                        className={stepButtonClass}
                    >
                        <BsChevronDown />
                    </button>
                </WithTooltip>
            </div>
        </div>
    );
};

export default SubtitleDelayInput;

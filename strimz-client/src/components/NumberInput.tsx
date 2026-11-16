import React, { KeyboardEvent, useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { FiMinus, FiPlus } from 'react-icons/fi';

interface NumberInputProps {
    id?: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    /** Unit shown after the value, e.g. "KB/s" */
    unit?: string;
    /** Text shown instead of 0, e.g. "Unlimited" */
    zeroLabel?: string;
    className?: string;
    'aria-label'?: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Stepper-style number field: - [value unit] +
 * Typing is free-form and is committed (clamped) on blur or Enter.
 * Arrow keys step by `step`, Shift+Arrow by 10 steps.
 */
const NumberInput = ({
    id,
    value,
    onChange,
    min = 0,
    max = Number.MAX_SAFE_INTEGER,
    step = 1,
    unit,
    zeroLabel,
    className,
    'aria-label': ariaLabel,
}: NumberInputProps) => {
    const [draft, setDraft] = useState<string>(String(value));
    const [isFocused, setIsFocused] = useState<boolean>(false);

    useEffect(() => {
        if (!isFocused) setDraft(String(value));
    }, [value, isFocused]);

    const commit = (next: number) => {
        const clamped = clamp(Number.isFinite(next) ? Math.round(next) : min, min, max);
        setDraft(String(clamped));
        if (clamped !== value) onChange(clamped);
    }

    const stepBy = (delta: number) => {
        const current = Number(draft);
        commit((Number.isFinite(current) ? current : value) + delta);
    }

    const handleKeyDown = (ev: KeyboardEvent<HTMLInputElement>) => {
        const multiplier = ev.shiftKey ? 10 : 1;

        if (ev.key === 'ArrowUp') {
            ev.preventDefault();
            stepBy(step * multiplier);
        } else if (ev.key === 'ArrowDown') {
            ev.preventDefault();
            stepBy(-step * multiplier);
        } else if (ev.key === 'Enter') {
            // Commit instead of submitting the settings form
            ev.preventDefault();
            commit(Number(draft));
        }
    }

    const showZeroLabel = Boolean(zeroLabel) && !isFocused && value === 0;

    const stepButtonClassName = `
        flex
        items-center
        justify-center
        w-8
        self-stretch
        text-stone-300
        hover:text-white
        hover:bg-stone-700
        active:bg-stone-600
        transition-colors
        duration-75
        cursor-pointer
        disabled:text-stone-600
        disabled:hover:bg-transparent
        disabled:cursor-not-allowed
    `;

    return (
        <div
            className={twMerge(`
                flex
                items-stretch
                h-8
                w-40
                shrink-0
                rounded-sm
                bg-stone-800
                border
                border-stone-700
                overflow-hidden
                focus-within:border-blue-400
                transition-colors
                duration-100
                ${className}
            `)}
        >
            <button
                type='button'
                tabIndex={-1}
                aria-label='Decrease'
                disabled={value <= min}
                onClick={() => stepBy(-step)}
                className={twMerge(stepButtonClassName, 'border-r border-stone-700')}
            >
                <FiMinus />
            </button>

            <label className='relative flex items-center justify-center gap-1 grow min-w-0 px-1 cursor-text'>
                <input
                    id={id}
                    type='text'
                    inputMode='numeric'
                    aria-label={ariaLabel}
                    value={showZeroLabel ? '' : draft}
                    onFocus={(ev) => {
                        setIsFocused(true);
                        ev.target.select();
                    }}
                    onBlur={() => {
                        setIsFocused(false);
                        commit(Number(draft));
                    }}
                    onChange={(ev) => setDraft(ev.target.value.replace(/[^\d]/g, ''))}
                    onKeyDown={handleKeyDown}
                    className={twMerge(`
                        bg-transparent
                        text-white
                        text-sm
                        text-right
                        tabular-nums
                        outline-none
                        min-w-0
                        ${unit ? 'w-1/2' : 'w-full text-center'}
                        ${showZeroLabel && 'w-0'}
                    `)}
                />

                {showZeroLabel ? (
                    <span className='text-sm text-stone-300 pointer-events-none'>{zeroLabel}</span>
                ) : unit && (
                    <span className='text-xs text-stone-400 pointer-events-none whitespace-nowrap'>{unit}</span>
                )}
            </label>

            <button
                type='button'
                tabIndex={-1}
                aria-label='Increase'
                disabled={value >= max}
                onClick={() => stepBy(step)}
                className={twMerge(stepButtonClassName, 'border-l border-stone-700')}
            >
                <FiPlus />
            </button>
        </div>
    )
}

export default NumberInput;

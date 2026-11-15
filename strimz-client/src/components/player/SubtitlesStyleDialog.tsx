import React, { ReactNode, useEffect, useRef, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';
import { BsArrowLeft, BsCheck } from 'react-icons/bs';
import { RxCross2 } from 'react-icons/rx';
import { IoColorPaletteOutline } from 'react-icons/io5';
import { closeModal, openModal } from '@/store/modals/modals.slice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectSubtitleColorPicker } from '@/store/modals/modals.selectors';
import { DEFAULT_PLAYER_PREFS, getPlayerPrefs, savePlayerPrefs, subscribePlayerPrefs } from '@/services/playerPrefs';
import '../../styles/subtitles.css';
import WithTooltip from '../WithTooltip';

const COLORS = [
    { label: 'White', value: '#ffffff' },
    { label: 'Yellow', value: '#ffff00' },
    { label: 'Cyan', value: '#00ffff' },
    { label: 'Green', value: '#00ff00' },
    { label: 'Light gray', value: '#d4d4d4' },
];

// Values are stored in the player prefs: keep them unchanged for existing users
const BACKGROUNDS = [
    { label: 'None', value: 'transparent' },
    { label: 'Dark', value: 'rgba(0,0,0,0.65)' },
    { label: 'Black', value: 'rgba(0,0,0,0.9)' },
];

const FONTS = [
    { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Verdana', value: 'Verdana, sans-serif' },
    { label: 'Courier', value: '"Courier New", monospace' },
];

// Stands in for a video frame behind the samples
const SCENE_BACKGROUND = 'linear-gradient(135deg, #57534e 0%, #a8a29e 45%, #44403c 100%)';
const TEXT_SHADOW = '2px 2px 3px rgba(0, 0, 0, 1)';

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
    <div className='flex flex-col gap-1.5'>
        <span className='text-xs font-medium uppercase tracking-wide text-stone-400'>{title}</span>
        {children}
    </div>
);

interface SubtitlesStyleDialogProps {
    isOpen: boolean;
}

/**
 * Subtitle style (color, background, font). Changes apply live to the subtitles on screen
 * and are saved right away, like the font size in the subtitles panel.
 */
const SubtitlesStyleDialog = ({ isOpen }: SubtitlesStyleDialogProps) => {
    const dispatch = useAppDispatch();
    const prefs = useSyncExternalStore(subscribePlayerPrefs, getPlayerPrefs);
    const { subtitleColor: color, subtitleBackground: background, subtitleFont: font } = prefs;

    const isColorPickerOpen = useAppSelector(selectSubtitleColorPicker);
    const colorInputRef = useRef<HTMLInputElement>(null);

    const close = () => dispatch(closeModal('subtitlesSize'));
    const isCustomColor = !COLORS.some((option) => option.value === color.toLowerCase());
    const isDefault =
        color.toLowerCase() === DEFAULT_PLAYER_PREFS.subtitleColor &&
        background === DEFAULT_PLAYER_PREFS.subtitleBackground &&
        font === DEFAULT_PLAYER_PREFS.subtitleFont;

    // While the system color picker is open, the subtitles panel and the player controls stay
    // visible (see Controls / Player). The picker takes the window focus, so it is considered
    // closed when a color is committed, when the window gets the focus back, or when the input
    // loses focus inside the page (in-page pickers).
    useEffect(() => {
        if (!isColorPickerOpen) return;
        const input = colorInputRef.current;
        const pickerClosed = () => dispatch(closeModal('subtitleColorPicker'));
        const handleBlur = () => {
            // The input also blurs when the OS picker takes the window focus: not a close
            if (document.hasFocus()) pickerClosed();
        };

        input?.addEventListener('change', pickerClosed);
        input?.addEventListener('blur', handleBlur);
        window.addEventListener('focus', pickerClosed);
        return () => {
            input?.removeEventListener('change', pickerClosed);
            input?.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', pickerClosed);
        };
    }, [isColorPickerOpen, dispatch]);

    // Never leave the flag set when the panel closes
    useEffect(() => {
        if (!isOpen) dispatch(closeModal('subtitleColorPicker'));
    }, [isOpen, dispatch]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') dispatch(closeModal('subtitlesSize'));
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, dispatch]);

    const chipClass = (selected: boolean) => twMerge(`
        relative flex items-center justify-center rounded-sm border cursor-pointer transition-colors
        ${selected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-stone-600 hover:border-stone-400'}
    `);

  return (
    <AnimatePresence>
        {isOpen && (
            <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0, transition: { duration: 0.12 } }}
                exit={{ opacity: 0, x: 16, transition: { duration: 0.1 } }}
                role='dialog'
                aria-label='Subtitles style'
                className='absolute inset-0 z-[60] flex flex-col rounded-sm bg-stone-800 text-white'
            >
                <div className='flex items-center gap-2 border-b border-stone-600 px-2 py-1.5'>
                    <WithTooltip label='Back'>
                        <button
                            type='button'
                            aria-label='Back'
                            onClick={close}
                            className='flex h-7 w-7 items-center justify-center rounded-sm text-stone-300 hover:bg-stone-700 hover:text-white cursor-pointer'
                        >
                            <BsArrowLeft />
                        </button>
                    </WithTooltip>
                    <span className='grow text-base'>Subtitles style</span>
                    <WithTooltip label='Close'>
                        <button
                            type='button'
                            aria-label='Close'
                            onClick={close}
                            className='flex h-7 w-7 items-center justify-center rounded-sm text-stone-300 hover:bg-stone-700 hover:text-white cursor-pointer'
                        >
                            <RxCross2 />
                        </button>
                    </WithTooltip>
                </div>

                <div className='flex grow flex-col gap-3 overflow-y-auto px-3 py-3'>
                    {/* Preview */}
                    <div
                        className='flex h-16 shrink-0 items-center justify-center rounded-sm px-2 text-center'
                        style={{ background: SCENE_BACKGROUND }}
                    >
                        <span
                            className='subtitle-line text-lg'
                            style={{
                                color,
                                fontFamily: font,
                                textShadow: TEXT_SHADOW,
                                '--subtitle-bg': background,
                            } as React.CSSProperties}
                        >
                            This is how subtitles look
                        </span>
                    </div>

                    <Section title='Color'>
                        <div className='flex items-center gap-2'>
                            {COLORS.map((option) => {
                                const selected = option.value === color.toLowerCase();
                                return (
                                    <WithTooltip key={option.value} label={option.label}>
                                    <button
                                        type='button'
                                        aria-label={option.label}
                                        aria-pressed={selected}
                                        onClick={() => savePlayerPrefs({ subtitleColor: option.value })}
                                        className={twMerge(
                                            'flex h-7 w-7 items-center justify-center rounded-full border border-black/40 cursor-pointer transition-transform hover:scale-110',
                                            selected && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-stone-800'
                                        )}
                                        style={{ backgroundColor: option.value }}
                                    >
                                        {selected && <BsCheck className='text-lg text-black' />}
                                    </button>
                                    </WithTooltip>
                                );
                            })}

                            {/* Custom color: the swatch opens the system color picker */}
                            <WithTooltip label='Custom color'>
                            <label
                                className={twMerge(
                                    'relative flex h-7 w-7 items-center justify-center rounded-full border border-black/40 cursor-pointer transition-transform hover:scale-110',
                                    isCustomColor && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-stone-800'
                                )}
                                style={{
                                    background: isCustomColor
                                        ? color
                                        : 'conic-gradient(#ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)',
                                }}
                            >
                                {!isCustomColor && <IoColorPaletteOutline className='text-sm text-white drop-shadow' />}
                                <input
                                    ref={colorInputRef}
                                    type='color'
                                    aria-label='Custom color'
                                    value={color}
                                    onClick={() => dispatch(openModal('subtitleColorPicker'))}
                                    onChange={(ev) => savePlayerPrefs({ subtitleColor: ev.target.value })}
                                    className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
                                />
                            </label>
                            </WithTooltip>
                        </div>
                    </Section>

                    <Section title='Background'>
                        <div className='grid grid-cols-3 gap-1.5'>
                            {BACKGROUNDS.map((option) => {
                                const selected = option.value === background;
                                return (
                                    <button
                                        key={option.value}
                                        type='button'
                                        aria-pressed={selected}
                                        onClick={() => savePlayerPrefs({ subtitleBackground: option.value })}
                                        className={twMerge(chipClass(selected), 'flex-col gap-1 py-1.5')}
                                    >
                                        <span
                                            className='flex h-7 w-full items-center justify-center'
                                            style={{ background: SCENE_BACKGROUND }}
                                        >
                                            <span
                                                className='subtitle-line text-sm text-white'
                                                style={{ textShadow: TEXT_SHADOW, '--subtitle-bg': option.value } as React.CSSProperties}
                                            >
                                                Aa
                                            </span>
                                        </span>
                                        <span className='text-xs text-stone-300'>{option.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </Section>

                    <Section title='Font'>
                        <div className='grid grid-cols-4 gap-1.5'>
                            {FONTS.map((option) => {
                                const selected = option.value === font;
                                return (
                                    <button
                                        key={option.value}
                                        type='button'
                                        aria-pressed={selected}
                                        onClick={() => savePlayerPrefs({ subtitleFont: option.value })}
                                        className={twMerge(chipClass(selected), 'flex-col py-1.5', selected ? 'bg-stone-700' : 'bg-transparent')}
                                    >
                                        <span className='text-lg leading-tight' style={{ fontFamily: option.value }}>Aa</span>
                                        <span className='text-[10px] text-stone-400'>{option.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </Section>
                </div>

                <div className='flex items-center justify-between border-t border-stone-600 px-3 py-2'>
                    <button
                        type='button'
                        disabled={isDefault}
                        onClick={() => savePlayerPrefs({
                            subtitleColor: DEFAULT_PLAYER_PREFS.subtitleColor,
                            subtitleBackground: DEFAULT_PLAYER_PREFS.subtitleBackground,
                            subtitleFont: DEFAULT_PLAYER_PREFS.subtitleFont,
                        })}
                        className='text-sm text-blue-500 hover:text-blue-400 cursor-pointer disabled:cursor-default disabled:text-stone-500'
                    >
                        Reset to default
                    </button>
                    <button
                        type='button'
                        onClick={close}
                        className='rounded-sm bg-blue-500 px-4 py-1 text-sm text-white hover:bg-blue-400 cursor-pointer'
                    >
                        Done
                    </button>
                </div>
            </motion.div>
        )}
    </AnimatePresence>
  )
}

export default SubtitlesStyleDialog;

import React, { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { closeModal } from '@/store/modals/modals.slice';
import CloseButton from '../CloseButton';
import { useAppDispatch } from '@/store/hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { setSubtitlesSize } from '@/store/movies/movies.slice';
import Button from '../Button';
import { DEFAULT_SUBTITLES_SIZE } from '@/utils/constants';

interface SubtitlesSizeDialogProps {
    isOpen: boolean;
}

const SubtitlesSizeDialog = ({isOpen}: SubtitlesSizeDialogProps) => {
    const [size, setSize] = useState<number>(DEFAULT_SUBTITLES_SIZE);
    const dispatch = useAppDispatch();
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = useCallback((ev: FormEvent<HTMLFormElement>) => {
        ev.preventDefault();
        dispatch(setSubtitlesSize(size));
        dispatch(closeModal('subtitlesSize'));
    }, [size, dispatch]);

    useEffect(() => {
        if (isOpen && inputRef.current) inputRef.current.focus();
    }, [isOpen]);
  return (
    <AnimatePresence>
        {isOpen && (
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, transition: { duration: 0.1 } }}
                exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.1 } }}
                className='absolute bg-stone-700 flex flex-col w-[95%] rounded-sm shadow-2xl shadow-black text-base py-2 px-3'
            >
                <CloseButton onClose={() => dispatch(closeModal('subtitlesSize'))} className='md:block absolute p-1' />

                <span className='text-start w-full text-sm text-stone-400'>Subtitles size</span>
                <form onSubmit={handleSubmit} className='w-full flex flex-col gap-2 mt-3'>
                    <label htmlFor="sizeInput">Size (px):</label>
                    <input
                        name='sizeInput'
                        id='sizeInput'
                        type="number"
                        min={DEFAULT_SUBTITLES_SIZE} 
                        max={50}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setSize(e.target.valueAsNumber)}
                        value={size}
                        ref={inputRef}
                        className='bg-stone-100 w-fit rounded-sm text-black p-1 text-sm'
                    />
                    <div className='w-full flex justify-end gap-1'>
                        <Button type='button' className='bg-stone-400 hover:bg-stone-500' onClick={() => setSize(DEFAULT_SUBTITLES_SIZE)}>Reset</Button>
                        <Button type='submit' className='bg-blue-400 hover:bg-blue-500'>Apply</Button>
                    </div>
                </form>
            </motion.div>
        )} 
    </AnimatePresence>
  )
}

export default SubtitlesSizeDialog;
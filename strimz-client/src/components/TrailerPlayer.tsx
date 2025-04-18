import { AnimatePresence, motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectTrailerModal } from '../store/modals/modals.selectors';
import { closeModal } from "../store/modals/modals.slice";
import CloseButton from "./CloseButton";
import { twMerge } from 'tailwind-merge';
import React, { useCallback, useEffect } from 'react';

interface TrailerPlayerProps {
    yt_trailer_code: string | undefined;
    title: string;
}

const setIframeSrc = (trailerCode: string): string => {
    return `https://www.youtube.com/embed/${trailerCode}?autoplay=1&enablejsapi=1`;
}

const TrailerPlayer = ({yt_trailer_code, title}: TrailerPlayerProps) => {
    const isOpen = useAppSelector(selectTrailerModal);
    const dispatch = useAppDispatch();
    const handleClose = useCallback(() => dispatch(closeModal('trailer')), [dispatch]);

    useEffect(() => {
        if (isOpen) {
            window.addEventListener('keydown', (ev) => ev.key === 'Escape' && handleClose());
        }

        return () => {
            window.removeEventListener('keydown', (ev) => ev.key === 'Escape' && handleClose());
        }
    }, [isOpen, handleClose]);

  return (
    <AnimatePresence>
        {isOpen && (
                <motion.dialog
                    open={isOpen}
                    // sm:w-[1080px]
                    // md:w-[90%]
                    // max-w-[1080px]
                    className={twMerge(`
                        fixed
                        w-[85vw]
                        m-auto
                        aspect-video
                        rounded-sm
                        bg-stone-900
                        z-30
                        top-0
                        bottom-0
                        shadow-md
                        flex
                        items-center
                        justify-center
                    `)}
                    initial={{scale: 0.8, opacity: 0}}
                    animate={{scale: 1, opacity: 1 , transition: {duration: 0.1}}}
                    exit={{scale: 0.8, opacity: 0, transition: {duration: 0.1}}}
                >
                    <CloseButton onClose={handleClose} className="absolute z-40 top-1 right-1 p-1 border-slate-100 md:block border text-xl" />
                    
                    <iframe
                        allowFullScreen
                        onKeyDown={ev => ev.key === 'Escape' && handleClose()}
                        src={setIframeSrc(yt_trailer_code as string)}
                        title={title}
                        className="w-full aspect-video"
                    />
                </motion.dialog>
            )}
        </AnimatePresence>
  )
}

export default TrailerPlayer;
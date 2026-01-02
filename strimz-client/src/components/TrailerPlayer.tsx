
import { useAppDispatch } from '../store/hooks';
import { closeModal } from "../store/modals/modals.slice";
import CloseButton from "./CloseButton";
import React, { useCallback, useEffect } from 'react';
import Dialog from './Dialog';

interface TrailerPlayerProps {
    yt_trailer_code: string | undefined;
    title: string;
    isOpen: boolean;
}

const setIframeSrc = (trailerCode: string): string => {
    // Add additional parameters for better compatibility and to avoid Error 153
    // Clean the trailer code to ensure it's valid (remove any whitespace or invalid characters)
    const cleanCode = trailerCode.trim();
    const origin = typeof window !== 'undefined' && window.location.origin 
        ? encodeURIComponent(window.location.origin)
        : '';
    const originParam = origin ? `&origin=${origin}` : '';
    return `https://www.youtube.com/embed/${cleanCode}?autoplay=1&enablejsapi=1&modestbranding=1&rel=0${originParam}`;
}

const TrailerPlayer = ({yt_trailer_code, title, isOpen}: TrailerPlayerProps) => {
    const dispatch = useAppDispatch();
    const handleClose = useCallback(() => dispatch(closeModal('trailer')), [dispatch]);

    useEffect(() => {
        if (isOpen) {
            const handleKeyDown = (ev: KeyboardEvent) => {
                if (ev.key === 'Escape') {
                    handleClose();
                }
            };
            window.addEventListener('keydown', handleKeyDown);

            return () => {
                window.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [isOpen, handleClose]);

    // Don't render iframe if trailer code is missing or invalid
    if (!yt_trailer_code || !yt_trailer_code.trim()) {
        return (
            <Dialog size='large' isOpen={isOpen}>
                <CloseButton onClose={handleClose} className="absolute top-1 right-1 p-1 border-slate-100 md:block border text-xl" />
                <div className="w-full aspect-video flex items-center justify-center bg-black text-white">
                    <p>Trailer not available</p>
                </div>
            </Dialog>
        );
    }

  return (
    <Dialog size='large' isOpen={isOpen}>
        <CloseButton onClose={handleClose} className="absolute top-1 right-1 p-1 border-slate-100 md:block border text-xl" />
        <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            src={setIframeSrc(yt_trailer_code)}
            title={title}
            className="w-full aspect-video"
        />
    </Dialog>
  )
}

export default TrailerPlayer;
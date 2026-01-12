
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
    
    // Check if we're in Electron with file:// protocol (fallback case)
    const isFileProtocol = typeof window !== 'undefined' && 
        window.location.protocol === 'file:';
    
    // Use youtube-nocookie.com for better compatibility in Electron
    // In production, we now serve over HTTP, so we can use regular YouTube
    const baseUrl = isFileProtocol 
        ? 'https://www.youtube-nocookie.com/embed'
        : 'https://www.youtube.com/embed';
    
    // Add origin parameter if we have a valid HTTP/HTTPS origin
    // This is required for YouTube to identify the embedder and avoid Error 153
    let originParam = '';
    if (typeof window !== 'undefined' && window.location.origin) {
        const origin = window.location.origin;
        // Only add origin if it's a valid HTTP/HTTPS origin (not file://)
        if (origin.startsWith('http://') || origin.startsWith('https://')) {
            originParam = `&origin=${encodeURIComponent(origin)}`;
        }
    }
    
    return `${baseUrl}/${cleanCode}?autoplay=1&enablejsapi=1&modestbranding=1&rel=0${originParam}`;
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
            <Dialog size='large' isOpen={isOpen} className="!z-[60]">
                <CloseButton onClose={handleClose} className="absolute top-1 right-1 p-1 border-slate-100 md:block border text-xl" />
                <div className="w-full aspect-video flex items-center justify-center bg-black text-white">
                    <p>Trailer not available</p>
                </div>
            </Dialog>
        );
    }

  return (
    <Dialog size='large' isOpen={isOpen} className="!z-[60]">
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
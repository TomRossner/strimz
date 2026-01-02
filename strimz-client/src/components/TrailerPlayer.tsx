
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
    return `https://www.youtube.com/embed/${trailerCode}?autoplay=1`;
}

const TrailerPlayer = ({yt_trailer_code, title, isOpen}: TrailerPlayerProps) => {
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
    <Dialog size='large' isOpen={isOpen}>
        <CloseButton onClose={handleClose} className="absolute top-1 right-1 p-1 border-slate-100 md:block border text-xl" />
        <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            onKeyDown={ev => ev.key === 'Escape' && handleClose()}
            src={setIframeSrc(yt_trailer_code as string)}
            title={title}
            className="w-full aspect-video"
        />
    </Dialog>
  )
}

export default TrailerPlayer;
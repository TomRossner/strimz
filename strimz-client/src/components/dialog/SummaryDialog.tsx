import React, { useEffect, useState } from 'react';
import Dialog from '../Dialog';
import CloseButton from '../CloseButton';
import { useAppDispatch } from '@/store/hooks';
import { closeModal } from '@/store/modals/modals.slice';
import PageTitle from '../PageTitle';
import Button from '../Button';
import { getMovieMetadata } from '@/services/movies';
import LoadingIcon from '../LoadingIcon';

interface SummaryDialogProps {
    isOpen: boolean;
    summary: string;
    imdbCode?: string;
}

const formatSummary = (text: string): string => {
    return text.replace(/\s+[-–—]+[^-–—\n]*\.?$/, "").trim();
};

const SummaryDialog = ({ isOpen, summary, imdbCode }: SummaryDialogProps) => {
    const dispatch = useAppDispatch();
    const [tmdbSummary, setTmdbSummary] = useState<string | null>(null);
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);

    const needsTmdb = !summary?.length || summary === "No summary";
    const shouldFetch = isOpen && needsTmdb && !!imdbCode;

    useEffect(() => {
        if (!shouldFetch) {
            if (!isOpen) setTmdbSummary(null);
            setIsLoadingSummary(false);
            return;
        }
        let cancelled = false;
        setIsLoadingSummary(true);
        getMovieMetadata(imdbCode!)
            .then((data) => {
                if (!cancelled && data.summary?.length) {
                    setTmdbSummary(data.summary);
                } else if (!cancelled) {
                    setTmdbSummary(null);
                }
                if (!cancelled) setIsLoadingSummary(false);
            })
            .catch(() => {
                if (!cancelled) {
                    setTmdbSummary(null);
                    setIsLoadingSummary(false);
                }
            });
        return () => { cancelled = true; };
    }, [isOpen, imdbCode, shouldFetch]);

    const displaySummary = (summary?.length && summary !== "No summary")
        ? formatSummary(summary)
        : (tmdbSummary ?? null);
    const isLoading = shouldFetch && isLoadingSummary;
    const hasContent = displaySummary?.length;

    return (
        <Dialog isOpen={isOpen} size='small' className='flex-col bg-stone-800 p-2'>
            <CloseButton onClose={() => dispatch(closeModal('summary'))} className='md:block absolute p-1 text-sm' />
            <PageTitle className='p-3'>Summary</PageTitle>
            <div className='p-2 w-[95%] text-start mx-auto text-white max-h-[60vh] overflow-y-auto mb-2'>
                {isLoading ? (
                    <span className='flex items-center gap-2 text-stone-400 animate-pulse italic'>
                        <LoadingIcon size={18} />
                        Loading summary...
                    </span>
                ) : hasContent ? (
                    <p>{displaySummary}</p>
                ) : (
                    <p className='text-stone-500 italic'>No summary available.</p>
                )}
            </div>
            <Button onClick={() => dispatch(closeModal('summary'))} className='self-end hover:bg-stone-600'>Close</Button>
        </Dialog>
    );
};

export default SummaryDialog;
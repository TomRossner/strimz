import React from 'react';
import Dialog from '../Dialog';
import CloseButton from '../CloseButton';
import { useAppDispatch } from '@/store/hooks';
import { closeModal } from '@/store/modals/modals.slice';
import PageTitle from '../PageTitle';
import Button from '../Button';

interface SummaryDialogProps {
    isOpen: boolean;
    summary: string;
}

const SummaryDialog = ({isOpen, summary}: SummaryDialogProps) => {
    const dispatch = useAppDispatch();
  return (
    <Dialog isOpen={isOpen} size='small' className='flex-col bg-stone-800 p-2'>
        <CloseButton onClose={() => dispatch(closeModal('summary'))} className='md:block absolute p-1 text-sm' />
        <PageTitle className='p-3'>Summary</PageTitle>
        <p className='p-2 w-[95%] text-start mx-auto text-white max-h-[60vh] overflow-y-auto mb-2'>{summary.replace(/\s*—[^—\n]+$/, "")}</p>

        <Button onClick={() => dispatch(closeModal('summary'))} className='self-end hover:bg-stone-600'>Close</Button>
    </Dialog>
  )
}

export default SummaryDialog
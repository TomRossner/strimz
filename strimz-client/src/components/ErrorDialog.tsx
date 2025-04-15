import React from 'react';
import Dialog from './Dialog';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectError } from '../store/movies/movies.selectors';
import { setError } from '../store/movies/movies.slice';
import { closeModal } from '../store/modals/modals.slice';
import Button from './Button';

interface ErrorDialogProps {
  onClose?: () => void;
  btnText?: string;
}

const ErrorDialog = ({onClose, btnText = "Got it"}: ErrorDialogProps) => {
    const dispatch = useAppDispatch();
    const moviesError = useAppSelector(selectError);

    const handleClose = () => {
        if (onClose) {
          dispatch(closeModal('error'));
          onClose();
          return;
        }
        
        dispatch(closeModal('error'));
        dispatch(setError(''));
    }

  return (
    <Dialog isOpen={!!moviesError} size='small' title='Whoops!' className='flex-col px-2 justify-between grow'>
        <p className='px-2 self-start text-white'>{moviesError}</p>

        <Button onClick={handleClose} className='absolute bottom-1 right-1 self-end border border-stone-300'>
            {btnText}
        </Button>
    </Dialog>
  )
}

export default ErrorDialog;
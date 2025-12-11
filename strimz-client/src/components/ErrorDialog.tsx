import React from 'react';
import Dialog from './Dialog';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectError } from '../store/movies/movies.selectors';
import { setError } from '../store/movies/movies.slice';
import { closeModal } from '../store/modals/modals.slice';
import Button from './Button';
import { BsInfoCircle } from 'react-icons/bs';

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

    const isGeoBlocked = moviesError?.includes('403');

  return (
    <Dialog
      isOpen={!!moviesError}
      size="small"
      title="Whoops!"
      className="flex-col px-2 justify-between grow"
    >
      <p className="self-start text-white">{moviesError}</p>

      {isGeoBlocked && (
        <p className="mt-2 flex gap-2 text-stone-500">
          <BsInfoCircle className="text-[22px]" />
          <span className="text-sm italic">
            Some VPN locations are blocked. Try switching to a different region and try again.
          </span>
        </p>
      )}

      <div className="w-full flex justify-end py-2">
        <Button onClick={handleClose} className="border border-stone-300">
          {btnText}
        </Button>
      </div>
    </Dialog>
  )
}

export default ErrorDialog;
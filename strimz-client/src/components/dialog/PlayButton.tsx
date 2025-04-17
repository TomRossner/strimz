import React from 'react';
import Button from '../Button';
import { useAppDispatch } from '@/store/hooks';
import { closeModal } from '@/store/modals/modals.slice';

interface PlayButtonProps {
  isDisabled: boolean;
  onPlay: () => void;
}

const PlayButton = ({isDisabled, onPlay}: PlayButtonProps) => {
  const dispatch = useAppDispatch();

  const handlePlay = () => {
    onPlay();
    dispatch(closeModal('movie'));
  }
  
  return (
    <Button
      disabled={isDisabled}
      onClick={handlePlay}
      className='bg-blue-500 py-2 px-3 font-semibold w-full disabled:opacity-55 hover:text-white disabled:text-slate-200'
    >
      Play
    </Button>
  )
}

export default PlayButton;
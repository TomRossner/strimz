import React from 'react';
import Button from '../Button';

interface PlayButtonProps {
  isDisabled: boolean;
  onPlay: () => void;
}

const PlayButton = ({isDisabled, onPlay}: PlayButtonProps) => {
  return (
    <Button
      disabled={isDisabled}
      onClick={onPlay}
      className='bg-blue-500 py-2 px-3 font-semibold w-full disabled:opacity-55 hover:text-white disabled:text-slate-200'
    >
      Play
    </Button>
  )
}

export default PlayButton;
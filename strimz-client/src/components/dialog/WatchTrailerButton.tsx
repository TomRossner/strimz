import React from 'react';
import { BsYoutube } from 'react-icons/bs';
import { twMerge } from 'tailwind-merge';
import Button from '../Button';

interface WatchTrailerButtonProps {
  onPlay: () => void;
  isDisabled: boolean;
  ytTrailerCode: string;
}

const WatchTrailerButton = ({isDisabled = false, onPlay, ytTrailerCode = ''}: WatchTrailerButtonProps) => {
  return (
    <Button
      onClick={onPlay}
      disabled={isDisabled}
      title={ytTrailerCode ? 'Watch YouTube trailer' : 'No trailer to play'}
      className={twMerge(`
        w-full
        text-stone-800
        gap-3
        bg-gray-100
        py-2
        font-medium
        hover:bg-white
        hover:text-black
        ${ytTrailerCode && 'disabled:opacity-55'}
      `)}
    >
      <span className={twMerge(`text-2xl text-red-600 ${(isDisabled || !ytTrailerCode) && 'opacity-70'}`)}>
        <BsYoutube />
      </span>
      Watch Youtube trailer
    </Button>
  )
}

export default WatchTrailerButton;
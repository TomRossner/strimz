import React from 'react';
import Button from '../Button';
import { useAppDispatch } from '@/store/hooks';
import { closeModal } from '@/store/modals/modals.slice';
import { IoWarningOutline } from 'react-icons/io5';
import { twMerge } from 'tailwind-merge';

interface PlayButtonProps {
    isDisabled: boolean;
    onPlay: () => Promise<void>;
    diskSpaceInfo?: {
        hasEnoughSpace: boolean | null;
        fileSizeInBytes: number;
        freeBytes: number;
    };
}

const PlayButton = ({isDisabled, onPlay, diskSpaceInfo}: PlayButtonProps) => {
  const dispatch = useAppDispatch();

  const handlePlay = async () => {
    // Call onPlay first (which handles subtitle download and navigation)
    // Wait for it to complete to ensure subtitle states are set before closing modal
    await onPlay();
    // Close modal after subtitle states are set and navigation starts
    // Don't reset subtitle states - they should persist to the player
    dispatch(closeModal('movie'));
  }
  
  return (
    <Button
      disabled={isDisabled}
      onClick={handlePlay}
      className={twMerge(`
        py-2
        px-3
        font-semibold
        w-full
        disabled:opacity-80
        disabled:text-slate-200
        hover:text-white
        ${diskSpaceInfo?.hasEnoughSpace === false
          ? 'text-start bg-red-200 text-red-600 hover:bg-red-300'
          : 'bg-blue-500 text-white hover:bg-blue-400'
        }
      `)}
    >
      {diskSpaceInfo?.hasEnoughSpace === false
        ? (
          <span className="text-sm text-red-400 flex gap-4 items-center">
            <IoWarningOutline className='text-2xl' />
            Not enough disk space!
          </span>
        ) : 'Play'
      }
    </Button>
  )
}

export default PlayButton;
import React from 'react';
import { twMerge } from 'tailwind-merge';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import LoadingIcon from '../LoadingIcon';

interface SummaryProps {
  onClick: () => void;
  summary: string | undefined;
  isLoading?: boolean;
}

const Summary = ({onClick, summary, isLoading = false}: SummaryProps) => {
  return (
    <Tooltip>
      <TooltipTrigger className='text-start'>
        <summary
          onClick={onClick}
          className={twMerge(`
            text-white
            list-none
            py-1
            px-2
            text-sm
            bg-stone-700
            rounded-md
            cursor-pointer
            transition-colors
            hover:bg-stone-600
            font-thin
            max-h-36
            overflow-y-clip
            line-clamp-2
          `)}
        >
          <p className='font-semibold mb-1'>Summary:</p>
          {isLoading ? (
            <span className="flex items-center gap-2 text-stone-400 animate-pulse italic font-light">
              <LoadingIcon size={14} />
              Loading summary...
            </span>
          ) : (
            summary || 'No summary'
          )}
        </summary>
      </TooltipTrigger>
      <TooltipContent>Read more</TooltipContent>
    </Tooltip>
  )
}

export default Summary;
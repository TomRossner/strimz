import React from 'react';
import { twMerge } from 'tailwind-merge';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

interface SummaryProps {
  onClick: () => void;
  summary: string;
}

const Summary = ({onClick, summary = ''}: SummaryProps) => {
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
          {summary}
        </summary>
      </TooltipTrigger>
      <TooltipContent>Read more</TooltipContent>
    </Tooltip>
  )
}

export default Summary;
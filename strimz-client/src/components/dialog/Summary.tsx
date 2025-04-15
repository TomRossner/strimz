import React from 'react';
import { twMerge } from 'tailwind-merge';

interface SummaryProps {
  isExpanded: boolean;
  onClick: () => void;
  summary: string;
}

const Summary = ({isExpanded = false, onClick, summary = ''}: SummaryProps) => {
  return (
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
        overflow-y-auto
        ${!isExpanded && 'line-clamp-3 overflow-y-clip'}
      `)}
    >
      <p className='font-semibold mb-1'>Summary:</p>
      {summary}
    </summary>
  )
}

export default Summary;
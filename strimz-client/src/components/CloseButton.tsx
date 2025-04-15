import React from 'react';
import { RxCross2 } from 'react-icons/rx';
import { twMerge } from 'tailwind-merge';
import Button from './Button';

interface CloseButtonProps {
  onClose: () => void;
  className?: string;
  text?: string;
}

const CloseButton = ({onClose, className, text}: CloseButtonProps) => {
  return (
    <Button
      className={twMerge(`
        text-gray-200
        p-2
        fixed
        text-2xl
        active:bg-stone-700
        active:text-white
        lg:hover:bg-stone-700
        lg:hover:text-white
        transition-colors
        duration-75
        bg-stone-800
        border
        border-slate-400
        top-1
        right-1
        md:hidden
        z-10
        ${className}
      `)}
      title='Close'
      onClick={onClose}
    >
      {text ?? <RxCross2 />}
    </Button>
  )
}

export default CloseButton;
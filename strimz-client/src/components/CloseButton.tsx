import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import { RxCross2 } from 'react-icons/rx';
import { twMerge } from 'tailwind-merge';
import Button from './Button';

interface CloseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  onClose: () => void;
  className?: string;
  text?: string;
  icon?: ReactNode;
}

const CloseButton = ({onClose, className, text, icon, title}: CloseButtonProps) => {
  return (
    <Button
      className={twMerge(`
        text-gray-200
        p-2
        fixed
        text-xl
        active:bg-stone-700
        active:text-white
        hover:bg-stone-700
        hover:text-white
        transition-colors
        duration-75
        bg-stone-700
        border
        border-slate-400
        top-1
        right-1
        md:hidden
        z-10
        ${className}
      `)}
      title={title}
      onClick={onClose}
    >
      {icon}
      {text}
      {(!text && !icon) && <RxCross2 />}
    </Button>
  )
}

export default CloseButton;
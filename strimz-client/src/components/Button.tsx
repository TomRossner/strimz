import React from 'react';
import { twMerge } from 'tailwind-merge';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
}

const DEFAULT_BUTTON_CLASSNAME =
    'cursor-pointer text-center flex items-center justify-center rounded-sm w-fit px-2 py-1 bg-stone-800 hover bg-stone-700 text-slate-100 hover:text-white transition-all duration-75 disabled:text-stone-500 disabled:cursor-not-allowed';

const Button = ({
    children,
    type = 'button',
    onClick = () => {},
    onMouseDown = () => {},
    className,
    title = '',
    hidden = false,
    disabled = false,
}: ButtonProps) => {
    const finalClass = twMerge(
        DEFAULT_BUTTON_CLASSNAME,
        hidden ? 'hidden' : '',
        className
    );
  return title.length ? (
    <Tooltip delayDuration={300}>
        <TooltipTrigger
            type={type}
            onClick={onClick}
            onMouseDown={onMouseDown}
            hidden={hidden}
            disabled={disabled}
            className={finalClass}
        >
            {children}
        </TooltipTrigger>
        <TooltipContent className='z-[9999]'>{title}</TooltipContent>
    </Tooltip>
  ) : (
    <button
        type={type}
        onClick={onClick}
        onMouseDown={onMouseDown}
        title={title}
        disabled={disabled}
        hidden={hidden}
        className={finalClass}
    >
        {children}
    </button>
  )
}

export default Button;
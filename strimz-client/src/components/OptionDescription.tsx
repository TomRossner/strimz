import React, { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface OptionDescriptionProps {
    children: ReactNode;
    className?: string;
}

const OptionDescription = ({children, className}: OptionDescriptionProps) => {
  return (
    <p className={twMerge(`text-sm text-slate-500 ${className}`)}>{children}</p>
  )
}

export default OptionDescription;
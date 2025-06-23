import React, { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface PageDescriptionProps {
    children: ReactNode;
    className?: string;
}

const PageDescription = ({children, className}: PageDescriptionProps) => {
  return (
    <p className={twMerge(`text-slate-200 italic font-light text-sm mb-5 ${className}`)}>{children}</p>
  )
}

export default PageDescription;
import React, { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface PageTitleProps {
    children: ReactNode;
    className?: string;
}
const PageTitle = ({children, className}: PageTitleProps) => {
  return (
    <h1 className={twMerge(`text-white text-3xl font-semibold w-full flex items-center gap-3 ${className}`)}>
      {children}
    </h1>
  )
}

export default PageTitle;
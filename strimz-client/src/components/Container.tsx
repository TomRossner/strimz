import React, { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface ContainerProps {
    id: string;
    className?: string;
    children: ReactNode;
}

const Container = ({id, className, children}: ContainerProps) => {
  return (
    <div id={id} className={twMerge(`w-full bg-stone-900 min-h-full flex flex-col p-3 gap-2 mx-auto lg:w-[60%] ${className}`)}>
        {children}
    </div>
  )
}

export default Container;
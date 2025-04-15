import React, { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';
import CloseButton from './CloseButton';
import { useNavigate } from 'react-router-dom';

interface ContainerProps {
    id: string;
    className?: string;
    children: ReactNode;
}

const Container = ({id, className, children}: ContainerProps) => {
  const navigate = useNavigate();
  return (
    <div id={id} className={twMerge(`w-full bg-stone-950 min-h-[100vh] sm:w-[65%] lg:container flex flex-col h-full p-3 gap-2 max-w-screen-md mx-auto ${className}`)}>
        <CloseButton onClose={() => navigate(-1)} className='md:block w-fit text-lg top-1 left-1' text='Back' />
        {children}
    </div>
  )
}

export default Container;
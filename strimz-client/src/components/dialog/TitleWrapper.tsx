import React from 'react';
import CloseButton from '../CloseButton';

interface TitleWrapperProps {
  title: string;
  onClose: () => void;
}

const TitleWrapper = ({title, onClose}: TitleWrapperProps) => {
  return (
    <div className='flex justify-between w-full items-start'>
      <h2 className='text-2xl font-semibold text-slate-200 py-1'>{title}</h2>

      <CloseButton onClose={onClose} className='p-1 text-xl mt-1 -mr-1 hidden md:block relative' />
    </div>
  )
}

export default TitleWrapper;
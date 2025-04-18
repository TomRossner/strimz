import React, { ButtonHTMLAttributes } from 'react';
import { useNavigate } from 'react-router-dom';
import CloseButton from './CloseButton';
import { BiChevronLeft } from 'react-icons/bi';

const BackButton = ({title = 'Back'}: ButtonHTMLAttributes<HTMLButtonElement>) => {
    const navigate = useNavigate();
  return (
    <CloseButton
        title={title}
        icon={<BiChevronLeft />}
        onClose={() => navigate(-1)}
        className='md:block w-fit z-0 py-1 top-0 relative text-lg text-stone-400 border-none hover:bg-stone-600'
    />
  )
}

export default BackButton;
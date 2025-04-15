import { APP_NAME } from '../utils/constants';
import React from 'react';
import { twMerge } from 'tailwind-merge';

interface LogoProps {
    className?: string;
}

const Logo = ({className}: LogoProps) => {
  return (
    <h1 className={twMerge(`font-fascinate px-3 inline text-4xl font-semibold text-white w-full md:w-fit text-center md:text-start md:grow-0 grow ${className}`)}>
        {APP_NAME}
    </h1>
  )
}

export default Logo;
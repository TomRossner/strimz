import React from 'react';
import Loading from "../assets/loading.png";
import { twMerge } from 'tailwind-merge';
const DEFAULT_SIZE: number = 25;

const LoadingIcon = ({size = DEFAULT_SIZE, className}: {size?: number, className?: string}) => {
  return (
    <img
      src={Loading}
      width={size}
      height={size}
      alt='Loading'
      className={twMerge(`animate-spin aspect-square opacity-80 w-[${size}] ${className}`)}
    />
  )
}

export default LoadingIcon;
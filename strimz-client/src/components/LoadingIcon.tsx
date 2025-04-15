import React from 'react';
import Loading from "../assets/loading.png";
const DEFAULT_SIZE: number = 25;

const LoadingIcon = ({size = DEFAULT_SIZE}: {size?: number}) => {
  return (
    <img
      src={Loading}
      width={size}
      height={size}
      alt='Loading'
      className={`animate-spin aspect-square opacity-80 w-[${size}]`}
    />
  )
}

export default LoadingIcon;
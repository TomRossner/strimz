import React from 'react';

interface DialogBackgroundProps {
  imgSrc: string
}

const DialogBackground = ({imgSrc = ''}: DialogBackgroundProps) => {
  return (
    <img
        src={imgSrc}
        width={1920}
        height={720}
        alt=''
        className='object-cover -z-10 hidden md:block md:absolute w-full top-0 left-0 opacity-70 aspect-video'
    />
  )
}

export default DialogBackground;
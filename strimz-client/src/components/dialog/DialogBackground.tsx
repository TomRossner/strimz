import React, { useState, useEffect } from 'react';

interface DialogBackgroundProps {
  imgSrc: string
}

const DialogBackground = ({imgSrc = ''}: DialogBackgroundProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!imgSrc || imgSrc === '') {
      setImageLoaded(false);
      setImageError(false);
      return;
    }

    setImageLoaded(false);
    setImageError(false);

    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);
      setImageError(false);
    };
    img.onerror = () => {
      setImageLoaded(false);
      setImageError(true);
    };
    img.src = imgSrc;
  }, [imgSrc]);

  if (!imgSrc || imgSrc === '' || imageError) return null;
  
  if (!imageLoaded) return null;

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
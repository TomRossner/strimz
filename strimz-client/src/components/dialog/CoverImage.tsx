import React from 'react';

interface CoverImageProps {
  imageSrc: string;
}

const CoverImage = ({imageSrc = ''}: CoverImageProps) => {
  return (
    <div className='flex w-full md:relative fixed top-0 md:flex-row flex-col h-[100vh] md:h-full'>
        {imageSrc && (
          <img
              src={imageSrc}
              alt=''
              width={384}
              height={576}
              className='md:opacity-90 border-r w-full md:aspect-[2/3] md:object-cover'
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 from-40% md:from-0%" />
    </div>
  )
}

export default CoverImage;
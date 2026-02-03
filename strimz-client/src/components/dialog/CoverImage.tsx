import React from 'react';

interface CoverImageProps {
  imageSrc: string;
}

const CoverImage = ({imageSrc = ''}: CoverImageProps) => {
  return (
    <div className='flex w-full md:relative fixed top-0 md:flex-row flex-col h-[100vh] md:h-full md:min-h-0 md:shrink-0 md:aspect-[2/3] md:w-auto'>
        {imageSrc && (
          <img
              src={imageSrc}
              alt=''
              className='w-full h-full md:opacity-90 border-r border-stone-700 object-cover object-center'
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 from-40% md:from-0%" />
    </div>
  )
}

export default CoverImage;
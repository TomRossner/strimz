import { DEFAULT_FETCH_LIMIT } from '../utils/constants';
import React from 'react'; 

const MoviesListSkeleton = () => {
  return (
    <>
        {[...Array(DEFAULT_FETCH_LIMIT / 2)].map((_, idx: number) => {
            return (
                <div
                    key={idx} 
                    className={`
                        bg-stone-700
                        animate-pulse
                        relative
                        flex
                        flex-col
                        aspect-[2/3]
                        min-w-[100px]
                        max-w-[200px]
                        md:min-w-[150px]
                        md:max-w-[250px]
                        w-full
                        rounded-sm
                        overflow-hidden
                        transition-all
                        max-h-[524px]
                        duration-150
                        hover:scale-[1.04]
                        hover:border
                        flex-wrap
                        hover:border-gray-400
                    `}
                />
            )
        })}
    </>
  )
}

export default MoviesListSkeleton;
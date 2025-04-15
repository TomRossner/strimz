import React from 'react';

interface GenresProps {
  genres: string[];
}

const Genres = ({genres = []}: GenresProps) => {
  return (
    <div className='flex gap-1 items-center flex-wrap mb-3'>
      {genres.map(genre => (
        <p key={genre} className='text-white text-sm py-1 px-2 bg-gray-500 rounded-md'>{genre}</p>
      ))}
    </div>
  )
}

export default Genres;
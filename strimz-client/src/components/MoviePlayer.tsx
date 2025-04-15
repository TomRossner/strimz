import React from 'react';
import Player from './Player';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { stopDownload } from '../services/movies';
import Button from './Button';

const MoviePlayer = ({ movieSrc }: { movieSrc: string | null; }) => {
  const [searchParams] = useSearchParams();
  const poster = searchParams.get('poster') as string;

  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
    stopDownload(searchParams.get('hash') as string)
      .catch(console.error);
  }

  const options = {
    autoplay: !!movieSrc,
    controls: true,
    fluid: true,
    responsive: true,
    poster,
    controlBar: {
      volumePanel: {
        inline: false
      }
    },
    sources: movieSrc ? [
      {
        src: movieSrc,
        type: "video/mp4"
      }
    ] : [],
  }

  return (
    <>
      <Button
        onClick={handleBack}
        className='bg-stone-800 hover:bg-stone-700 py-2 m-2'
      >
        Back
      </Button>

      <Player options={options} />
    </>
  )
}

export default MoviePlayer;
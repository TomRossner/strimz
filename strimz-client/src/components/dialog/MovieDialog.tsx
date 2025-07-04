import React, { useCallback, useEffect } from 'react';
import CloseButton from '../CloseButton';
import CoverImage from './CoverImage';
import MovieInfoPanel from './MovieInfoPanel';
import DialogBackground from './DialogBackground';
import Dialog from '../Dialog';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectMovieModal, selectSummaryModal, selectTrailerModal } from '../../store/modals/modals.selectors';
import { closeModal } from '../../store/modals/modals.slice';
import { setSelectedMovie } from '../../store/movies/movies.slice';
import { selectMovie } from '../../store/movies/movies.selectors';
import Overlay from '../Overlay';
import TrailerPlayer from '../TrailerPlayer';
import SummaryDialog from './SummaryDialog';

const MovieDialog = () => {
  const isOpen = useAppSelector(selectMovieModal);
  const dispatch = useAppDispatch();

  const handleClose = useCallback(() => {
    dispatch(closeModal('movie'));
    dispatch(setSelectedMovie(null));
  }, [dispatch]);

  const isTrailerDialogOpen = useAppSelector(selectTrailerModal);
  const isSummaryModalOpen = useAppSelector(selectSummaryModal);

  const movie = useAppSelector(selectMovie);

  useEffect(() => {
      if (isOpen) {
          window.addEventListener('keydown', (ev) => ev.key === 'Escape' && handleClose());
      }

      return () => {
          window.removeEventListener('keydown', (ev) => ev.key === 'Escape' && handleClose());
      }
  }, [isOpen, handleClose]);
    
  return (
    <Dialog isOpen={isOpen} size='large'>
      <Overlay
        active={isSummaryModalOpen || isTrailerDialogOpen}
        onClick={() => isTrailerDialogOpen ? dispatch(closeModal('trailer')) : undefined}
        className='backdrop-blur-[2px]'
      />
      
      <TrailerPlayer isOpen={isTrailerDialogOpen} title={movie?.title ?? ""} yt_trailer_code={movie?.yt_trailer_code} />
      <SummaryDialog isOpen={isSummaryModalOpen} summary={movie?.summary || ""} />
      
      {movie && (
        <>
          <CloseButton onClose={handleClose} />
          <CoverImage imageSrc={movie.large_cover_image} />
          <MovieInfoPanel close={handleClose} movie={movie} />
          <DialogBackground imgSrc={movie.background_image} />
        </>
      )}
    </Dialog>
  )
}

export default MovieDialog;
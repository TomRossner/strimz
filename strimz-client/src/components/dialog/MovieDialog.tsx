import React, { useCallback, useEffect } from 'react';
import CloseButton from '../CloseButton';
import CoverImage from './CoverImage';
import MovieInfoPanel from './MovieInfoPanel';
import DialogBackground from './DialogBackground';
import Dialog from '../Dialog';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectMovieModal, selectTrailerModal } from '../../store/modals/modals.selectors';
import { closeModal } from '../../store/modals/modals.slice';
import { setSelectedMovie } from '../../store/movies/movies.slice';
import { selectMovie } from '../../store/movies/movies.selectors';

const MovieDialog = () => {
  const isOpen = useAppSelector(selectMovieModal);
  const dispatch = useAppDispatch();

  const handleClose = useCallback(() => {
    dispatch(closeModal('movie'));
    dispatch(setSelectedMovie(null));
  }, [dispatch]);

  const isTrailerDialogOpen = useAppSelector(selectTrailerModal);

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
    <Dialog isOpen={isOpen} size='large' className={isTrailerDialogOpen ? 'opacity-40 pointer-events-none' : ''}>
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
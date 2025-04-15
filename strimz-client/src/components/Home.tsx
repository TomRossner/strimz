import React, { useEffect, useMemo, useState } from 'react';
import Overlay from './Overlay';
import TrailerPlayer from './TrailerPlayer';
import MovieDialog from './dialog/MovieDialog';
import FiltersDialog from './FiltersDialog';
import Nav from './Nav';
import MoviesList from './MoviesList';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectFiltersModal, selectMenu, selectMovieModal, selectTrailerModal } from '../store/modals/modals.selectors';
import { fetchUserSettings } from '../store/settings/settings.slice';
import ErrorDialog from './ErrorDialog';
import { selectMovie } from '../store/movies/movies.selectors';
import BackToTop from './BackToTop';
import { setError, setFilters } from '../store/movies/movies.slice';
import { DEFAULT_PARAMS } from '../utils/constants';

const Home = () => {
    const dispatch = useAppDispatch();

    const isFiltersDialogOpen = useAppSelector(selectFiltersModal);
    const isMovieDialogOpen = useAppSelector(selectMovieModal);
    const isTrailerDialogOpen = useAppSelector(selectTrailerModal);
    const isMenuOpen = useAppSelector(selectMenu);

    const selectedMovie = useAppSelector(selectMovie);

    const isOverlayActive = useMemo(() => {
        return isFiltersDialogOpen || isMenuOpen || isMovieDialogOpen || isTrailerDialogOpen;
    }, [isFiltersDialogOpen, isMenuOpen, isMovieDialogOpen, isTrailerDialogOpen]);


    const handleErrorClose = () => {
      dispatch(setFilters(DEFAULT_PARAMS));
      dispatch(setError(''));
    }

    useEffect(() => {
        dispatch(fetchUserSettings());
    }, [dispatch]);

    const [isBackToTopBtnVisible, setIsBackToTopBtnVisible] = useState<boolean>(false);

    useEffect(() => {
      const handleBackToTopButton = () => {
        return setIsBackToTopBtnVisible(window.scrollY > (window.screenY + 800));
      }
  
      window.addEventListener('scroll', handleBackToTopButton);
  
      return () => {
        window.removeEventListener('scroll', handleBackToTopButton);
      }
    }, []);

  return (
    <>
      <Overlay active={isOverlayActive} />

      <BackToTop isVisible={isBackToTopBtnVisible} />

      <ErrorDialog onClose={handleErrorClose} />
      <TrailerPlayer title={selectedMovie?.title ?? ""} yt_trailer_code={selectedMovie?.yt_trailer_code} />
      <MovieDialog />
      <FiltersDialog />

      <Nav />

      <MoviesList />
    </>
  )
}

export default Home;
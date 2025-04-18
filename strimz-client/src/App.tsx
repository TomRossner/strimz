import React, { useCallback, useEffect, useMemo, useState } from 'react';
import SplashScreen from './components/SplashScreen';
import { ping } from './utils/ping';
import Home from './components/Home';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { fetchFavoritesAsync, fetchWatchListAsync, setError, setFilters } from './store/movies/movies.slice';
import { isAxiosError } from 'axios';
import { selectError, selectFilters, selectMovie, selectMoviesMap } from './store/movies/movies.selectors';
import ErrorDialog from './components/ErrorDialog';
import { Route, Routes, useLocation } from 'react-router-dom';
import WatchMoviePage from './pages/Watch';
import SettingsPage from './pages/Settings';
import FavoritesPage from './pages/Favorites';
import ReportsPage from './pages/Reports';
import WatchListPage from './pages/WatchList';
import { getFavorites, getWatchList } from './services/localStorage';
import FiltersDialog from './components/FiltersDialog';
import MovieDialog from './components/dialog/MovieDialog';
import TrailerPlayer from './components/TrailerPlayer';
import { DEFAULT_PARAMS } from './utils/constants';
import Overlay from './components/Overlay';
import { selectFiltersModal, selectMenu, selectMovieModal, selectTrailerModal } from './store/modals/modals.selectors';
import Nav from './components/Nav';
import Menu from './components/Menu';

const MoviesPage = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const dispatch = useAppDispatch();

  const error = useAppSelector(selectError);
  const moviesMap = useAppSelector(selectMoviesMap);
  const filters = useAppSelector(selectFilters);

  const {pathname} = useLocation();

  const isFiltersDialogOpen = useAppSelector(selectFiltersModal);
  const isMovieDialogOpen = useAppSelector(selectMovieModal);
  const isTrailerDialogOpen = useAppSelector(selectTrailerModal);
  const isMenuOpen = useAppSelector(selectMenu);

  const isOverlayActive = useMemo(() => {
      return isFiltersDialogOpen || isMenuOpen || isMovieDialogOpen || isTrailerDialogOpen;
  }, [isFiltersDialogOpen, isMenuOpen, isMovieDialogOpen, isTrailerDialogOpen]);

  const selectedMovie = useAppSelector(selectMovie);

  const handleErrorClose = () => {
      dispatch(setFilters(DEFAULT_PARAMS));
      dispatch(setError(''));
  }

  const handleError = useCallback((err: unknown) => {
    console.error(err);
    return dispatch(setError(
      isAxiosError(err) && typeof err.response?.data.error === 'string'
        ? err.response.data.error
        : "Server error. Please restart the app."
      ));
  }, [dispatch]);

  useEffect(() => {
    ping()
      .catch(handleError)
      .finally(() => (
        !moviesMap.size
          ? setTimeout(() => {
              setIsLoading(false);
            }, 1000)
          : setIsLoading(false)
      ));

      dispatch(fetchWatchListAsync(getWatchList()));
      dispatch(fetchFavoritesAsync(getFavorites()));
  }, []);

  if (error && !filters.query_term && !filters.genre) return (
    <ErrorDialog btnText='Quit' onClose={() => window.electronAPI.quitApp()} />
  )

  return isLoading && !moviesMap.size ? <SplashScreen /> : (
    <>
      <Overlay active={isOverlayActive} />
      <ErrorDialog onClose={handleErrorClose} />
      <TrailerPlayer title={selectedMovie?.title ?? ""} yt_trailer_code={selectedMovie?.yt_trailer_code} />
      <MovieDialog />
      <FiltersDialog />

      <Menu />
      <Nav withSearchBar={pathname === '/'} />

      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/watch/:slug' element={<WatchMoviePage />} />
        <Route path='/settings' element={<SettingsPage />} />
        <Route path='/favorites' element={<FavoritesPage />} />
        <Route path='/reports' element={<ReportsPage />} />
        <Route path='/watch-list' element={<WatchListPage />} />
      </Routes>
    </>
  )
}

export default MoviesPage;
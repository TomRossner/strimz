import React, { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react';
import SplashScreen from './components/SplashScreen';
import { ping } from './utils/ping';
import Home from './components/Home';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { fetchFavoritesAsync, fetchWatchListAsync, setError, setFilters } from './store/movies/movies.slice';
import { isAxiosError } from 'axios';
import { selectError, selectFilters, selectMoviesMap } from './store/movies/movies.selectors';
import ErrorDialog from './components/ErrorDialog';
import { Route, Routes, useLocation } from 'react-router-dom';
import { getFavorites, getWatchList } from './services/localStorage';
import FiltersDialog from './components/FiltersDialog';
import MovieDialog from './components/dialog/MovieDialog';
import { DEFAULT_PARAMS } from './utils/constants';
import Overlay from './components/Overlay';
import { selectFiltersModal, selectMenu, selectMovieModal, selectPlayTorrentPrompt, selectVpnModal } from './store/modals/modals.selectors';
import Nav from './components/Nav';
import Menu from './components/Menu';
import VpnReminderDialog from './components/VpnReminderDialog';
import { selectIsVpnActive } from './store/vpn/vpn.selectors';
import PlayTorrentPrompt from './components/PlayTorrentPrompt';
import { fetchUserSettings } from './store/settings/settings.slice';

const WatchMoviePage = lazy(() => import('./pages/Watch'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const FavoritesPage = lazy(() => import('./pages/Favorites'));
// const ReportsPage = lazy(() => import('./pages/Reports'));
const WatchListPage = lazy(() => import('./pages/WatchList'));

const MoviesPage = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const dispatch = useAppDispatch();

  const error = useAppSelector(selectError);
  const moviesMap = useAppSelector(selectMoviesMap);
  const filters = useAppSelector(selectFilters);

  const {pathname} = useLocation();

  const isFiltersDialogOpen = useAppSelector(selectFiltersModal);
  const isMovieDialogOpen = useAppSelector(selectMovieModal);
  const isMenuOpen = useAppSelector(selectMenu);
  const isVpnDialogOpen = useAppSelector(selectVpnModal);
  const isPlayTorrentPromptOpen = useAppSelector(selectPlayTorrentPrompt);

  const isOverlayActive = useMemo(() => {
    return (
      isFiltersDialogOpen ||
      isMenuOpen ||
      isMovieDialogOpen ||
      isVpnDialogOpen ||
      isPlayTorrentPromptOpen
    );
  }, [
    isFiltersDialogOpen,
    isMenuOpen,
    isMovieDialogOpen,
    isVpnDialogOpen,
    isPlayTorrentPromptOpen,
  ]);

  const isVpnActive = useAppSelector(selectIsVpnActive);

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
          ? setTimeout(() => setIsLoading(false), 1000)
          : setIsLoading(false)
      ));

    dispatch(fetchUserSettings());
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
      <MovieDialog />
      <FiltersDialog />
      <PlayTorrentPrompt />
      <VpnReminderDialog isActive={isVpnActive} />

      <Menu />
      <Nav withSearchBar={pathname === '/'} />

      <Suspense fallback={<SplashScreen />}>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/watch/:slug' element={<WatchMoviePage />} />
          <Route path='/settings' element={<SettingsPage />} />
          <Route path='/favorites' element={<FavoritesPage />} />
          {/* <Route path='/reports' element={<ReportsPage />} /> */}
          <Route path='/watch-list' element={<WatchListPage />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default MoviesPage;
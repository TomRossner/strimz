import React, { useCallback, useEffect, useState } from 'react';
import SplashScreen from './components/SplashScreen';
import { ping } from './utils/ping';
import Home from './components/Home';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { setError } from './store/movies/movies.slice';
import { isAxiosError } from 'axios';
import { selectError, selectFilters, selectMoviesMap } from './store/movies/movies.selectors';
import ErrorDialog from './components/ErrorDialog';
import { Route, Routes } from 'react-router-dom';
import WatchMoviePage from './pages/Watch';
import SettingsPage from './pages/Settings';
import FavoritesPage from './pages/Favorites';
import ReportsPage from './pages/Reports';
import WatchListPage from './pages/WatchList';

const MoviesPage = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const dispatch = useAppDispatch();
  const error = useAppSelector(selectError);
  const moviesMap = useAppSelector(selectMoviesMap);
  const filters = useAppSelector(selectFilters);

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
            }, 1200)
          : setIsLoading(false)
      ));
  }, []);

  if (error && !filters.query_term && !filters.genre) return (
    <ErrorDialog btnText='Quit' onClose={() => window.electronAPI.quitApp()} />
  )

  return isLoading && !moviesMap.size ? <SplashScreen /> : (
    <>
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
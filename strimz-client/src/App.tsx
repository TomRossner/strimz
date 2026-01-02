import React, { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
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
import { selectFiltersModal, selectMenu, selectMovieModal, selectPlayFromMagnetModal, selectPlayTorrentPrompt, selectVpnModal } from './store/modals/modals.selectors';
import Nav from './components/Nav';
import Menu from './components/Menu';
import VpnReminderDialog from './components/VpnReminderDialog';
import { selectIsVpnActive } from './store/vpn/vpn.selectors';
import PlayTorrentPrompt from './components/PlayTorrentPrompt';
import { fetchUserSettings } from './store/settings/settings.slice';
import PlayFromMagnetModal from './components/PlayFromMagnetModal';
import DownloadsPage from './pages/Downloads';
import { fetchAllDownloadsAsync, fetchDownloadedFilesAsync, setCompleted } from './store/downloads/downloads.slice';
import { createNewStreamClient } from './utils/createStreamClient';
import { selectSettings } from './store/settings/settings.selectors';
import { validateDownloadsCache, updateDownloadCompletion } from './utils/downloadsCache';
import { selectDownloads, selectDownloadedFiles, selectCompleted } from './store/downloads/downloads.selectors';
import { selectSocket } from './store/socket/socket.selectors';
import { DownloadProgressData } from './utils/types';

const WatchMoviePage = lazy(() => import('./pages/Watch'));
const WatchFilePage = lazy(() => import('./pages/WatchFile'));
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
  const isPlayFromMagnetModalOpen = useAppSelector(selectPlayFromMagnetModal);

  const isOverlayActive = useMemo(() => {
    return (
      isFiltersDialogOpen ||
      isMenuOpen ||
      isMovieDialogOpen ||
      isVpnDialogOpen ||
      isPlayTorrentPromptOpen ||
      isPlayFromMagnetModalOpen
    );
  }, [
    isFiltersDialogOpen,
    isMenuOpen,
    isMovieDialogOpen,
    isVpnDialogOpen,
    isPlayTorrentPromptOpen,
    isPlayFromMagnetModalOpen
  ]);

  const isVpnActive = useAppSelector(selectIsVpnActive);
  const settings = useAppSelector(selectSettings);

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

  const downloads = useAppSelector(selectDownloads);
  const downloadedFiles = useAppSelector(selectDownloadedFiles);
  const completed = useAppSelector(selectCompleted);
  const socket = useAppSelector(selectSocket);

  // Track which downloads we've already processed to avoid duplicate updates
  const processedCompletionsRef = useRef<Set<string>>(new Set());

  // Global listener for download completion - updates Redux store regardless of active page
  useEffect(() => {
    if (!socket?.id) return;

    const handleDownloadCompletion = (data: DownloadProgressData) => {
      const isCompleted = data.done || (data.progress !== undefined && data.progress >= 1.0);
      const hashLower = data.hash.toLowerCase();

      if (isCompleted && !processedCompletionsRef.current.has(hashLower)) {
        processedCompletionsRef.current.add(hashLower);

        // Update Redux store
        dispatch(setCompleted([...completed.filter(c => c !== hashLower), hashLower]));
        
        // Update cache
        updateDownloadCompletion(data.hash, true);
        
        // Fetch updated downloads list to sync with backend
        dispatch(fetchAllDownloadsAsync());
      }
    };

    socket.on('downloadProgress', handleDownloadCompletion);
    socket.on('downloadDone', handleDownloadCompletion);

    return () => {
      socket.off('downloadProgress', handleDownloadCompletion);
      socket.off('downloadDone', handleDownloadCompletion);
    };
  }, [socket, completed, dispatch]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Wait for all critical initialization operations to complete
        await Promise.allSettled([
          ping().catch(handleError),
          createNewStreamClient(),
          dispatch(fetchUserSettings()),
          dispatch(fetchAllDownloadsAsync()),
          dispatch(fetchWatchListAsync(getWatchList())),
          dispatch(fetchFavoritesAsync(getFavorites())),
        ]);
      } catch (error) {
        console.error('Error during app initialization:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [dispatch, handleError]);

  useEffect(() => {
    if (settings.downloadsFolderPath) {
      dispatch(fetchDownloadedFilesAsync(settings.downloadsFolderPath));
    }
  }, [settings.downloadsFolderPath, dispatch]);

  // Validate and update downloads cache after backend data is fetched
  useEffect(() => {
    if (downloads.length > 0 || downloadedFiles.length > 0) {
      // Validate cache against backend data
      // This updates completion status in cache based on backend state
      validateDownloadsCache(
        downloads.map(d => ({
          hash: d.hash,
          done: d.done || false,
          progress: d.progress || 0,
          paused: d.paused || false,
        })),
        downloadedFiles
      );
    }
  }, [downloads, downloadedFiles]);

  if (error && !filters.query_term && !filters.genre) return (
    <ErrorDialog btnText='Quit' onClose={() => window.electronAPI.quitApp()} />
  )

  return isLoading && !moviesMap.size ? <SplashScreen /> : (
    <>
      <Overlay active={isOverlayActive} />
      <ErrorDialog onClose={handleErrorClose} />
      <MovieDialog />
      <FiltersDialog />
      <PlayFromMagnetModal />
      <PlayTorrentPrompt />
      <VpnReminderDialog isActive={isVpnActive} />

      <Menu />
      <Nav withSearchBar={pathname === '/'} />

      <Suspense fallback={<SplashScreen />}>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/stream/:slug' element={<WatchMoviePage />} />
          <Route path='/watch-file' element={<WatchFilePage />} />
          <Route path='/settings' element={<SettingsPage />} />
          <Route path='/favorites' element={<FavoritesPage />} />
          {/* <Route path='/reports' element={<ReportsPage />} /> */}
          <Route path='/watch-list' element={<WatchListPage />} />
          <Route path='/downloads' element={<DownloadsPage />} />
        </Routes>
      </Suspense>
    </>
  )
}

export default MoviesPage;
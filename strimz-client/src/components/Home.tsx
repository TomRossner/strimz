import React, { useCallback, useEffect, useState } from 'react';
import MoviesList from './MoviesList';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import BackToTop from './BackToTop';
import { setUpdateStatus } from '@/store/updates/updates.slice';
import { openModal } from '@/store/modals/modals.slice';
import { selectIsVpnActive } from '@/store/vpn/vpn.selectors';
import { selectSocket } from '@/store/socket/socket.selectors';
import { io } from 'socket.io-client';
import { SERVER_URL } from '@/utils/constants';
import { setSocket } from '@/store/socket/socket.slice';
import { getTorrentData } from '@/services/movies';
import { selectSettings } from '@/store/settings/settings.selectors';
import { setExternalTorrent } from '@/store/movies/movies.slice';
import { selectExternalTorrent } from '@/store/movies/movies.selectors';
import Page from './Page';
import Container from './Container';
import PageTitle from './PageTitle';
import PageDescription from './PageDescription';

const Home = () => {
    const dispatch = useAppDispatch();
    const [isBackToTopBtnVisible, setIsBackToTopBtnVisible] = useState<boolean>(false);

    const isVpnActive = useAppSelector(selectIsVpnActive);

    const socket = useAppSelector(selectSocket);

    const settings = useAppSelector(selectSettings);

    const externalTorrent = useAppSelector(selectExternalTorrent);

    useEffect(() => {
      const handleBackToTopButton = () => {
        return setIsBackToTopBtnVisible(window.scrollY > (window.screenY + 800));
      }
  
      window.addEventListener('scroll', handleBackToTopButton);
  
      return () => {
        window.removeEventListener('scroll', handleBackToTopButton);
      }
    }, []);

    useEffect(() => {
      if (!socket) {
        const newSocket = io(SERVER_URL, {
          transports: ['websocket'],
        });

        dispatch(setSocket(newSocket));
      }
    }, []);

    const handleGetTorrentData = useCallback(async (path: string) => {
        if (!settings.downloadsFolderPath.length || externalTorrent) {
          return;
        }

        const {data: {hash, title, imdbCode}} = await getTorrentData(path, settings.downloadsFolderPath);
        
        dispatch(setExternalTorrent({hash, title, imdbCode}));
        dispatch(openModal('playTorrentPrompt'));
    }, [settings.downloadsFolderPath, dispatch, externalTorrent]);

    useEffect(() => {
      if (!isVpnActive) {
        dispatch(openModal('vpn'));
      }
    }, [dispatch, isVpnActive]);

    useEffect(() => {
      const checkingHandler = () => dispatch(setUpdateStatus('checking'));
      const availableHandler = () => dispatch(setUpdateStatus('available'));
      const notAvailableHandler = () => dispatch(setUpdateStatus('up-to-date'));
      const updateDownloadedHandler = () => dispatch(setUpdateStatus('downloaded'));
      
      const skippedHandler = (msg: string) => {
          dispatch(setUpdateStatus('skipped'));
          console.log(msg);
      }

      const failedHandler = (msg: string) => {
          dispatch(setUpdateStatus('failed'));
          console.error(msg);
      }
  
      window.electronAPI.onCheckingForUpdate(checkingHandler);
      window.electronAPI.onUpdateAvailable(availableHandler);
      window.electronAPI.onUpdateNotAvailable(notAvailableHandler);
      window.electronAPI.onUpdateDownloaded(updateDownloadedHandler);
      window.electronAPI.onUpdateCheckSkipped(skippedHandler);
      window.electronAPI.onUpdateCheckFailed(failedHandler);

      window.electronAPI.ipcRenderer.send('subscribe-to-updates');
  
      return () => {
          // Use removeAllListeners to ensure all listeners are removed
          // Some listeners use wrapper functions in preload.js which prevents
          // removeListener from matching correctly
          window.electronAPI.ipcRenderer.removeAllListeners('checking-for-update');
          window.electronAPI.ipcRenderer.removeAllListeners('update-available');
          window.electronAPI.ipcRenderer.removeAllListeners('update-not-available');
          window.electronAPI.ipcRenderer.removeAllListeners('update-downloaded');
          window.electronAPI.ipcRenderer.removeAllListeners('update-check-skipped');
          window.electronAPI.ipcRenderer.removeAllListeners('update-check-failed');
      }
  }, [dispatch]);

  useEffect(() => {
    if (settings.downloadsFolderPath.length) {
      const handleExternalTorrent = async (path: string) => await handleGetTorrentData(path);
      window.electronAPI.onExternalTorrent(handleExternalTorrent);
      
      return () => {
        // Use removeAllListeners because the wrapper function in preload.js
        // prevents removeListener from matching the exact handler
        window.electronAPI.ipcRenderer.removeAllListeners('external-torrent');
      };
    }
  }, [settings, handleGetTorrentData]);

  return (
    <Page>
      <Container id='libraryPage' className='grow'>
        <PageTitle>
          <span className='grow -mt-1'>Library</span>
        </PageTitle>
        
        <PageDescription>All your movies, one place. Browse your library and continue watching instantly.</PageDescription>
        
        <BackToTop isVisible={isBackToTopBtnVisible} />
        <MoviesList />
      </Container>
    </Page>
  )
}

export default Home;
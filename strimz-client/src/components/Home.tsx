import React, { useEffect, useState } from 'react';
import MoviesList from './MoviesList';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchUserSettings } from '../store/settings/settings.slice';
import BackToTop from './BackToTop';
import { setUpdateStatus } from '@/store/updates/updates.slice';
import { openModal } from '@/store/modals/modals.slice';
import { selectIsVpnActive } from '@/store/vpn/vpn.selectors';
import { selectSocket } from '@/store/socket/socket.selectors';
import { io } from 'socket.io-client';
import { SERVER_URL } from '@/utils/constants';
import { setSocket } from '@/store/socket/socket.slice';

const Home = () => {
    const dispatch = useAppDispatch();
    const [isBackToTopBtnVisible, setIsBackToTopBtnVisible] = useState<boolean>(false);

    const isVpnActive = useAppSelector(selectIsVpnActive);

    const socket = useAppSelector(selectSocket);

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
    }, [socket, dispatch]);

    useEffect(() => {
      if (!isVpnActive) {
        dispatch(openModal('vpn'));
      }
    }, [dispatch, isVpnActive]);

    useEffect(() => {
      dispatch(fetchUserSettings());

      const checkingHandler = () => dispatch(setUpdateStatus('checking'));
      const availableHandler = () => dispatch(setUpdateStatus('available'));
      const notAvailableHandler = () => dispatch(setUpdateStatus('up-to-date'));
      const downloadedHandler = () => dispatch(setUpdateStatus('downloaded'));
      
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
      window.electronAPI.onUpdateDownloaded(downloadedHandler);
      window.electronAPI.onUpdateCheckSkipped(skippedHandler);
      window.electronAPI.onUpdateCheckFailed(failedHandler);

      window.electronAPI.ipcRenderer.send('subscribe-to-updates');
  
      return () => {
          window.electronAPI.offCheckingForUpdate(checkingHandler);
          window.electronAPI.offUpdateAvailable(availableHandler);
          window.electronAPI.offUpdateNotAvailable(notAvailableHandler);
          window.electronAPI.offUpdateDownloaded(downloadedHandler);
          window.electronAPI.offUpdateCheckSkipped(skippedHandler);
          window.electronAPI.offUpdateCheckFailed(failedHandler);
      }
  }, [dispatch]);

  return (
    <>
      <BackToTop isVisible={isBackToTopBtnVisible} />
      <MoviesList />
    </>
  )
}

export default Home;
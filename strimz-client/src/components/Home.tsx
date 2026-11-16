import React, { useCallback, useEffect, useState } from 'react';
import MoviesList from './MoviesList';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import BackToTop from './BackToTop';
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
import InTheatresCarousel from './InTheatresCarousel';
import HomeRails, { BecauseYouWatched, ContinueWatching, LastWatched } from './HomeRails';

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

        <ContinueWatching />
        <LastWatched />
        <BecauseYouWatched />
        <InTheatresCarousel />
        <HomeRails />
        
        <BackToTop isVisible={isBackToTopBtnVisible} />
        <MoviesList />
      </Container>
    </Page>
  )
}

export default Home;
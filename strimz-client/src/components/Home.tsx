import React, { useEffect, useState } from 'react';
import MoviesList from './MoviesList';
import { useAppDispatch } from '../store/hooks';
import { fetchUserSettings } from '../store/settings/settings.slice';
import BackToTop from './BackToTop';

const Home = () => {
    const dispatch = useAppDispatch();

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
      <BackToTop isVisible={isBackToTopBtnVisible} />
      <MoviesList />
    </>
  )
}

export default Home;
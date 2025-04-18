import React from 'react';
import LoadingIcon from './LoadingIcon';
import { getRandomPhrase } from '../utils/loadingPhrases';
import Popcorn from "../assets/popcornBucket.png";
import { useAppDispatch } from '../store/hooks';
import { closeModal } from '../store/modals/modals.slice';
import { useNavigate } from 'react-router-dom';
import BackButton from './BackButton';

const LoadingScreen = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleClose = () => {
    dispatch(closeModal('movie'));
    navigate(-1);
  }

  return (
    <section className='relative w-full h-[100vh] flex items-center justify-center flex-col'>
        <BackButton onClick={handleClose} className='absolute top-1 left-1' />

        <img
            src={Popcorn}
            width={480}
            height={180}
            className='animate-pulse aspect-auto m-auto -z-10 fixed top-0 bottom-0 left-0 right-0 -rotate-[10deg]'
            alt=''
        />

        <p className='text-2xl italic font-light text-center absolute bottom-10 text-white flex items-center gap-3'>
            <LoadingIcon />
            {getRandomPhrase()}
        </p>
    </section>
  )
}

export default LoadingScreen;
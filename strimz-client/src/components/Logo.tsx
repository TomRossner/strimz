import { useAppDispatch } from '@/store/hooks';
import { APP_NAME, DEFAULT_PARAMS } from '../utils/constants';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';
import { setFilters } from '@/store/movies/movies.slice';

interface LogoProps {
    className?: string;
}

const Logo = ({className}: LogoProps) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleClick = () => {
    navigate("/");
    dispatch(setFilters(DEFAULT_PARAMS));
  }

  return (
    <h1 onClick={handleClick} className={twMerge(`cursor-pointer font-fascinate px-3 inline text-4xl font-semibold text-white w-full md:w-fit text-center md:text-start md:grow-0 grow ${className}`)}>
        {APP_NAME}
    </h1>
  )
}

export default Logo;
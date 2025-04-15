import React, { useCallback } from 'react';
import Search from './Search';
import { FaFilter } from 'react-icons/fa';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { closeModal, openModal } from '../store/modals/modals.slice';
import { selectMovieModal } from '../store/modals/modals.selectors';
import { twMerge } from 'tailwind-merge';
import { GiHamburgerMenu } from 'react-icons/gi';
import Menu from './Menu';
import Logo from './Logo';
import Button from './Button';

const Nav = () => {
  const dispatch = useAppDispatch();
  const isMovieDialogOpen = useAppSelector(selectMovieModal);

  const handleOpen = useCallback(() => {
    if (isMovieDialogOpen) {
      dispatch(closeModal('movie'));
    }

    dispatch(openModal('filters'));
  }, [dispatch, isMovieDialogOpen]);

  return (
    <nav className={twMerge(`relative my-1 px-2 md:pt-1 w-full flex items-center gap-2 justify-between flex-wrap md:flex-nowrap`)}>
      <Menu />
      
      <Button onClick={() => dispatch(openModal('menu'))} className='text-xl text-slate-300 py-2 absolute top-0.5 left-0.5 md:relative'>
        <GiHamburgerMenu />
      </Button>

      <Logo />

      <div className='grow' />

      <section id='searchSection' className='flex w-full md:w-fit items-center gap-1'>
        <Button
          title='Filters'
          onMouseDown={handleOpen}
          className='md:hover:bg-stone-600 active:bg-stone-600 active:text-white py-1.5 text-md'
        >
          <FaFilter/>
        </Button>
        
        <Search />
      </section>
    </nav>
  )
}

export default Nav;
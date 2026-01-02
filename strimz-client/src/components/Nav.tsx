import React, { useCallback } from 'react';
import Search from './Search';
import { FaFilter } from 'react-icons/fa';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { closeModal, openModal } from '../store/modals/modals.slice';
import { selectMovieModal } from '../store/modals/modals.selectors';
import { twMerge } from 'tailwind-merge';
import { GiHamburgerMenu } from 'react-icons/gi';
import Logo from './Logo';
import Button from './Button';
import { Link, useLocation } from 'react-router-dom';

interface NavProps {
  withSearchBar: boolean;
  className?: string;
}

const Nav = ({withSearchBar = true, className}: NavProps) => {
  const dispatch = useAppDispatch();
  const isMovieDialogOpen = useAppSelector(selectMovieModal);

  const {pathname} = useLocation();

  const handleOpen = useCallback(() => {
    if (isMovieDialogOpen) {
      dispatch(closeModal('movie'));
    }

    dispatch(openModal('filters'));
  }, [dispatch, isMovieDialogOpen]);

  const menuItems = [
    {
      title: 'Library',
      link: '/',
    },
    {
      title: 'Favorites',
      link: '/favorites',
    },
    {
      title: 'Watch list',
      link: '/watch-list',
    },
    {
      title: 'Downloads',
      link: '/downloads',
    },
  ]

  const isPlayerPage = pathname.toLowerCase().startsWith('/stream/') || pathname.toLowerCase().startsWith('/watch-file');

  return (
    <nav
      hidden={isPlayerPage}
      className={twMerge(`
        sticky
        top-0
        left-0
        bg-stone-900
        md:pb-1
        md:pt-1
        md:px-1
        py-1.5
        px-2
        w-full
        flex
        z-10
        items-center
        gap-1
        flex-wrap
        md:flex-nowrap
        shadow-xl
        shadow-stone-950
        ${className}
      `)}
    >
      <Button onClick={() => dispatch(openModal('menu'))} className='text-xl text-stone-300 bg-stone-700 hover:bg-stone-600 py-2 absolute md:top-0 md:left-0.5 top-2 left-2 md:relative'>
        <GiHamburgerMenu />
      </Button>

      <Logo />

      <ul className='hidden items-center gap-1 grow lg:flex'>
        {
          menuItems.map(({title, link}, i) => {
            const isActive: boolean = pathname.endsWith(link);

            return (
              <Link
                key={i}
                to={link}
                className={twMerge(`px-4 py-1 hover:bg-stone-800 rounded-sm transition-colors duration-150 cursor-pointer text-stone-300 hover:text-stone-50 ${isActive && 'font-bold bg-stone-800 text-white'}`)}
              >
                {title}
              </Link>
            )
          })
        }
      </ul>

      <div className='grow' />

      {withSearchBar && (
        <section id='searchSection' className='flex w-full md:w-fit items-center gap-2'>
          <Button
            title='Filters'
            onMouseDown={handleOpen}
            className='md:hover:bg-stone-600 active:bg-stone-600 active:text-white py-1.5 text-md'
          >
            <FaFilter/>
          </Button>
          
          <Search />
        </section>
      )}

    </nav>
  )
}

export default Nav;
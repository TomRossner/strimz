import { useAppDispatch, useAppSelector } from '@/store/hooks';
import Container from '../components/Container';
import Page from '../components/Page';
import PageTitle from '../components/PageTitle';
import React from 'react';
import { selectFavorites } from '@/store/movies/movies.selectors';
import { twMerge } from 'tailwind-merge';
import MovieCard from '@/components/MovieCard';
import { openModal } from '@/store/modals/modals.slice';
import MoviesListSkeleton from '@/components/MoviesListSkeleton';
import CloseButton from '@/components/CloseButton';
import { useNavigate } from 'react-router-dom';

const FavoritesPage = () => {
  const favorites = useAppSelector(selectFavorites);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  return (
    <Page>
      <Container id='favoritesPage'>
        <PageTitle >
          <CloseButton onClose={() => navigate(-1)} className='md:block w-fit text-lg py-1 text-stone-400 relative border-none' text='Back' />
          Favorites
        </PageTitle>

        {favorites.size
          ? (
            <div
              className={twMerge(`
                grid
                grid-cols-3
                xs:grid-cols-4
                sm:grid-cols-3
                md:grid-cols-4
                lg:grid-cols-5
                xl:grid-cols-7
                2xl:grid-cols-8
                gap-3
                w-full
                p-2
                min-h-auto
                transition-opacity
                duration-100
              `)}
            >
              {favorites.size
                ? (
                  <>
                    {Array.from(favorites.values()).map(movie => {
                      return <MovieCard key={movie.id} movie={movie} setOpen={() => dispatch(openModal('movie'))} />
                    })}
                  </>
                )
                : <MoviesListSkeleton />
              }
            </div>
          ) : (
            <p className='text-xl font-semibold text-stone-700 text-center mt-10'>You do not have any favorites</p>
          )
        }
      </Container>
    </Page>
  )
}

export default FavoritesPage;
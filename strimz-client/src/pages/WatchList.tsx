import Container from '../components/Container';
import Page from '../components/Page';
import PageTitle from '../components/PageTitle';
import React from 'react';
import BackButton from '@/components/BackButton';
import PageDescription from '@/components/PageDescription';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectWatchList } from '@/store/movies/movies.selectors';
import { twMerge } from 'tailwind-merge';
import MovieCard from '@/components/MovieCard';
import MoviesListSkeleton from '@/components/MoviesListSkeleton';
import { openModal } from '@/store/modals/modals.slice';

const WatchListPage = () => {
  const dispatch = useAppDispatch();
  const watchList = useAppSelector(selectWatchList);
  return (
    <Page>
      <Container id='watchListPage'>
        <PageTitle>
          <BackButton />
          <span className='grow -mt-1'>Watch list</span>
        </PageTitle>

        <PageDescription>Save movies you plan to watch later.</PageDescription>

        {watchList.size
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
              {watchList.size
                ? (
                  <>
                    {Array.from(watchList.values()).map(movie => {
                      return <MovieCard key={movie.id} movie={movie} setOpen={() => dispatch(openModal('movie'))} />
                    })}
                  </>
                )
                : <MoviesListSkeleton />
              }
            </div>
          ) : (
            <p className='text-xl font-semibold text-stone-700 text-center mt-10'>Your watch list is empty</p>
          )
        }
      </Container>
    </Page>
  )
}

export default WatchListPage;
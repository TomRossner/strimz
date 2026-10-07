import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import Container from '@/components/Container';
import MovieCard from '@/components/MovieCard';
import Page from '@/components/Page';
import PageDescription from '@/components/PageDescription';
import PageTitle from '@/components/PageTitle';
import { createCustomList, deleteCustomList, getLibrarySnapshot, removeMovieFromList, subscribeLibrary } from '@/services/library';
import { useAppDispatch } from '@/store/hooks';
import { openModal } from '@/store/modals/modals.slice';
import React, { FormEvent, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';

const ListsPage = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { lists } = useSyncExternalStore(subscribeLibrary, getLibrarySnapshot);
    const [name, setName] = useState('');
    const [activeId, setActiveId] = useState<string | null>(null);
    const active = lists.find((list) => list.id === activeId) || lists[0];

    const handleCreate = (ev: FormEvent) => {
        ev.preventDefault();
        if (!name.trim()) return;
        const list = createCustomList(name);
        setActiveId(list.id);
        setName('');
    };

    return (
        <Page>
            <Container id='listsPage' className='grow'>
                <PageTitle>
                    <BackButton cb={() => navigate(-1)} />
                    <span className='grow -mt-1'>Lists</span>
                </PageTitle>
                <PageDescription>Group movies into your own lists.</PageDescription>

                <form onSubmit={handleCreate} className='flex gap-2 w-full'>
                    <input
                        value={name}
                        onChange={(ev) => setName(ev.target.value)}
                        placeholder='New list name'
                        className='grow bg-stone-800 text-white px-2 py-1 rounded-sm outline-none'
                    />
                    <Button type='submit' className='bg-blue-500 hover:bg-blue-400'>Create</Button>
                </form>

                {lists.length === 0 ? (
                    <p className='text-xl font-semibold text-stone-700 text-center mt-10'>No lists yet</p>
                ) : (
                    <div className='flex flex-col gap-4 w-full'>
                        <div className='flex gap-2 flex-wrap'>
                            {lists.map((list) => (
                                <Button
                                    key={list.id}
                                    onClick={() => setActiveId(list.id)}
                                    className={active?.id === list.id ? 'bg-blue-500' : 'bg-stone-800'}
                                >
                                    {list.name} ({list.movies.length})
                                </Button>
                            ))}
                        </div>

                        {active && (
                            <div className='flex flex-col gap-3'>
                                <div className='flex justify-between items-center'>
                                    <h2 className='text-white text-lg'>{active.name}</h2>
                                    <Button onClick={() => deleteCustomList(active.id)} className='bg-stone-800 text-sm'>Delete list</Button>
                                </div>
                                {active.movies.length === 0 ? (
                                    <p className='text-stone-500'>Add movies from a title&apos;s details.</p>
                                ) : (
                                    <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3'>
                                        {active.movies.map((movie) => (
                                            <div key={movie.id} className='flex flex-col gap-1'>
                                                <MovieCard movie={movie} setOpen={() => dispatch(openModal('movie'))} />
                                                <Button onClick={() => removeMovieFromList(active.id, movie.id)} className='text-xs bg-stone-800'>Remove</Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Container>
        </Page>
    );
};

export default ListsPage;

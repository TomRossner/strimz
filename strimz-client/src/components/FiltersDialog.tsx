import React, { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Dialog from './Dialog';
import { DEFAULT_PAGE, DEFAULT_PARAMS, DEFAULT_QUALITY } from '../utils/constants';
import CloseButton from './CloseButton';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectFiltersModal } from '../store/modals/modals.selectors';
import { closeModal } from '../store/modals/modals.slice';
import { ALL_GENRES } from '../utils/genres';
import { selectFilters } from '../store/movies/movies.selectors';
import { setFilters } from '../store/movies/movies.slice';
import { twMerge } from 'tailwind-merge';
import { Filters } from '../utils/types';
import { QUALITIES } from '../utils/qualities';
import { TQuality } from '../services/movies';
import Button from './Button';

const FiltersDialog = () => {
    const isOpen = useAppSelector(selectFiltersModal);
    const dispatch = useAppDispatch();

    const [formValues, setFormValues] = useState<Filters>(DEFAULT_PARAMS);
    
    const filters = useAppSelector(selectFilters);

    const values: Filters = useMemo(() => ({
        ...formValues,
        query_term: filters.query_term,
        page: DEFAULT_PAGE,
        quality:
            formValues.quality
                ? formValues.quality.split(",").length === Object.values(QUALITIES).length
                    ? "All"
                    : formValues.quality
                : DEFAULT_QUALITY
    }), [formValues, filters]);

    const handleSubmit = useCallback((ev: FormEvent<HTMLFormElement>) => {
        ev.preventDefault();

        dispatch(setFilters(values));
        dispatch(closeModal('filters'));
    }, [values, dispatch]);

    const handleClose = useCallback(() => {
        dispatch(closeModal('filters'));
    }, [dispatch]);
    
    const handleGenreToggle = useCallback((genre: string) => {
        if (formValues.genre.includes(genre)) {
            const newGenre = formValues.genre
                .split(',')
                .filter(g => g !== genre)
                .join(',');
    
            setFormValues(formValues => ({
                ...formValues,
                genre: newGenre,
            }));

            return;
        } else {
            setFormValues(formValues => ({
                ...formValues,
                genre: formValues.genre ? `${formValues.genre},${genre}` : genre,
            }));
        }
    }, [formValues]);

    const handleQualityChange = useCallback((ev: ChangeEvent<HTMLInputElement>) => {
        const value = ev.target.value;
    
        if (formValues.quality.includes(value)) {
            const newQuality = formValues.quality
                .split(',')
                .filter(q => q !== value)
                .join(',');
    
            setFormValues(formValues => ({
                ...formValues,
                quality: newQuality,
            }));

            return;
        } else if (formValues.quality === DEFAULT_QUALITY) {
            setFormValues(formValues => ({
                ...formValues,
                quality: value,
            }));

            return;
        } else {
            setFormValues(formValues => ({
                ...formValues,
                quality: formValues.quality ? `${formValues.quality},${value}` : value,
            }));
        }
    }, [formValues]);

    useEffect(() => {
        if (formValues.quality === DEFAULT_QUALITY) {
            setFormValues(formValues => ({
                ...formValues,
                quality: Object.values(QUALITIES).join(","),
            }));
        }
    }, [formValues.quality]);

    useEffect(() => {
        if (isOpen) {
            setFormValues(filters);
        }
    }, [isOpen, filters]);

  return (
    <Dialog isOpen={isOpen} size='medium' title={"Filters"}>
        <CloseButton onClose={handleClose} className='md:block absolute p-1' />

        <form onSubmit={handleSubmit} className='w-full p-2 text-white flex flex-col gap-3'>
            <p>Genres ({formValues.genre ? formValues.genre.split(",").length : 0})</p>

            <div className='flex gap-1 items-center flex-wrap'>
                {ALL_GENRES.map(genre => {
                    const isChecked = formValues.genre.includes(genre);
                    return (
                        <div key={genre} className="my-0.5">
                            <label
                                htmlFor={genre}
                                className={twMerge(`
                                    rounded-sm
                                    cursor-pointer
                                    hover:bg-gray-700
                                    px-2
                                    py-1
                                    text-white
                                    text-center
                                    ${isChecked ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-500"}
                                `)}
                            >
                                {genre}
                            </label>

                            <input
                                type="checkbox"
                                id={genre}
                                value={genre}
                                checked={isChecked}
                                onChange={() => handleGenreToggle(genre)}
                                className="hidden"
                            />
                        </div>
                    );
                })}
            </div>

            <p>Quality</p>
            <div className='flex gap-1 flex-col'>
                {Array.from(Object.keys(QUALITIES).toReversed().map(q => {
                    const isChecked = formValues.quality.includes(q as TQuality);
                    return (
                        <div key={q} className='flex gap-1 items-center'>
                            <input type="checkbox" value={q} id={q} name={q} checked={isChecked} onChange={handleQualityChange} />
                            <label htmlFor={q} className='pl-1 pr-2'>{q === '2160p' ? '4K' : q}</label>
                        </div>
                    )
                }))}
            </div>

            {/* <p>Rating</p>
            <div className='flex gap-1'>

            </div> */}

            <div className='flex gap-1 w-full justify-end items-center'>
                <Button
                    type="submit"
                    className='bg-blue-500 hover:bg-blue-400 active:bg-blue-400 active:text-white'
                >
                    Apply changes
                </Button>
                <Button
                    type="reset"
                    onClick={handleClose}
                    className='bg-stone-600 hover:bg-stone-700 active:bg-stone-700 active:text-white'
                >
                    Close
                </Button>
            </div>
        </form>
    </Dialog>
  )
}

export default FiltersDialog;
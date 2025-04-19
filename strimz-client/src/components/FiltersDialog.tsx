import React, { FormEvent, useCallback, useReducer, useState } from 'react';
import Dialog from './Dialog';
import { DEFAULT_GENRE, DEFAULT_ORDER_BY, DEFAULT_PAGE, DEFAULT_QUALITY, DEFAULT_RATING, DEFAULT_SORT_BY, MAX_STARS } from '../utils/constants';
import CloseButton from './CloseButton';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectFiltersModal } from '../store/modals/modals.selectors';
import { closeModal } from '../store/modals/modals.slice';
import { ALL_GENRES } from '../utils/genres';
import { setFilters } from '../store/movies/movies.slice';
import { twMerge } from 'tailwind-merge';
import { Filters } from '../utils/types';
import { QUALITIES } from '../utils/qualities';
import Button from './Button';
import { BsChevronDown } from 'react-icons/bs';
import { OrderBy, SortBy, TOrderBy, TSortBy } from '@/services/movies';
import { selectFilters, selectQuery } from '@/store/movies/movies.selectors';

type DropdownType = keyof Omit<Filters, "page" | "limit" | "query_term" | "sort_by">;

type DropdownState = {
    [k in keyof Omit<Filters, "page" | "limit" | "query_term" | "sort_by">]: boolean;
}

type DropdownAction = { type: DropdownType | 'close_all' };

const dropdownsReducer = (state: DropdownState, action: DropdownAction): DropdownState => {
    if (action.type === 'close_all') {
        return Object.fromEntries(Object.keys(state).map(key => [key, false])) as DropdownState;
    }
    
    return Object.fromEntries(
        Object.keys(state).map(key => [key, key === action.type])
    ) as DropdownState;
}

type FormFilters = Omit<Filters, "page" | "query_term" | "limit" | "sort_by" | "order_by"> & {
    order_by: string;
};

const isOrderBy = (value: string): value is TOrderBy => {
    return ['asc', 'desc'].includes(value);
}
  
const isSortBy = (value: string): value is TSortBy => {
    return ['title', 'year', 'rating', 'peers', 'seeds', 'download_count', 'like_count', 'date_added'].includes(value);
}

const setOrderByOption = (option: string) => {
    switch (option) {
        case 'desc':
            return 'Latest';
        case 'asc':
            return 'Oldest';
        case 'date_added':
            return 'Featured';
        case 'download_count':
            return 'Downloads';
        case 'like_count':
            return 'Likes';
        case 'peers':
            return 'Peers';
        case 'seeds':
            return 'Seeds';
        case 'rating':
            return 'IMDb Rating';
        case 'title':
            return 'Alphabetical';
        case 'year':
            return 'Release year';
    
        default:
            return option;
    }
}

const DEFAULT_FORM_VALUES: FormFilters = {
    genre: DEFAULT_GENRE,
    minimum_rating: DEFAULT_RATING,
    order_by: DEFAULT_ORDER_BY,
    quality: DEFAULT_QUALITY,
}

const FiltersDialog = () => {
    const isOpen = useAppSelector(selectFiltersModal);
    const dispatch = useAppDispatch();

    const filters = useAppSelector(selectFilters);
    const currentQuery = useAppSelector(selectQuery);

    const [formValues, setFormValues] = useState<FormFilters>(DEFAULT_FORM_VALUES);

    const handleSubmit = useCallback((ev: FormEvent<HTMLFormElement>) => {
        ev.preventDefault();
      
        let sortBy: TSortBy = DEFAULT_SORT_BY;
        let orderBy: TOrderBy = DEFAULT_ORDER_BY;
      
        const selected = formValues.order_by;
      
        if (isSortBy(selected)) {
          sortBy = selected;
        } else if (isOrderBy(selected)) {
          orderBy = selected;
        }
      
        const values: Filters = {
          ...filters,
          ...formValues,
          query_term: currentQuery,
          page: DEFAULT_PAGE,
          minimum_rating: formValues.minimum_rating * 2,
          quality: formValues.quality === '4K' ? QUALITIES['2160p'] : formValues.quality,
          sort_by: sortBy,
          order_by: sortBy === 'title' ? OrderBy.ASC : orderBy,
        };
      
        console.log(values)
        dispatch(setFilters(values));
        dispatch(closeModal('filters'));
    }, [formValues, dispatch, filters, currentQuery]);

    const [dropdownState, dispatchDropdown] = useReducer(dropdownsReducer, {
        genre: false,
        quality: false,
        minimum_rating: false,
        order_by: false,
    });
    
    const toggleDropdown = useCallback((dropdown: DropdownType) => {
        if (dropdownState[dropdown]) {
          // If already open, close all
          dispatchDropdown({ type: '' as DropdownType }); // this will close all
        } else {
          dispatchDropdown({ type: dropdown });
        }
    }, [dropdownState]);

    const handleGenreChange = useCallback((value: string) => {
        toggleDropdown('genre');
        setFormValues(formValues => ({
            ...formValues,
            genre: value,
        }));
    }, [toggleDropdown])

    const handleQualityChange = useCallback((value: string) => {
        toggleDropdown('quality');
        setFormValues(formValues => ({
            ...formValues,
            quality: value === '2160p' ? '4K' : value,
        }));
    }, [toggleDropdown]);

    const handleRatingChange = useCallback((value: number) => {
        toggleDropdown('minimum_rating');
        setFormValues(formValues => ({
            ...formValues,
            minimum_rating: value,
        }));
    }, [toggleDropdown]);

    const handleOrderByChange = useCallback((value: string) => {
        toggleDropdown('order_by');
        setFormValues(formValues => ({
            ...formValues,
            order_by: value,
        }));
    }, [toggleDropdown]);

  return (
    <Dialog isOpen={isOpen} size='fit' title={"Filters"} className='bg-stone-900 md:min-h-[220px]'>
        <CloseButton onClose={() => dispatch(closeModal('filters'))} className='md:block absolute p-1' />

        <form onSubmit={handleSubmit} className='w-full p-2 text-white flex gap-3 flex-wrap'>
            <div className='w-full h-fit flex flex-wrap mb-5 gap-3 lg:gap-8 justify-center'>
                <div className='flex gap-1 flex-col'>
                    <p>Quality</p>

                    <p
                        onClick={() => toggleDropdown('quality')}
                        className='px-2 py-1 hover:bg-stone-700 bg-stone-800 rounded-sm cursor-pointer min-w-[130px] flex items-center justify-between gap-2'
                    >
                        {!formValues.quality ? 'All' : formValues.quality}

                        <span className={twMerge(`text-white transition-all duration-75 ${dropdownState.quality && 'rotate-180'}`)}>
                            <BsChevronDown />
                        </span>
                    </p>

                    <div className='relative'>
                        <ul
                            className={twMerge(`
                                absolute
                                w-[130px]
                                z-20
                                bg-stone-800
                                top-0
                                left-0
                                h-0
                                transition-all
                                duration-75
                                overflow-auto
                                rounded-bl-sm
                                rounded-br-sm
                                ${dropdownState.quality && 'h-[100px]'}
                            `)}
                        >
                            <li onClick={() => handleQualityChange('')} className='cursor-pointer px-2 py-1 hover:bg-blue-400'>All</li>
                            
                            {Object.values(QUALITIES)
                                .toReversed()
                                .map(q => (
                                    <li
                                        key={q}
                                        onClick={() => handleQualityChange(q)}
                                        className='cursor-pointer px-2 py-1 hover:bg-blue-400'
                                    >
                                        {q === '2160p' ? '4K' : q}
                                    </li>
                                ))
                            }
                        </ul>
                    </div>
                </div>

                <div className='flex gap-1 flex-col'>
                    <p>Genre</p>

                    <p
                        onClick={() => toggleDropdown('genre')}
                        className='px-2 py-1 hover:bg-stone-700 bg-stone-800 rounded-sm cursor-pointer min-w-[130px] flex items-center justify-between gap-2'
                    >
                        {!formValues.genre ? 'All' : formValues.genre}

                        <span className={twMerge(`text-white transition-all duration-75 ${dropdownState.genre && 'rotate-180'}`)}>
                            <BsChevronDown />
                        </span>
                    </p>

                    <div className='relative'>
                        <ul
                            className={twMerge(`
                                absolute
                                w-[130px]
                                z-20
                                bg-stone-800
                                top-0
                                left-0
                                h-0
                                transition-all
                                duration-75
                                overflow-auto
                                rounded-bl-sm
                                rounded-br-sm
                                ${dropdownState.genre && 'h-[100px]'}
                            `)}
                        >
                            <li onClick={() => handleGenreChange('')} className='cursor-pointer px-2 py-1 hover:bg-blue-400'>All</li>

                            {ALL_GENRES.map(g => (
                                <li
                                    key={g}
                                    onClick={() => handleGenreChange(g)}
                                    className='cursor-pointer px-2 py-1 hover:bg-blue-400'
                                >
                                    {g}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className='flex gap-1 flex-col'>
                    <p>Rating</p>
                    
                    <p
                        onClick={() => toggleDropdown('minimum_rating')}
                        className='px-2 py-1 hover:bg-stone-700 bg-stone-800 rounded-sm cursor-pointer min-w-[130px] flex items-center justify-between gap-2'
                    >
                        {!formValues.minimum_rating ? 'All' : formValues.minimum_rating + "+ Stars"}

                        <span className={twMerge(`text-white transition-all duration-75 ${dropdownState.minimum_rating && 'rotate-180'}`)}>
                            <BsChevronDown />
                        </span>
                    </p>

                    <div className='relative'>
                        <ul
                            className={twMerge(`
                                absolute
                                w-[130px]
                                z-20
                                bg-stone-800
                                top-0
                                left-0
                                h-0
                                transition-all
                                duration-75
                                overflow-auto
                                rounded-bl-sm
                                rounded-br-sm
                                ${dropdownState.minimum_rating && 'h-[100px]'}
                            `)}
                        >
                            <li onClick={() => handleRatingChange(0)} className='cursor-pointer px-2 py-1 hover:bg-blue-400'>All</li>

                            {[...Array((MAX_STARS * 2) - 1)].map((_, i) => {
                                const rating = (i + 1) * 0.5 !== MAX_STARS ? (i + 1) * 0.5 : 0;
                                return (
                                    <li
                                        key={i}
                                        onClick={() => handleRatingChange(rating)}
                                        className='cursor-pointer px-2 py-1 hover:bg-blue-400'
                                    >
                                        {rating > 0 && rating}{rating > 0 && "+ Stars"}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>

                <div className='flex gap-1 flex-col'>
                    <p>Order by</p>
                    
                    <p
                        onClick={() => toggleDropdown('order_by')}
                        className='px-2 py-1 hover:bg-stone-700 bg-stone-800 rounded-sm cursor-pointer min-w-[130px] flex items-center justify-between gap-2'
                    >
                        {setOrderByOption(formValues.order_by as string)}

                        <span className={twMerge(`text-white transition-all duration-75 ${dropdownState.order_by && 'rotate-180'}`)}>
                            <BsChevronDown />
                        </span>
                    </p>

                    <div className='relative'>
                        <ul
                            className={twMerge(`
                                absolute
                                w-[130px]
                                z-20
                                bg-stone-800
                                top-0
                                left-0
                                h-0
                                transition-all
                                duration-75
                                overflow-auto
                                rounded-bl-sm
                                rounded-br-sm
                                ${dropdownState.order_by && 'h-[100px]'}
                            `)}
                        >
                            {[...Object.values(OrderBy).toReversed(), ...Object.values(SortBy).toReversed()].map(value => (
                                <li
                                    key={value}
                                    onClick={() => handleOrderByChange(value)}
                                    className='cursor-pointer px-2 py-1 hover:bg-blue-400'
                                >
                                    {setOrderByOption(value)}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <div className='bottom-1 right-1 flex gap-1 w-full justify-end items-end grow'>
                <Button
                    type="submit"
                    className='bg-blue-500 hover:bg-blue-400 active:bg-blue-400 active:text-white'
                >
                    Apply changes
                </Button>
                <Button
                    type="reset"
                    onClick={() => dispatch(closeModal('filters'))}
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
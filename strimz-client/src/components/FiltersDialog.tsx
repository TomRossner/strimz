import React, { FormEvent, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import Dialog from './Dialog';
import { DEFAULT_GENRE, DEFAULT_LANGUAGES, DEFAULT_ORDER_BY, DEFAULT_PAGE, DEFAULT_QUALITY, DEFAULT_RATING, DEFAULT_SORT_BY, MAX_STARS, MOVIE_LANGUAGE_OPTIONS } from '../utils/constants';
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
import PageDescription from './PageDescription';
import { parseLanguageCodes } from '@/utils/filterByLanguage';
import Flag from 'react-world-flags';
import { langToCountry } from '@/utils/detectLanguage';

type DropdownType = keyof Omit<Filters, "page" | "limit" | "query_term" | "sort_by" | "year_from" | "year_to" | "languages">;

type DropdownState = {
    [k in DropdownType]: boolean;
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

type FormFilters = Omit<Filters, "page" | "query_term" | "limit" | "sort_by" | "order_by" | "languages"> & {
    order_by: string;
    year_from: string;
    year_to: string;
    languages: string;
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
            return 'Latest Added';
        case 'download_count':
            return 'Most Popular';
        case 'like_count':
            return 'Most Likes';
        case 'peers':
            return 'Peers';
        case 'seeds':
            return 'Seeds';
        case 'rating':
            return 'IMDb Rating';
        case 'title':
            return 'Alphabetical Order';
        case 'year':
            return 'Release Year';
    
        default:
            return option;
    }
}

const DEFAULT_FORM_VALUES: FormFilters = {
    genre: DEFAULT_GENRE,
    minimum_rating: DEFAULT_RATING,
    order_by: DEFAULT_ORDER_BY,
    quality: DEFAULT_QUALITY,
    year_from: '',
    year_to: '',
    languages: DEFAULT_LANGUAGES.join(','),
}

const filtersToForm = (filters: Filters): FormFilters => {
    const sortIsCustom = Boolean(filters.sort_by && filters.sort_by !== DEFAULT_SORT_BY);

    return {
        genre: filters.genre || DEFAULT_GENRE,
        quality: filters.quality === '2160p' ? '4K' : (filters.quality || DEFAULT_QUALITY),
        minimum_rating: Number(filters.minimum_rating || 0) / 2,
        order_by: sortIsCustom ? filters.sort_by : (filters.order_by || DEFAULT_ORDER_BY),
        year_from: filters.year_from || '',
        year_to: filters.year_to || '',
        languages: filters.languages ?? DEFAULT_LANGUAGES.join(','),
    };
};

const menuClass = (open: boolean) => twMerge(`
    absolute
    z-30
    left-0
    right-0
    top-full
    mt-1
    w-full
    bg-stone-800
    rounded-sm
    overflow-auto
    border
    border-stone-600
    shadow-lg
    ${open ? 'max-h-40' : 'hidden'}
`);

const FiltersDialog = () => {
    const isOpen = useAppSelector(selectFiltersModal);
    const dispatch = useAppDispatch();

    const filters = useAppSelector(selectFilters);
    const currentQuery = useAppSelector(selectQuery);
    const wasOpen = useRef(false);

    const [formValues, setFormValues] = useState<FormFilters>(DEFAULT_FORM_VALUES);
    const selectedLanguages = parseLanguageCodes(formValues.languages);

    useEffect(() => {
        if (isOpen && !wasOpen.current) {
            setFormValues(filtersToForm(filters));
        }
        wasOpen.current = isOpen;
    }, [isOpen, filters]);

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
          languages: selectedLanguages.join(','),
          query_term: currentQuery,
          page: DEFAULT_PAGE,
          minimum_rating: formValues.minimum_rating * 2,
          quality: formValues.quality === '4K' ? QUALITIES['2160p'] : formValues.quality,
          sort_by: sortBy,
          order_by: sortBy === 'title' ? OrderBy.ASC : orderBy,
        };
      
        dispatch(setFilters(values));
        dispatch(closeModal('filters'));
    }, [formValues, selectedLanguages, dispatch, filters, currentQuery]);

    const [dropdownState, dispatchDropdown] = useReducer(dropdownsReducer, {
        genre: false,
        quality: false,
        minimum_rating: false,
        order_by: false,
    });
    
    const toggleDropdown = useCallback((dropdown: DropdownType) => {
        if (dropdownState[dropdown]) {
          dispatchDropdown({ type: 'close_all' });
        } else {
          dispatchDropdown({ type: dropdown });
        }
    }, [dropdownState]);

    const handleGenreChange = useCallback((value: string) => {
        toggleDropdown('genre');
        setFormValues(values => ({
            ...values,
            genre: value,
        }));
    }, [toggleDropdown])

    const handleQualityChange = useCallback((value: string) => {
        toggleDropdown('quality');
        setFormValues(values => ({
            ...values,
            quality: value === '2160p' ? '4K' : value,
        }));
    }, [toggleDropdown]);

    const handleRatingChange = useCallback((value: number) => {
        toggleDropdown('minimum_rating');
        setFormValues(values => ({
            ...values,
            minimum_rating: value,
        }));
    }, [toggleDropdown]);

    const handleOrderByChange = useCallback((value: string) => {
        toggleDropdown('order_by');
        setFormValues(values => ({
            ...values,
            order_by: value,
        }));
    }, [toggleDropdown]);

    const toggleLanguage = (code: string) => {
        const next = selectedLanguages.includes(code)
            ? selectedLanguages.filter((language) => language !== code)
            : [...selectedLanguages, code];
        setFormValues((values) => ({
            ...values,
            languages: next.join(','),
        }));
    };

  return (
    <Dialog
        isOpen={isOpen}
        size='fit'
        title="Filters"
        className='bg-stone-900 w-full md:!w-[min(720px,calc(100vw-2rem))] max-h-[90vh] overflow-hidden'
    >
        <CloseButton onClose={() => dispatch(closeModal('filters'))} className='md:block absolute p-1 z-10' />
        
        <form onSubmit={handleSubmit} className='flex flex-col w-full max-h-[calc(90vh-3.25rem)] text-white'>
            <PageDescription className='px-4 pb-2'>Choose what shows up in the library. Language uses the movie&apos;s original language.</PageDescription>

            <div className='overflow-y-auto px-4 pb-4 flex flex-col gap-5'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 items-start'>
                    <div className='relative flex flex-col gap-1 min-w-0'>
                        <p className='text-sm text-stone-300'>Quality</p>
                        <button
                            type='button'
                            onClick={() => toggleDropdown('quality')}
                            className='px-2 py-1.5 hover:bg-stone-700 bg-stone-800 rounded-sm cursor-pointer flex items-center justify-between gap-2 text-left'
                        >
                            <span>{!formValues.quality ? 'All' : formValues.quality}</span>
                            <BsChevronDown className={twMerge(`transition-transform ${dropdownState.quality ? 'rotate-180' : ''}`)} />
                        </button>
                        <ul className={menuClass(dropdownState.quality)}>
                            <li onClick={() => handleQualityChange('')} className='cursor-pointer px-2 py-1.5 hover:bg-blue-400'>All</li>
                            {Object.values(QUALITIES).toReversed().map(q => (
                                <li
                                    key={q}
                                    onClick={() => handleQualityChange(q)}
                                    className='cursor-pointer px-2 py-1.5 hover:bg-blue-400'
                                >
                                    {q === '2160p' ? '4K' : q}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className='relative flex flex-col gap-1 min-w-0'>
                        <p className='text-sm text-stone-300'>Genre</p>
                        <button
                            type='button'
                            onClick={() => toggleDropdown('genre')}
                            className='px-2 py-1.5 hover:bg-stone-700 bg-stone-800 rounded-sm cursor-pointer flex items-center justify-between gap-2 text-left'
                        >
                            <span className='truncate'>{!formValues.genre ? 'All' : formValues.genre}</span>
                            <BsChevronDown className={twMerge(`shrink-0 transition-transform ${dropdownState.genre ? 'rotate-180' : ''}`)} />
                        </button>
                        <ul className={menuClass(dropdownState.genre)}>
                            <li onClick={() => handleGenreChange('')} className='cursor-pointer px-2 py-1.5 hover:bg-blue-400'>All</li>
                            {ALL_GENRES.map(g => (
                                <li
                                    key={g}
                                    onClick={() => handleGenreChange(g)}
                                    className='cursor-pointer px-2 py-1.5 hover:bg-blue-400'
                                >
                                    {g}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className='relative flex flex-col gap-1 min-w-0'>
                        <p className='text-sm text-stone-300'>Rating</p>
                        <button
                            type='button'
                            onClick={() => toggleDropdown('minimum_rating')}
                            className='px-2 py-1.5 hover:bg-stone-700 bg-stone-800 rounded-sm cursor-pointer flex items-center justify-between gap-2 text-left'
                        >
                            <span>{!formValues.minimum_rating ? 'All' : `${formValues.minimum_rating}+ stars`}</span>
                            <BsChevronDown className={twMerge(`transition-transform ${dropdownState.minimum_rating ? 'rotate-180' : ''}`)} />
                        </button>
                        <ul className={menuClass(dropdownState.minimum_rating)}>
                            <li onClick={() => handleRatingChange(0)} className='cursor-pointer px-2 py-1.5 hover:bg-blue-400'>All</li>
                            {[...Array((MAX_STARS * 2) - 1)].map((_, i) => {
                                const rating = (i + 1) * 0.5 !== MAX_STARS ? (i + 1) * 0.5 : 0;
                                if (!rating) return null;
                                return (
                                    <li
                                        key={i}
                                        onClick={() => handleRatingChange(rating)}
                                        className='cursor-pointer px-2 py-1.5 hover:bg-blue-400'
                                    >
                                        {rating}+ stars
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    <div className='relative flex flex-col gap-1 min-w-0'>
                        <p className='text-sm text-stone-300'>Order by</p>
                        <button
                            type='button'
                            onClick={() => toggleDropdown('order_by')}
                            className='px-2 py-1.5 hover:bg-stone-700 bg-stone-800 rounded-sm cursor-pointer flex items-center justify-between gap-2 text-left'
                        >
                            <span className='truncate'>{setOrderByOption(formValues.order_by)}</span>
                            <BsChevronDown className={twMerge(`shrink-0 transition-transform ${dropdownState.order_by ? 'rotate-180' : ''}`)} />
                        </button>
                        <ul className={menuClass(dropdownState.order_by)}>
                            {[...Object.values(OrderBy).toReversed(), ...Object.values(SortBy).toReversed()].map(value => (
                                <li
                                    key={value}
                                    onClick={() => handleOrderByChange(value)}
                                    className='cursor-pointer px-2 py-1.5 hover:bg-blue-400 truncate'
                                >
                                    {setOrderByOption(value)}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <label className='flex flex-col gap-1 text-sm text-stone-300'>
                        From year
                        <input
                            type='number'
                            min={1900}
                            max={2100}
                            value={formValues.year_from}
                            onChange={(ev) => setFormValues((values) => ({ ...values, year_from: ev.target.value }))}
                            placeholder='Any'
                            className='bg-stone-800 text-white px-2 py-1.5 rounded-sm outline-none'
                        />
                    </label>
                    <label className='flex flex-col gap-1 text-sm text-stone-300'>
                        To year
                        <input
                            type='number'
                            min={1900}
                            max={2100}
                            value={formValues.year_to}
                            onChange={(ev) => setFormValues((values) => ({ ...values, year_to: ev.target.value }))}
                            placeholder='Any'
                            className='bg-stone-800 text-white px-2 py-1.5 rounded-sm outline-none'
                        />
                    </label>
                </div>

                <fieldset className='border border-stone-700 rounded-sm p-3'>
                    <div className='flex items-center justify-between gap-3 mb-1'>
                        <legend className='text-sm text-stone-200 px-1'>Languages</legend>
                        <button
                            type='button'
                            onClick={() => setFormValues((values) => ({ ...values, languages: DEFAULT_LANGUAGES.join(',') }))}
                            className='text-xs text-blue-300 hover:text-blue-200'
                        >
                            Reset to default
                        </button>
                    </div>
                    <p className='text-xs text-stone-400 mb-3 px-1'>
                        A movie stays in the list when its language matches a checked box. Leave them all unchecked to show every language.
                    </p>
                    <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
                        {MOVIE_LANGUAGE_OPTIONS.map((language) => {
                            const checked = selectedLanguages.includes(language.code);
                            return (
                                <label
                                    key={language.code}
                                    className={twMerge(`
                                        flex items-center gap-2 px-2 py-1.5 rounded-sm border cursor-pointer text-sm
                                        ${checked ? 'border-blue-400 bg-blue-500/15 text-white' : 'border-stone-700 bg-stone-800 text-stone-300 hover:border-stone-500'}
                                    `)}
                                >
                                    <input
                                        type='checkbox'
                                        checked={checked}
                                        onChange={() => toggleLanguage(language.code)}
                                        className='accent-blue-500'
                                    />
                                    {langToCountry[language.code] && (
                                        <Flag
                                            code={langToCountry[language.code]}
                                            title={language.label}
                                            className='w-5 h-auto shrink-0 rounded-[2px]'
                                        />
                                    )}
                                    <span>{language.label}</span>
                                </label>
                            );
                        })}
                    </div>
                </fieldset>
            </div>

            <div className='flex gap-2 justify-end border-t border-stone-700 px-4 py-3'>
                <Button
                    type="reset"
                    onClick={() => dispatch(closeModal('filters'))}
                    className='bg-stone-700 hover:bg-stone-600'
                >
                    Close
                </Button>
                <Button
                    type="submit"
                    className='bg-blue-500 hover:bg-blue-400'
                >
                    Apply filters
                </Button>
            </div>
        </form>
    </Dialog>
  )
}

export default FiltersDialog;

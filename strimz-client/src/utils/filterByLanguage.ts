import { Movie } from "../components/MovieCard";

export const parseLanguageCodes = (value?: string): string[] => {
    return (value ?? '')
        .split(',')
        .map((code) => code.trim().toLowerCase())
        .filter(Boolean);
};

export const movieMatchesLanguages = (language: unknown, codes: string[]): boolean => {
    if (!codes.length) return true;
    return codes.includes(String(language ?? '').toLowerCase());
};

export const filterByLanguage = (movies: Movie[], languages: string[]): Movie[] => {
    const codes = languages.map((lang) => lang.toLowerCase());
    return movies.filter((movie) => movieMatchesLanguages(movie.language, codes));
};
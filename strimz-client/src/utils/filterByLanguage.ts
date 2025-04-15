import { Movie } from "../components/MovieCard";

export const filterByLanguage = (movies: Movie[], languages: string[]): Movie[] => {
    return movies.filter(movie => languages.some(lang => lang === movie.language));
}
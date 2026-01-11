import { extractMovieTitleAndYear } from './extractMovieTitle';

/**
 * Extracts IMDB code from a string (e.g., torrent title)
 * Looks for pattern: tt followed by 7 digits (e.g., tt1234567)
 * @param text - The text to search for IMDB code
 * @returns IMDB code if found, null otherwise
 */
export const extractImdbCodeFromText = (text: string): string | null => {
    if (!text || typeof text !== 'string') {
        return null;
    }

    // Pattern: tt followed by 7 digits (IMDB code format)
    const imdbPattern = /tt\d{7,8}/i;
    const match = text.match(imdbPattern);
    
    if (match) {
        return match[0].toLowerCase();
    }

    return null;
};

/**
 * Extracts title and year from text for movie search
 * @param text - The text to extract from
 * @returns Object with title and year, or null if extraction fails
 */
export const extractTitleAndYearForSearch = (text: string): { title: string; year: number | null } | null => {
    return extractMovieTitleAndYear(text);
};

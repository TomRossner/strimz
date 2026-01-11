/**
 * Extracts IMDB code from a string (e.g., torrent title)
 * Looks for pattern: tt followed by 7-8 digits (e.g., tt1234567)
 * @param text - The text to search for IMDB code
 * @returns IMDB code if found, null otherwise
 */
export const extractImdbCodeFromText = (text: string): string | null => {
    if (!text || typeof text !== 'string') {
        return null;
    }

    // Pattern: tt followed by 7-8 digits (IMDB code format)
    const imdbPattern = /tt\d{7,8}/i;
    const match = text.match(imdbPattern);
    
    if (match) {
        return match[0].toLowerCase();
    }

    return null;
};

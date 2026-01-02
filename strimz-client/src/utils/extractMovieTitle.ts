/**
 * Extracts movie title and year from folder/file names that contain metadata
 * Examples:
 * - "Hacksaw Ridge (2016) [2160p] [4K] [BluRay] [5.1] [YTS.MX]" -> { title: "Hacksaw Ridge", year: 2016 }
 * - "The Matrix (1999) [1080p]" -> { title: "The Matrix", year: 1999 }
 * - "Inception 2010 [720p]" -> { title: "Inception", year: 2010 }
 * 
 * @param folderName - The folder or file name containing metadata
 * @returns Object with extracted title and year, or null if extraction fails
 */
export const extractMovieTitleAndYear = (folderName: string): { title: string; year: number | null } | null => {
    if (!folderName || typeof folderName !== 'string') {
        return null;
    }

    // Pattern 1: "Title (YYYY)" - most common format
    const pattern1 = /^(.+?)\s*\((\d{4})\)/;
    const match1 = folderName.match(pattern1);
    
    if (match1) {
        const title = match1[1].trim();
        const year = parseInt(match1[2], 10);
        return { title, year };
    }

    // Pattern 2: "Title YYYY" - without parentheses
    const pattern2 = /^(.+?)\s+(\d{4})/;
    const match2 = folderName.match(pattern2);
    
    if (match2) {
        const title = match2[1].trim();
        const year = parseInt(match2[2], 10);
        // Validate year is reasonable (1900-2100)
        if (year >= 1900 && year <= 2100) {
            return { title, year };
        }
    }

    // Pattern 3: Try to find year anywhere and extract title before it
    const yearPattern = /\b(19|20)\d{2}\b/;
    const yearMatch = folderName.match(yearPattern);
    
    if (yearMatch) {
        const yearIndex = folderName.indexOf(yearMatch[0]);
        const title = folderName.substring(0, yearIndex).trim();
        const year = parseInt(yearMatch[0], 10);
        
        // Clean up title - remove common metadata patterns
        const cleanedTitle = title
            .replace(/\[.*?\]/g, '') // Remove [tags]
            .replace(/\(.*?\)/g, '') // Remove (tags)
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
        
        if (cleanedTitle && year >= 1900 && year <= 2100) {
            return { title: cleanedTitle, year };
        }
    }

    // If no year found, try to extract just the title by removing common metadata
    const titleOnly = folderName
        .replace(/\[.*?\]/g, '') // Remove [tags]
        .replace(/\(.*?\)/g, '') // Remove (tags)
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

    if (titleOnly) {
        return { title: titleOnly, year: null };
    }

    return null;
};



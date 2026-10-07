import axios from 'axios';
import { API_URL } from '@/utils/constants';
import { getLibrarySnapshot } from '@/services/library';

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const releaseTitle = (name: string): { title: string; year?: number } => {
    const base = name.replace(/\.[a-z0-9]{2,4}$/i, '').replace(/[._]+/g, ' ').trim();
    const yearMatch = base.match(/^(.*?)\s*[\[(]((?:19|20)\d{2})[)\]]/);
    const title = (yearMatch?.[1] || base.split('[')[0] || base).replace(/\s+/g, ' ').trim();
    const year = yearMatch ? Number(yearMatch[2]) : undefined;
    return { title, year };
};

const coverFromMovie = (movie: Record<string, unknown>) => {
    const cover = movie.large_cover_image || movie.medium_cover_image || movie.small_cover_image;
    return typeof cover === 'string' ? cover : '';
};

const historyPoster = (title: string) => {
    const wanted = normalize(title);
    if (!wanted) return '';
    const match = getLibrarySnapshot().history.find((item) => {
        if (!item.poster) return false;
        const name = normalize(item.title);
        return name === wanted || name.startsWith(`${wanted} `);
    });
    return match?.poster || '';
};

export const findPosterForRelease = async (releaseName: string): Promise<string> => {
    const { title, year } = releaseTitle(releaseName);
    if (!title || title.length < 2) return '';

    const fromHistory = historyPoster(title);
    if (fromHistory) return fromHistory;

    try {
        const response = await axios.get(`${API_URL}/movies`, {
            params: {
                query_term: title,
                limit: 8,
                page: 1,
                quality: 'All',
                minimum_rating: 0,
            },
        });
        const movies = (response.data?.data?.movies || response.data?.movies || []) as Record<string, unknown>[];
        const wanted = normalize(title);
        const match = movies.find((movie) => {
            const name = normalize(String(movie.title || ''));
            const movieYear = Number(movie.year);
            const titleMatches = name === wanted;
            const yearMatches = !year || movieYear === year;
            return titleMatches && yearMatches && Boolean(coverFromMovie(movie));
        });
        return match ? coverFromMovie(match) : '';
    } catch (error) {
        console.error(error);
        return '';
    }
};

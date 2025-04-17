import { Settings } from "../store/settings/settings.slice";

// Settings

export const saveSettings = (settings: Settings) => {
    return localStorage.setItem('user_settings', JSON.stringify(settings));
}

export const clearSettings = () => {
    if (localStorage.getItem('user_settings')) {
        return localStorage.removeItem('user_settings');
    }
}

export const getSettings = (): Settings | null => {
    const settings = localStorage.getItem('user_settings');
    
    return settings ? JSON.parse(settings) : null;
}



// Favorites

export const saveFavorites = (favorites: string[]) => {
    return localStorage.setItem('user_favorites', JSON.stringify(favorites));
}

export const clearFavorites = () => {
    if (localStorage.getItem('user_favorites')) {
        return localStorage.removeItem('user_favorites');
    }
}

export const removeFromFavorites = (movieId: string) => {
    if (localStorage.getItem('user_favorites')) {
        const userFavorites: string [] = JSON.parse(localStorage.getItem('user_favorites') as string);
        const updatedUserFavorites: string[] = userFavorites.filter(f => f !== movieId);

        return localStorage.setItem('user_favorites', JSON.stringify(updatedUserFavorites));
    }
}

export const addToFavorites = (movieId: string) => {
    if (localStorage.getItem('user_favorites')) {
        const userFavorites: string [] = JSON.parse(localStorage.getItem('user_favorites') as string);
        const updatedUserFavorites: string[] = [...userFavorites, movieId];

        return localStorage.setItem('user_favorites', JSON.stringify(updatedUserFavorites));
    }
    
    return localStorage.setItem('user_favorites', JSON.stringify([movieId]));
}

export const getFavorites = (): string[] => {
    const favorites = localStorage.getItem('user_favorites');
    
    return favorites ? JSON.parse(favorites) : [];
}



// Watch list

export const saveWatchList = (list: string[]) => {
    return localStorage.setItem('user_watch_list', JSON.stringify(list));
}

export const clearWatchList = () => {
    if (localStorage.getItem('user_watch_list')) {
        return localStorage.removeItem('user_watch_list');
    }
}

export const removeFromWatchList = (movieId: string) => {
    if (localStorage.getItem('user_watch_list')) {
        const userWatchList: string [] = JSON.parse(localStorage.getItem('user_watch_list') as string);
        const updatedUserWatchList: string[] = userWatchList.filter(id => id !== movieId);

        return localStorage.setItem('user_watch_list', JSON.stringify(updatedUserWatchList));
    }
}

export const addToWatchList = (movieId: string) => {
    if (localStorage.getItem('user_watch_list')) {
        const userWatchList: string [] = JSON.parse(localStorage.getItem('user_watch_list') as string);
        const updatedUserWatchList: string[] = [...userWatchList, movieId];

        return localStorage.setItem('user_watch_list', JSON.stringify(updatedUserWatchList));
    }
    
    return localStorage.setItem('user_watch_list', JSON.stringify([movieId]));
}

export const getWatchList = (): string[] => {
    const list = localStorage.getItem('user_watch_list');
    
    return list ? JSON.parse(list) : [];
}
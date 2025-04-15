import { Settings } from "../store/settings/settings.slice";


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
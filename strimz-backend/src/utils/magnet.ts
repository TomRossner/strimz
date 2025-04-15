import { TRACKERS } from "./constants.js";

export const encodeMovieNameToMagnet = (hash: string, movieName: string): string => {
    const encodedMovieName: string = encodeURIComponent(movieName);
    return `magnet:?xt=urn:btih:${hash}&dn=${encodedMovieName}`;
}

export const addTrackersToMagnet = (magnet: string): string => {
    return `${magnet}&tr=${Object.values(TRACKERS).join('&tr=')}`;
}
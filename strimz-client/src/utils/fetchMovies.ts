import axios from "axios";

export const fetchMovies = async (url: string) => {
    return await axios.get(url);
}
import { API_URL } from "../utils/constants";
import axios, { AxiosResponse } from "axios";

export const getMovieSuggestions = async (movieId: string): Promise<AxiosResponse> => {
    return await axios.get(`${API_URL}/suggestions/${movieId}`);
}



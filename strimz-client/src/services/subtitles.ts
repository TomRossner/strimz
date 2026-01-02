import { API_URL } from "@/utils/constants";
import axios from "axios";

export const fetchAvailableSubtitles = (
  imdbCode: string,
  title: string,
  year: string,
  signal?: AbortSignal
) => {
  return axios.get(`${API_URL}/subtitles/fetch-available-subtitles`, {
    params: { imdbCode, title, year },
    signal
  });
}

export const downloadSubtitles = async (language: string, imdbCode: string, title: string, year: string, dir: string) => {
  return await axios.post(`${API_URL}/subtitles/download-subtitles`, {language, imdbCode, title, year, dir});
}

export const checkAvailability = async (language: string, imdbCode: string, title: string, year: string) => {
  return await axios.post(`${API_URL}/subtitles/check-availability`, {language, imdbCode, title, year})
}
import { API_URL } from "@/utils/constants";
import axios from "axios";

/**
 * Search for subtitles using OpenSubtitles REST API
 * @param imdbId - IMDb ID (e.g., "tt1234567")
 * @param trustedSources - Filter by trusted sources (default: "only")
 * @param type - Content type (default: "movie")
 */
export const searchSubtitlesByImdb = async (
  imdbId: string,
  trustedSources?: string,
  type: string = "movie"
) => {
  const params: any = { imdb_id: imdbId, type };
  // Only add trusted_sources if provided
  if (trustedSources) {
    params.trusted_sources = trustedSources;
  }
  return axios.get(`${API_URL}/subtitles/search-by-imdb`, { params });
}

/**
 * Download subtitle from OpenSubtitles REST API
 * @param fileId - OpenSubtitles file ID
 * @param imdbCode - IMDb code
 * @param title - Movie title
 * @param year - Movie year
 * @param language - Language code
 * @param dir - Download directory (subtitles go to "<dir>/subtitles" by default)
 * @param subtitlesDir - Custom subtitles directory from Settings, if any
 */
export const downloadSubtitleFromApi = async (
  fileId: string,
  imdbCode: string,
  title: string,
  year: string,
  language: string,
  dir: string,
  subtitlesDir?: string
) => {
  return axios.post(`${API_URL}/subtitles/download-from-api`, {
    fileId,
    imdbCode,
    title,
    year,
    language,
    dir,
    subtitlesDir: subtitlesDir || undefined,
  });
}

/** Default subtitles folder for a downloads folder: "<downloads>/subtitles". */
export const getDefaultSubtitlesPath = (downloadsFolderPath: string) => {
  if (!downloadsFolderPath) return '';
  const sep = downloadsFolderPath.includes('\\') ? '\\' : '/';
  return `${downloadsFolderPath.replace(/[\\/]+$/, '')}${sep}subtitles`;
}
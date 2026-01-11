import { Request, Response } from 'express';
import { searchSubtitlesByImdbId, downloadSubtitleFromApi } from '../subtitles/subtitles.js';
import path from 'path';
import fs from 'fs';

const RESPONSE_TIMEOUT: number = 60000 // milliseconds;

/**
 * Search for subtitles using OpenSubtitles REST API
 * GET /api/subtitles/search-by-imdb?imdb_id=tt1234567&trusted_sources=only&type=movie
 */
export const searchSubtitlesByImdb = async (req: Request, res: Response) => {
    try {
        res.setTimeout(RESPONSE_TIMEOUT);
        const imdbId = req.query.imdb_id?.toString();
        // Default to undefined (no filter) to get ALL subtitles, matching website behavior
        // Only filter by trusted_sources if explicitly requested
        const trustedSources = req.query.trusted_sources?.toString();
        const type = req.query.type?.toString() || 'movie';

        if (!imdbId) {
            res.status(400).json({ error: 'imdb_id is required' });
            return;
        }

        // Remove 'tt' prefix if present (OpenSubtitles API expects just the number)
        const cleanImdbId = imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`;

        const result = await searchSubtitlesByImdbId(cleanImdbId, trustedSources, type);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error searching subtitles by IMDb:', error);
        res.status(500).json({ error: 'Failed to search subtitles' });
    }
}

/**
 * Download subtitle using OpenSubtitles REST API
 * POST /api/subtitles/download-from-api
 * Body: { fileId, imdbCode, title, year, language, dir }
 */
export const downloadSubtitleFromOpenSubtitlesApi = async (req: Request, res: Response) => {
    try {
        res.setTimeout(RESPONSE_TIMEOUT);
        const { fileId, imdbCode, title, year, language, dir } = req.body;

        if (!fileId || !imdbCode || !title || !year || !language || !dir) {
            res.status(400).json({ error: 'Missing required parameters' });
            return;
        }

        const subsDir = path.join(dir, 'subtitles');

        if (!fs.existsSync(subsDir)) {
            fs.mkdirSync(subsDir, { recursive: true });
        }

        // Check if file already exists
        const sanitizedTitle = title.replace(/[^A-Za-z]/g, '.');
        const fileName = `${imdbCode}-${sanitizedTitle}-${year}-[${language}].srt`;
        const filePath = path.join(subsDir, fileName);

        if (fs.existsSync(filePath)) {
            res.status(200).json(filePath);
            return;
        }

        const downloadedPath = await downloadSubtitleFromApi(
            fileId,
            subsDir,
            imdbCode,
            title,
            year,
            language
        );

        res.status(200).json(downloadedPath);
    } catch (error) {
        console.error('Error downloading subtitle from API:', error);
        res.status(500).json({ error: 'Failed to download subtitle' });
    }
}
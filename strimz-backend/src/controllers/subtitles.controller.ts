import { Request, Response } from 'express';
import { navigateAndCheckAvailability, navigateAndDownload, scrapeAvailableLanguages } from '../scraper/subtitles.scraper.js';
import path from 'path';
import fs from 'fs';

const RESPONSE_TIMEOUT: number = 60000 // milliseconds;

export const fetchAvailableSubtitles = async (req: Request, res: Response) => {
    try {
        res.setTimeout(RESPONSE_TIMEOUT);
        const imdbCode = req.query.imdbCode?.toString();
        const title = req.query.title?.toString();
        const year = req.query.year?.toString();

        if (!imdbCode || !title || !year) {
            res.sendStatus(400);
            return;
        }

        const languages = await scrapeAvailableLanguages(imdbCode, title, year);
        res.status(200).json(languages);
    } catch (error) {
        console.error(error);
        res.status(400).json("Failed fetching subtitles");
    }
}

export const downloadSubtitles = async (req: Request, res: Response) => {
    try {
        res.setTimeout(RESPONSE_TIMEOUT);
        const {language, imdbCode, title, year, dir} = req.body;

        const subsDir = path.join(dir, 'subtitles');

        if (!fs.existsSync(subsDir)) {
            fs.mkdirSync(subsDir, { recursive: true });
        }

        if (!language) {
            res.sendStatus(400);
            return;
        }

        const downloadedSrtPath = await navigateAndDownload(imdbCode, title, year, language, subsDir);

        if (!downloadedSrtPath) {
            res.sendStatus(400);
            return;
        }

        res.status(200).json(downloadedSrtPath);
    } catch (error) {
        console.error(error);
        res.sendStatus(400);
    }
}

export const checkAvailability = async (req: Request, res: Response) => {
    try {
        res.setTimeout(RESPONSE_TIMEOUT);
        const {language, imdbCode, title, year} = req.body;
        const isAvailable = await navigateAndCheckAvailability(imdbCode, title, year, language);

        res.status(200).json({isAvailable: isAvailable as boolean});
    } catch (error) {
        
    }
}
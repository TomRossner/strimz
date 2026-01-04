import { Request, Response } from "express";
import { yts } from "../yts/yts.js";
import { AxiosError } from "axios";

export const getMovieSuggestions = async (req: Request, res: Response): Promise<void | Response<any, Record<string, any>>> => {
    try {
        const { movieId } = req.params;

        if (!movieId) {
            return res.status(400).send({ error: 'movie_id is required' });
        }

        console.log('Fetching suggestions for movieId:', movieId);
        const response = await yts.getMovieSuggestions(movieId);

        if (response.status === 'error') {
            console.error('YTS API error:', response.status_message);
            return res.status(400).send({ error: response.status_message || 'Failed to fetch suggestions' });
        }

        // Return the full response structure
        return res.status(200).json(response);
    } catch (error) {
        console.error('Error fetching movie suggestions:', error);
        if ((error as Error).message) {
            return res.status(400).send({ error: (error as Error).message });
        }
        
        return res.status(400).send({ error: 'Failed to fetch movie suggestions' });
    }
}


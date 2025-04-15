import { Request, Response } from "express";
import { addTrackersToMagnet, encodeMovieNameToMagnet } from "../utils/magnet.js";
import { Filters, getAllMovies, getMovieCast } from "../scraper/scraper.js";
import WebTorrent from 'webtorrent';
import { ioServer } from "../index.js";
import { FETCH_LIMIT, PAGE_NUMBER, VideoExtensions } from "../utils/constants.js";

// export const handleStream = (req: Request, res: Response): Response | void => {
//     try {
//         const {torrentUrl, title} = req.query;
        
//         if (torrentUrl && title) {
//             const torrentHash: string = (torrentUrl as string).split('/download/')[1];
            
//             const magnetLink: string = addTrackersToMagnet(encodeMovieNameToMagnet(torrentHash as string, title as string));

//             if (!magnetLink) {
//                 console.log('No magnet link/ magnet link invalid');
//                 return res.end();
//             }

//             const client = new WebTorrent();

//             req.on('close', () => {
//                 console.log('Request closed');
//                 if (!client.destroyed) client.destroy();
//                 return res.end();
//             });
            
//             res.on('close', () => {
//                 console.log('Response closed');
//                 if (!client.destroyed) client.destroy();
//                 return res.end();
//             });
            
//             client.add(magnetLink, ((torrent: any) => {
//                 const file = torrent.files.find((file: any) =>
//                     file.type === 'video/mp4' || file.name.endsWith(VideoExtensions.MKV));
                
//                 if (!file) {
//                     res.status(404).send({error: 'No video file found in the torrent'});
//                     return;
//                 }

//                 torrent.on('download', (bytes: number) => {
//                     ioServer.emit('newBytes', {
//                         downloadSpeed: torrent.downloadSpeed,
//                         totalDownloaded: file.downloaded,
//                         progress: file.progress
//                     });
//                 })

//                 const range = req.headers.range ? req.headers.range : `bytes=0-`;

//                 // http://localhost:3003/movies/stream?torrentUrl=https:%2F%2Fyts.mx%2Ftorrent%2Fdownload%2F18F05A35A335909B384D1D40D79EFEC3E71BCEE0&title=Deadpool+2

//                 const positions = range.replace(/bytes=/, '').split('-');
//                 const start = parseInt(positions[0], 10);
//                 const end = positions[1] ? parseInt(positions[1], 10) : file.length - 1;
//                 const chunkSize = end - start + 1;
    
//                 const headers = {
//                     'Content-Range': `bytes ${start}-${end}/${file.length}`,
//                     'Accept-Ranges': 'bytes',
//                     'Content-Length': chunkSize,
//                     'Content-Type': 'video/mp4',
//                     'Cross-Origin-Resource-Policy': 'same-site'
//                 }
    
//                 res.writeHead(206, headers);

//                 const stream = file.createReadStream({ start, end });
                
//                 stream.on('error', (err: any) => {
//                     console.error('Stream error:', err);

//                     if (!client.destroyed) {
//                         client.destroy();
//                         return res.end();
//                     }
//                 });

//                 stream.pipe(res);
//             }));

            
//             client
//                 .on('ready', () => {
//                     console.log('Torrent ready');
//                 })
//                 .on('warning', (err: any) => {
//                     console.log('Warning: ', err);
//                 })
//                 .on('done', () => {
//                     console.log('Done downloading torrent');
//                     client.destroy();
//                 })
//                 .on('error', (error: any) => {
//                     console.error('Client error: ', error);

//                     if (!client.destroyed) client.destroy();
//                     res.end();
//                 })
//         }
//     } catch (error) {
//         res.status(400).send({error: 'Failed downloading'});
//     }
// }

export const getCast = async (req: Request, res: Response): Promise<Response | void> => {
    try {
        const {movieId} = req.params;

        const {
            data: {
                movie: {
                    cast,
                }
            }
        } = await getMovieCast(movieId);

        return res.status(200).send(cast);
    } catch (error) {
        return res.status(400).send({error: 'Failed fetching cast and images'});
    }
}

export const handleFetchMovies = async (req: Request, res: Response): Promise<void | Response<any, Record<string, any>>> => {
    try {
        const {genre, sortBy, orderBy} = req.query;

        const languages = Array.isArray(req.query.languages) ? req.query.languages : [];

        const languagesMap = new Map();

        for (const lang of languages) {
            if (!languagesMap.has(lang)) {
                languagesMap.set(lang, true);
            }
        }

        const minRating = req.query.minRating ? parseInt(req.query.minRating.toString()) : 0;
        const page = req.query.pageNum ? parseInt(req.query.pageNum.toString()) : PAGE_NUMBER;
        const limit = req.query.fetchLimit ? parseInt(req.query.fetchLimit.toString()) : FETCH_LIMIT;
        const query_term = req.query.query_term;

        const filters: Filters = {
            genre: genre as string,
            minRating,
            orderBy: orderBy as string,
            sortBy: sortBy as string
        }

        if (!filters) {
            return res.sendStatus(400);
        }
        
        const moviesResponseObject = await getAllMovies(filters, page, limit, query_term as string);

        const filteredMovies = moviesResponseObject.data.movies.filter(
            (m: Record<string, unknown>) => languagesMap.has(m.language)
        );

        res.status(200).send({
            ...moviesResponseObject,
            data: {
                ...moviesResponseObject.data,
                movies: filteredMovies.length ? filteredMovies : moviesResponseObject.data.movies
            }
        });
    } catch (error) {
        console.error(error)
        res.status(400).send(error);
    }
}

export const searchMovies = async (req: Request, res: Response): Promise<void | Response<any, Record<string, any>>> => {
    try {
        const {genre, sort_by, order_by} = req.query;

        const languages = Array.isArray(req.query.languages) ? req.query.languages : [];

        const languagesMap = new Map();

        for (const lang of languages) {
            if (!languagesMap.has(lang)) {
                languagesMap.set(lang, true);
            }
        }

        const minRating = req.query.minimum_rating ? parseInt(req.query.minimum_rating.toString()) : 0;
        const page = req.query.page ? parseInt(req.query.page.toString()) : PAGE_NUMBER;
        const limit = req.query.limit ? parseInt(req.query.limit.toString()) : FETCH_LIMIT;
        const query_term = req.query.query_term;

        const filters: Filters = {
            genre: genre as string,
            minRating,
            orderBy: order_by as string,
            sortBy: sort_by as string
        }
        
        const moviesResponseObject = await getAllMovies(filters, page, limit, query_term as string);

        const filteredMovies = (moviesResponseObject.data.movies ?? []).filter(
            (m: Record<string, unknown>) => languagesMap.has(m.language)
        );

        res.status(200).json({
            ...moviesResponseObject,
            data: {
                ...moviesResponseObject.data,
                movies: filteredMovies.length ? filteredMovies : moviesResponseObject.data.movies
            }
        });
    } catch (error) {
        if ((error as Error).message) {
            return res.status(400).send((error as Error).message);
        }
        
        res.status(400).send(error);
    }
}
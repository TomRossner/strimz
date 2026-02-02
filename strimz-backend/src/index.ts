import { config } from 'dotenv';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { dirname } from "path";
import { fileURLToPath } from "url";
import path from "path";
config({path: path.join(__dirname, "../.env")});

import { handleSocket } from "./utils/socket.js";
import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from "socket.io";

import morgan from "morgan";
import cors from 'cors';

import moviesRouter from './routes/movies.routes.js';
import streamRouter from "./routes/stream.routes.js";
import subtitlesRouter from './routes/subtitles.routes.js';
import downloadsRouter from './routes/downloads.routes.js';
import clientRouter from './routes/client.routes.js';
import torrentsRouter from './routes/torrents.routes.js';
import suggestionsRouter from './routes/suggestions.routes.js';

const app = express();
const PORT: number = parseInt(process.env.PORT as string) || 3003;

const httpServer = createServer(app);
const ioServer = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL
    }
});

app.use(express.json());
app.use(cors({
    origin: '*',
}));
app.use(morgan('dev'));

// Register ping endpoint first to make it available as early as possible
app.use('/api/ping', (req: Request, res: Response) => {
    try {
        res.status(200).json('Pong');
    } catch (error) {
        res.status(500).json({error: "Internal server error. Please restart the app."});
    }
});

app.use('/api/movies', moviesRouter);
app.use('/api/stream', streamRouter);
app.use('/api/subtitles', subtitlesRouter);
app.use('/api/downloads', downloadsRouter);
app.use('/api/client', clientRouter);
app.use('/api/torrents', torrentsRouter);
app.use('/api/suggestions', suggestionsRouter);

const init = async (): Promise<void> => {
    try {
        httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}...`);
            // Ensure ping endpoint is ready
            console.log('Ping endpoint available at /api/ping');
        });
        ioServer.on('connection', (socket: Socket) => handleSocket(socket));
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

init();

export {
    ioServer
}
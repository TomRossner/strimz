import { config } from 'dotenv';
config();

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

const init = async (): Promise<void> => {
    try {
        httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}...`));
        ioServer.on('connection', (socket: Socket) => handleSocket(socket));
    } catch (error) {
        console.error(error);
    }
}

init();

export {
    ioServer
}
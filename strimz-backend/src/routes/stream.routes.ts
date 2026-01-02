
import { Router } from "express";
import { deleteTorrent, getTorrentData, handleNewStream, pauseTorrent, resumeTorrent, restoreTorrent, streamFileByPath } from "../controllers/stream.controller.js";

const streamRouter = Router();

// File streaming route must come before :slug route to avoid conflicts
streamRouter.get('/file/stream', streamFileByPath);
streamRouter.post('/restore', restoreTorrent);
streamRouter.get('/:slug', handleNewStream);
streamRouter.post('/get-torrent-data', getTorrentData);
streamRouter.post('/pause/:hash', pauseTorrent);
streamRouter.post('/play/:hash', resumeTorrent);
streamRouter.delete('/delete/:hash', deleteTorrent);

export default streamRouter;
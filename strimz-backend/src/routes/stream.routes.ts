
import { Router } from "express";
import { deleteTorrent, getTorrentData, getTorrentMedia, handleNewStream, pauseTorrent, resumeTorrent, restoreTorrent, stopSeeding, streamFileByPath } from "../controllers/stream.controller.js";

const streamRouter = Router();

// File streaming route must come before :slug route to avoid conflicts
streamRouter.get('/file/stream', streamFileByPath);
streamRouter.get('/files/:hash', getTorrentMedia);
streamRouter.post('/stop-seed/:hash', stopSeeding);
streamRouter.post('/restore', restoreTorrent);
streamRouter.get('/:slug', handleNewStream);
streamRouter.post('/get-torrent-data', getTorrentData);
streamRouter.post('/pause/:hash', pauseTorrent);
streamRouter.post('/play/:hash', resumeTorrent);
// Route for file-only deletes (no hash) - must come before /delete/:hash
streamRouter.delete('/delete', deleteTorrent);
streamRouter.delete('/delete/:hash', deleteTorrent);

export default streamRouter;
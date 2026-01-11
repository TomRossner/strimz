import { Request, Response } from "express";
import WebTorrent from "webtorrent";
import { VideoExtensions } from "../utils/constants.js";
import { addTrackersToMagnet, encodeMovieNameToMagnet } from "../utils/magnet.js";
import path from "path";
import fs from "fs";
import { ioServer } from "../index.js";
import createDir from "../utils/createDirectory.js";
import deleteDirectory from "../utils/deleteDirectory.js";
import { extractImdbCodeFromText } from "../utils/extractImdbCode.js";
import { yts } from "../yts/yts.js";

export let client: WebTorrent.Instance | null = null;
export const activeTorrents: Map<string, WebTorrent.Torrent> = new Map();
export const addingTorrents: Map<string, Promise<WebTorrent.Torrent>> = new Map();
export const stoppedTorrents = new Set<string>();

const pauseOtherTorrents = (currentHash: string) => {
    activeTorrents.forEach((torrent, hash) => {
        if (hash !== currentHash && !torrent.paused) {
            torrent.pause();
            stoppedTorrents.add(hash);
        }
    });
}

// New flow

export const handleNewTorrent = async (req: Request, res: Response) => {
    try {
        req.on('error', (err) => {
            console.error(err);
        });

        if (!req.query.hash || !req.query.dir || !req.query.title || !req.query.sid || !req.params.slug) {
            res.sendStatus(400);
            return;
        }

        const torrentExists: boolean = addingTorrents.has(req.query.hash.toString());
        if (torrentExists) {
            res.sendStatus(200);
            return;
        }

        const hash: string = req.query.hash.toString().toLowerCase();
        const dir: string = path.resolve(req.query.dir.toString());
        const magnetLink: string | null = addTrackersToMagnet(encodeMovieNameToMagnet(hash, req.query.title.toString()));

        await createDir(dir);

        const existingTorrent = activeTorrents.get(hash);
        if (existingTorrent) {
            const videoFile = existingTorrent.files.find(file =>
                file.name.endsWith('.mp4') || file.name.endsWith('.mkv')
            );

            if (videoFile) {
                videoFile.select();
            }

            attachProgressEvents(existingTorrent,req.params.slug.toString(), hash, req.query.sid.toString(), dir);

            const targetSocket = ioServer.sockets.sockets.get(req.query.sid.toString());
            if (targetSocket) {
                targetSocket.emit('newDownload', {
                    hash,
                    name: existingTorrent.name,
                    title: req.query.title.toString(),
                    slug: req.params.slug,
                });
            }

            res.sendStatus(200);
            return;
        }

        const torrent = addToClient(
            hash, 
            req.query.title.toString(),
            magnetLink,
            dir,
            req.query.sid.toString(),
            req.params.slug.toString(),
            client as WebTorrent.Instance,
            req,
            res
        );

        addingTorrents.set(hash, torrent);
        torrent.finally(() => addingTorrents.delete(hash));
        
        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
}

const addToClient = async (
    hash: string,
    title: string,
    magnetLink: string,
    dir: string,
    sid: string,
    slug: string,
    client: WebTorrent.Instance,
    req: Request,
    res: Response
) => {
    if (!client) createClient();

    const torrent = client.torrents.find(tor => tor.infoHash === hash);
    if (torrent) {
        console.log('Torrent already in client');
        return new Promise<WebTorrent.Torrent>((resolve, reject) => resolve(torrent));
    }

    return new Promise<WebTorrent.Torrent>((resolve, reject) => {
        client.add(magnetLink, { path: dir }, (torrent) => {
            torrent.on("error", (torrentErr) => {
                console.error("Torrent Error:", torrentErr);
                torrent.destroy();
                activeTorrents.delete(hash);
                reject(torrentErr);
            });
            const videoFile = getVideoFile(torrent);

            if (!videoFile) {
                reject('Video file not found');
            }

            activeTorrents.set(hash, torrent);
            attachProgressEvents(torrent, slug, hash, sid, dir);
            console.table(activeTorrents);

            const PRELOAD_BYTES = 5 * 1024 * 1024; // First 5MB
            videoFile!.select();

            const checkInterval = setInterval(() => {
                if (videoFile!.downloaded >= PRELOAD_BYTES) {
                    clearInterval(checkInterval);
                    resolve(torrent);
                    return;
                }
            }, 500);

            const targetSocket = ioServer.sockets.sockets.get(sid as string);

            if (targetSocket && activeTorrents.has(hash)) {
                targetSocket.emit('newDownload', {
                    hash,
                    name: torrent.name,
                    title,
                    slug,
                });
            }

            resolve(activeTorrents.get(hash) as WebTorrent.Torrent);
        });
    });
}

export const handleNewStream = async (req: Request, res: Response) => {
    try {
        if (!req.query.hash || !req.query.sid || !req.params.slug || req.params.slug === 'undefined' || !req.query.dir) {
            res.sendStatus(400);
            return;
        }

        const hash = req.query.hash.toString().toLowerCase();
        const slug = req.params.slug.toString().toLowerCase();
        const sid = req.query.sid.toString().toLowerCase();
        const torrentInClient = await waitForTorrent(hash);

        if (!torrentInClient) {
            return res.status(404).json({ error: "Stream not ready" });
        }
        
        if (stoppedTorrents.has(hash)) {
            return res.status(410).json({ error: "Stream stopped" });
        }
        
        pauseOtherTorrents(hash);

        const dir = req.query.dir.toString();

        if (torrentInClient.done) {
            const targetSocket = ioServer.sockets.sockets.get(sid);

            if (targetSocket && activeTorrents.has(hash)) {
                targetSocket.emit("downloadProgress", {
                    hash: torrentInClient.infoHash.toLowerCase(),
                    slug,
                    progress: torrentInClient.progress,
                    speed: torrentInClient.downloadSpeed,
                    peers: torrentInClient.numPeers,
                    downloaded: torrentInClient.downloaded,
                    done: torrentInClient.done,
                    fileName: torrentInClient.name,
                    timeRemaining: torrentInClient.timeRemaining,
                    paused: torrentInClient.paused,
                    url: createStreamUrl(slug, hash, sid, dir),
                });
            }

            return streamFromDisk(req, res, dir as string, torrentInClient);
        } else {
            return startStream(req, res, torrentInClient);   
        }
    } catch (error) {
        console.error("General error:", error);
        if (!res.headersSent) {
            res.status(500).send({ error: "Internal server error. Please restart the app and try again." });
        }
    }
}

const startStream = (req: Request, res: Response, torrent: WebTorrent.Torrent) => {
    try {
        const hash = torrent.infoHash.toLowerCase();

        if (torrent.paused || stoppedTorrents.has(hash)) {
            console.log('Stream blocked - torrent paused:', hash);
            return res.status(409).end();
        }

        const videoFile = getVideoFile(torrent);
        
        if (!videoFile) {
            console.error("No suitable video file found in torrent. Please try again using a different torrent.");
            return res.status(404).json({ error: "File not found. Please try again using with a different torrent." });
        }
        
        req.on('close', () => {
            videoFile.deselect();
            res.end();
        });

        if (stoppedTorrents.has(hash) || torrent.paused) {
            return res.status(409).json({ error: "Torrent is paused" });
        }

        videoFile.select();

        if (!torrent.paused) {
            torrent.resume();
        }

        const range = req.headers.range;
        const fileSize = videoFile.length;

        if (range) {
            // Stream range
            streamWithRange(videoFile, fileSize, range, res);
        } else {
            // Init stream
            initStream(videoFile, fileSize, res);
        }
    } catch (err) {
        console.error(err);
        if (!res.headersSent) {
            res.status(500).json({ error: "Stream failed. Please try again with a different torrent." });
        }
    }
}

// Utils

export const createNewClient = async (req: Request, res: Response) => {
    try {
        
        const checkInterval = setInterval(() => {
            if (client) {
                clearInterval(checkInterval);
                res.sendStatus(200);
                return;
            }

            createClient();
        }, 500);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
}

export const createClient = () => {
    if (!client) {
        client = new WebTorrent();
        client.on('error', (err) => {
            console.error(err);
            client!.destroy();
            client = null;
        });

        console.log('Client created')
    }
}

const streamWithRange = (videoFile: WebTorrent.TorrentFile, fileSize: number, range: string, res: Response) => {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = (end - start) + 1;

    const mime = videoFile.name.endsWith(VideoExtensions.MKV) ? 'video/x-matroska' : 'video/mp4';

    res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": mime,
    });

    const stream = videoFile.createReadStream({ start, end });
    
    stream.on("error", (err) => {
        if (stream.readable) {
            stream.resume();
            return;
        }
        console.error("Stream error:", err);
    });

    if (!stream) {
        console.error("Failed to create stream");
        return res.status(500).json({ error: "Stream failed. Please try again with a different torrent." });
    }

    stream.pipe(res);
}

const initStream = (videoFile: WebTorrent.TorrentFile, fileSize: number, res: Response) => {
    res.writeHead(206, {
        "Content-Length": fileSize,
        "Content-Type": "video/mp4",
    });

    const stream = videoFile.createReadStream();
    
    stream.on("error", (err) => {
        if (stream.readable) {
            console.log("Got stream error but stream is still readable, resuming...");
            stream.resume();
            return;
        }
        console.error("Stream error:", err);
    });

    if (!stream) {
        console.error("Failed to create stream");
        return res.status(500).json({ error: "Stream failed. Please try again with a different torrent." });
    }

    stream.pipe(res);
}

const waitForTorrent = async (hash: string, timeout = 5000) => {
    const start = Date.now();

    while (!activeTorrents.has(hash)) {
        if (Date.now() - start > timeout) return null;
        await new Promise(r => setTimeout(r, 100));
    }

    return activeTorrents.get(hash)!;
}

const attachProgressEvents = (
    torrent: WebTorrent.Torrent,
    slug: string,
    hash: string,
    sid: string,
    dir: string
) => {
    const socket = ioServer.sockets.sockets.get(sid);
    if (!socket) return console.log('No socket id found');

    if ((torrent as any).__progressAttached) return console.log('Torrent has progress attached');
    (torrent as any).__progressAttached = true;
    // Store socket ID and other metadata on the torrent object for later use
    (torrent as any).__socketId = sid;
    (torrent as any).__slug = slug;
    (torrent as any).__dir = dir;

    torrent.on("download", () => {
        // If torrent is in stoppedTorrents, ensure it stays paused
        // This prevents auto-resume that might happen in some WebTorrent scenarios
        if (stoppedTorrents.has(hash) && !torrent.paused) {
            console.log(`[attachProgressEvents] Re-pausing torrent ${hash} that was auto-resumed`);
            torrent.pause();
        }
        
        // Check stoppedTorrents to ensure paused state is accurate
        // If torrent is in stoppedTorrents, it should be paused
        const isPaused = torrent.paused || stoppedTorrents.has(hash);
        socket.emit("downloadProgress", {
            hash: torrent.infoHash.toLowerCase(),
            slug,
            progress: torrent.progress,
            speed: torrent.downloadSpeed,
            peers: torrent.numPeers,
            downloaded: torrent.downloaded,
            done: torrent.done,
            fileName: torrent.name,
            timeRemaining: torrent.timeRemaining,
            paused: isPaused,
            url: createStreamUrl(slug, hash, sid, dir),
        });
    });

    torrent.on("done", () => {
        socket.emit("downloadDone", {
            hash: torrent.infoHash.toLowerCase(),
        });
    });
}

export const resumeTorrent = (req: Request, res: Response) => {
    const hash = req.params.hash.toLowerCase();
    let torrent = activeTorrents.get(hash);

    // If not in activeTorrents, check if it's in the client
    if (!torrent && client) {
        const torrentInClient = client.torrents.find(tor => tor.infoHash.toLowerCase() === hash);
        if (torrentInClient) {
            // Add to activeTorrents for tracking
            activeTorrents.set(hash, torrentInClient);
            torrent = torrentInClient;
        }
    }

    // If torrent not found, return 200 anyway - it will be added when navigating to stream page
    // This handles the case where playTorrent is called before the torrent is added to the client
    if (!torrent) {
        console.log(`[resumeTorrent] Torrent ${hash} not found in client - will be added when streaming starts`);
        return res.sendStatus(200);
    }

    stoppedTorrents.delete(hash);

    const videoFile = getVideoFile(torrent);
    if (!videoFile) {
        console.log(`[resumeTorrent] Video file not found for torrent ${hash}`);
        return res.status(404).json({ error: "Video file not found" });
    }

    videoFile.select();
    torrent.resume();

    // Emit progress update immediately to reflect resumed state
    // Get socket ID from torrent metadata stored during attachProgressEvents
    const socketId = (torrent as any).__socketId;
    const slug = (torrent as any).__slug || '';
    const dir = (torrent as any).__dir || '';
    
    if (socketId) {
        const targetSocket = ioServer.sockets.sockets.get(socketId);
        if (targetSocket) {
            targetSocket.emit('downloadProgress', {
                hash: torrent.infoHash.toLowerCase(),
                slug,
                progress: torrent.progress,
                speed: torrent.downloadSpeed,
                peers: torrent.numPeers,
                downloaded: torrent.downloaded,
                done: torrent.done,
                fileName: torrent.name,
                timeRemaining: torrent.timeRemaining,
                paused: false, // Explicitly set to false after resume
                url: createStreamUrl(slug, torrent.infoHash.toLowerCase(), socketId, dir),
            });
        }
    } else {
        // Fallback: emit to all sockets if socket ID not found
        const sockets = ioServer.sockets.sockets;
        sockets.forEach((socket) => {
            socket.emit('downloadProgress', {
                hash: torrent.infoHash.toLowerCase(),
                slug: '',
                progress: torrent.progress,
                speed: torrent.downloadSpeed,
                peers: torrent.numPeers,
                downloaded: torrent.downloaded,
                done: torrent.done,
                fileName: torrent.name,
                timeRemaining: torrent.timeRemaining,
                paused: false,
                url: '',
            });
        });
    }

    return res.sendStatus(200);
}

export const deleteTorrent = async (req: Request, res: Response) => {
    if (!req.query.dir) return res.sendStatus(400);

    const hashParam = req.params.hash;
    const hash = hashParam ? hashParam.toLowerCase() : '';
    const dir = req.query.dir.toString();
    
    // If hash is empty or 'file' (file-only delete), just delete the directory
    if (!hash || hash === 'file') {
        try {
            await deleteDirectory(dir);
            return res.sendStatus(200);
        } catch (error) {
            console.error('Error deleting directory:', error);
            return res.status(500).json({ error: "Failed to delete directory" });
        }
    }
    
    // Handle torrent deletion
    const torrent = activeTorrents.get(hash);
    
    // Remove from stoppedTorrents
    stoppedTorrents.delete(hash);
    
    // Remove from addingTorrents if present
    addingTorrents.delete(hash);

    if (torrent) {
        const videoFile = getVideoFile(torrent);
        if (videoFile) {
            videoFile.deselect();
        }
        torrent.pause();
        torrent.destroy();
        activeTorrents.delete(hash);
    }

    // Delete directory from disk
    try {
        await deleteDirectory(dir);
        return res.sendStatus(200);
    } catch (error) {
        console.error('Error deleting directory:', error);
        return res.status(500).json({ error: "Failed to delete directory" });
    }
}

export const pauseTorrent = async (req: Request, res: Response) => {
    try {
        const { hash } = req.params;
        
        if (!hash) {
            return res.status(400).json({ error: "Could not pause download. Missing torrent hash." });
        }

        const hashStr = String(hash).toLowerCase();

        // First check activeTorrents, then check client.torrents if not found
        let torrent = activeTorrents.get(hashStr);
        
        if (!torrent && client) {
            const torrentInClient = client.torrents.find(tor => tor.infoHash.toLowerCase() === hashStr);
            if (torrentInClient) {
                // Add to activeTorrents for tracking
                activeTorrents.set(hashStr, torrentInClient);
                torrent = torrentInClient;
            }
        }
        
        if (!torrent) {
            return res.status(404).json({ error: "Torrent not found" });
        }
        
        const videoFile = getVideoFile(torrent);

        if (!videoFile) return res.sendStatus(404);

        // Add to stoppedTorrents first to prevent auto-resume
        stoppedTorrents.add(hashStr);
        
        // Add to stoppedTorrents first to prevent auto-resume
        stoppedTorrents.add(hashStr);
        
        if (!torrent.paused) {
            torrent.pause();
            videoFile.deselect();
        } else {
            // Even if already paused, ensure it's in stoppedTorrents
            // and deselect the video file
            videoFile.deselect();
        }
        
        // Double-check paused state
        if (!torrent.paused) {
            console.warn(`[pauseTorrent] Torrent ${hashStr} was not paused, retrying...`);
            torrent.pause();
        }

        return res.status(200).json({ message: "Torrent paused" });
    } catch (error) {
        console.error("Error pausing torrent:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

const streamFromDisk = (req: Request, res: Response, downloadDir: string, torrent: WebTorrent.Torrent) => {
    const videoFile = getVideoFile(torrent);
    
    if (!videoFile) {
        res.sendStatus(404).end();
        return;
    }

    const filePath = path.join(downloadDir, videoFile.path.split('/')[0]);
    const stat = fs.statSync(filePath);

    const range = req.headers.range;
    if (!range) {
        res.status(416).send('Range required');
        return;
    }

    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : stat.size - 1;

    const mime = videoFile.name.endsWith(VideoExtensions.MKV) ? 'video/x-matroska' : 'video/mp4';

    res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': mime,
    });

    fs.createReadStream(filePath, { start, end }).pipe(res);
}

export const streamFileByPath = async (req: Request, res: Response) => {
    try {
        const filePath = req.query.path as string;
        
        if (!filePath) {
            return res.status(400).json({ error: "File path is required" });
        }

        const resolvedPath = path.resolve(filePath);
        
        // Check if file exists
        if (!fs.existsSync(resolvedPath)) {
            return res.status(404).json({ error: "File not found" });
        }

        const stat = fs.statSync(resolvedPath);
        
        // Check if it's a file (not a directory)
        if (!stat.isFile()) {
            return res.status(400).json({ error: "Path is not a file" });
        }

        // Check if it's a video file
        const ext = path.extname(resolvedPath).toLowerCase();
        if (ext !== VideoExtensions.MP4 && ext !== VideoExtensions.MKV && 
            ext !== '.avi' && ext !== '.mov' && ext !== '.wmv' && 
            ext !== '.flv' && ext !== '.webm' && ext !== '.m4v') {
            return res.status(400).json({ error: "File is not a supported video format" });
        }

        const range = req.headers.range;
        if (!range) {
            // Return the whole file
            const mime = ext === VideoExtensions.MKV ? 'video/x-matroska' : 'video/mp4';
            res.writeHead(200, {
                'Content-Length': stat.size,
                'Content-Type': mime,
            });
            return fs.createReadStream(resolvedPath).pipe(res);
        }

        // Handle range requests
        const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
        const start = parseInt(startStr, 10);
        const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
        const chunkSize = end - start + 1;

        const mime = ext === VideoExtensions.MKV ? 'video/x-matroska' : 'video/mp4';

        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': mime,
        });

        fs.createReadStream(resolvedPath, { start, end }).pipe(res);
    } catch (error) {
        console.error('Error streaming file:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Internal server error" });
        }
    }
}

export const getTorrentData = async (req: Request, res: Response) => {
    try {
        const { torrentFilePath, dir } = req.body;

        if (!dir) {
            return res.status(400).json({ error: "Stream failed. Please restart the app and try again." });
        }

        const requestedDir = path.resolve(dir as string);

        if (!torrentFilePath || !requestedDir) {
            return res.status(400).json({ error: "Stream failed. Please restart the app and try again." });
        }

        if (!client) {
            client = new WebTorrent();

            client.on("error", (err) => {
                if (!res.headersSent) {
                    console.error("Torrent from path - WebTorrent Client Error:", err);
                    client?.destroy();
                    client = null;
                }
            });
        }

        const tempClient = new WebTorrent(); // Just to get hash and title;

        tempClient.add(torrentFilePath as string, { path: requestedDir }, async (torrent) => {
            torrent.on("error", (torrentErr) => {
                console.error("Torrent Error:", torrentErr);
                torrent.destroy();
                
                if (!res.headersSent) {
                    return res.status(500).send(torrentErr);
                }
            });

            const hash = torrent.infoHash.toLowerCase();
            const title = torrent.name;
            
            // Extract IMDB code from title
            let imdbCode: string | null = extractImdbCodeFromText(title);
            
            // If not found in title, try to search for the movie using YTS API
            if (!imdbCode && title) {
                try {
                    // Extract clean title (remove common patterns like [1080p], etc.)
                    const cleanTitle = title.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
                    const titleParts = cleanTitle.split(/\s+/);
                    const searchQuery = titleParts.slice(0, 5).join(' '); // Use first 5 words as search query
                    
                    const searchResult = await yts.getMovies({
                        limit: 1,
                        page: 1,
                        query_term: searchQuery
                    });
                    
                    if (searchResult.status === 'ok' && searchResult.data?.movies?.length > 0) {
                        const movie = searchResult.data.movies[0];
                        if (movie.imdb_code) {
                            imdbCode = movie.imdb_code;
                        }
                    }
                } catch (error) {
                    // Silently fail - imdbCode will remain null
                    console.error('Error searching for IMDB code:', error);
                }
            }
            
            addingTorrents.set(hash, new Promise((resolve, reject) => resolve(torrent)));

            res.status(200).json({hash, title, imdbCode: imdbCode || undefined});

            addingTorrents.delete(hash);
            tempClient?.remove(torrent);
        });
    } catch (error) {
        console.error("General error:", error);
        res.status(500).send({ error: "Internal server error. Please restart the app and try again." });
    }
}

export const getAllDownloads = async (req: Request, res: Response) => {
    try {
        // Map torrents to plain objects to avoid circular reference issues
        const downloads = Array.from(activeTorrents.entries()).map(([hash, torrent]) => {
            const videoFile = getVideoFile(torrent);
            return {
                hash: hash.toLowerCase(),
                name: torrent.name || '',
                title: torrent.name || '', // Title will be updated from cache on frontend
                slug: '', // Slug will be updated from cache on frontend
                progress: torrent.progress || 0,
                speed: torrent.downloadSpeed || 0,
                peers: torrent.numPeers || 0,
                done: torrent.done || false,
                downloaded: torrent.downloaded || 0,
                timeRemaining: torrent.timeRemaining || 0,
                fileName: videoFile?.name || torrent.name || '',
                paused: torrent.paused || false,
                url: '', // URL will be constructed on frontend if needed
            };
        });

        res.status(200).json({downloads});
    } catch (error) {
        console.error('Error while fetching downloads: ', error);
        res.status(500).send({ error: "Internal server error. Please restart the app and try again." });
    }
}

export const restoreTorrent = async (req: Request, res: Response) => {
    try {
        const { hash, slug, title, dir, sid } = req.body;

        if (!hash || !slug || !title || !dir || !sid) {
            return res.status(400).json({ error: "Missing required parameters" });
        }

        const hashStr = hash.toLowerCase();
        const targetSocket = ioServer.sockets.sockets.get(sid);
        
        // Debug: Show all torrents in client
        if (client) {
            const clientTorrents = client.torrents.map(t => ({
                hash: t.infoHash.toLowerCase(),
                name: t.name,
                progress: (t.progress * 100).toFixed(2) + '%',
                done: t.done,
                paused: t.paused
            }));
            console.table(clientTorrents, ['hash', 'name', 'progress', 'done', 'paused']);
            
            const activeTorrentsList = Array.from(activeTorrents.entries()).map(([hash, torrent]) => ({
                hash: hash.toLowerCase(),
                name: torrent.name,
                progress: (torrent.progress * 100).toFixed(2) + '%',
                done: torrent.done,
                paused: torrent.paused
            }));
            console.log('\nActive Torrents (tracked):');
            console.table(activeTorrentsList, ['hash', 'name', 'progress', 'done', 'paused']);
        }
        
        // Check if torrent already exists in activeTorrents
        if (activeTorrents.has(hashStr)) {
            const existingTorrent = activeTorrents.get(hashStr)!;
            
            // If torrent is already completed, don't restore it - it can be played from disk
            if (existingTorrent.done) {
                console.log(`[restoreTorrent] Skipping completed torrent ${hashStr} - already done in activeTorrents`);
                return res.status(200).json({ message: "Torrent already completed - can be played from disk" });
            }
            
            attachProgressEvents(existingTorrent, slug, hashStr, sid, dir);
            
            if (targetSocket) {
                // Emit newDownload event
                targetSocket.emit('newDownload', {
                    hash: hashStr,
                    name: existingTorrent.name,
                    title,
                    slug,
                });
                
                // Emit current progress state immediately
                const videoFile = getVideoFile(existingTorrent);
                // Check stoppedTorrents to ensure paused state is accurate
                const isPaused = existingTorrent.paused || stoppedTorrents.has(hashStr);
                targetSocket.emit('downloadProgress', {
                    hash: hashStr,
                    slug,
                    progress: existingTorrent.progress,
                    speed: existingTorrent.downloadSpeed,
                    peers: existingTorrent.numPeers,
                    downloaded: existingTorrent.downloaded,
                    done: existingTorrent.done,
                    fileName: existingTorrent.name,
                    timeRemaining: existingTorrent.timeRemaining,
                    paused: isPaused,
                    url: createStreamUrl(slug, hashStr, sid, dir),
                });
            }
            
            return res.status(200).json({ message: "Torrent already active" });
        }

        // Check if torrent is already in the client but not in activeTorrents
        // This can happen if the torrent was added before but not tracked
        if (!client) {
            createClient();
        }

        const existingTorrentInClient = client!.torrents.find(tor => tor.infoHash.toLowerCase() === hashStr);
        if (existingTorrentInClient) {
            // If torrent is already completed, don't restore it - it can be played from disk
            if (existingTorrentInClient.done) {
                console.log(`[restoreTorrent] Skipping completed torrent ${hashStr} - already done`);
                return res.status(200).json({ message: "Torrent already completed - can be played from disk" });
            }
            
            // Torrent exists in client but not in activeTorrents - add it to tracking
            activeTorrents.set(hashStr, existingTorrentInClient);
            attachProgressEvents(existingTorrentInClient, slug, hashStr, sid, dir);
            
            const videoFile = getVideoFile(existingTorrentInClient);
            if (videoFile) {
                videoFile.select();
            }
            
            // Pause if not done - ensure it's actually paused
            if (!existingTorrentInClient.done) {
                // Add to stoppedTorrents first to prevent any auto-resume
                stoppedTorrents.add(hashStr);
                // Then pause the torrent
                if (!existingTorrentInClient.paused) {
                    existingTorrentInClient.pause();
                }
                // Force pause again to ensure it sticks
                if (!existingTorrentInClient.paused) {
                    existingTorrentInClient.pause();
                    console.warn(`[restoreTorrent] Torrent ${hashStr} required second pause() call`);
                }
            }
            
            if (targetSocket) {
                targetSocket.emit('newDownload', {
                    hash: hashStr,
                    name: existingTorrentInClient.name,
                    title,
                    slug,
                });
                
                // Check stoppedTorrents to ensure paused state is accurate
                const isPaused = existingTorrentInClient.paused || stoppedTorrents.has(hashStr);
                targetSocket.emit('downloadProgress', {
                    hash: hashStr,
                    slug,
                    progress: existingTorrentInClient.progress,
                    speed: existingTorrentInClient.downloadSpeed,
                    peers: existingTorrentInClient.numPeers,
                    downloaded: existingTorrentInClient.downloaded,
                    done: existingTorrentInClient.done,
                    fileName: existingTorrentInClient.name,
                    timeRemaining: existingTorrentInClient.timeRemaining,
                    paused: isPaused,
                    url: createStreamUrl(slug, hashStr, sid, dir),
                });
            }
            
            return res.status(200).json({ message: "Torrent restored from existing client torrent" });
        }

        // Create magnet link and add to client
        const magnetLink = addTrackersToMagnet(encodeMovieNameToMagnet(hashStr, title));
        
        await createDir(dir);

        // Add torrent directly to client without waiting for preload
        return new Promise<void>((resolve, reject) => {
            // Handle duplicate torrent error
            try {
                client!.add(magnetLink, { path: dir }, (torrent) => {
                    torrent.on("error", (torrentErr) => {
                        // Check if it's a duplicate error
                        const errMsg = (typeof torrentErr === 'string' ? torrentErr : torrentErr?.message || torrentErr?.toString() || '');
                        if (errMsg.includes("duplicate") || errMsg.includes("already exists")) {
                            // Torrent was already added - find it in client
                            const duplicateTorrent = client!.torrents.find(tor => tor.infoHash.toLowerCase() === hashStr);
                            if (duplicateTorrent) {
                                activeTorrents.set(hashStr, duplicateTorrent);
                                attachProgressEvents(duplicateTorrent, slug, hashStr, sid, dir);
                                
                                const videoFile = getVideoFile(duplicateTorrent);
                                if (videoFile) {
                                    videoFile.select();
                                }
                                
                                if (!duplicateTorrent.done) {
                                    // Add to stoppedTorrents first to prevent any auto-resume
                                    stoppedTorrents.add(hashStr);
                                    // Then pause the torrent
                                    if (!duplicateTorrent.paused) {
                                        duplicateTorrent.pause();
                                    }
                                    // Force pause again to ensure it sticks
                                    if (!duplicateTorrent.paused) {
                                        duplicateTorrent.pause();
                                        console.warn(`[restoreTorrent] Duplicate torrent ${hashStr} required second pause() call`);
                                    }
                                }
                                
                                if (targetSocket) {
                                    targetSocket.emit('newDownload', {
                                        hash: hashStr,
                                        name: duplicateTorrent.name,
                                        title,
                                        slug,
                                    });
                                    
                                    // Check stoppedTorrents to ensure paused state is accurate
                                    const isPaused = duplicateTorrent.paused || stoppedTorrents.has(hashStr);
                                    targetSocket.emit('downloadProgress', {
                                        hash: hashStr,
                                        slug,
                                        progress: duplicateTorrent.progress,
                                        speed: duplicateTorrent.downloadSpeed,
                                        peers: duplicateTorrent.numPeers,
                                        downloaded: duplicateTorrent.downloaded,
                                        done: duplicateTorrent.done,
                                        fileName: duplicateTorrent.name,
                                        timeRemaining: duplicateTorrent.timeRemaining,
                                        paused: isPaused,
                                        url: createStreamUrl(slug, hashStr, sid, dir),
                                    });
                                }
                                
                                addingTorrents.delete(hashStr);
                                if (!res.headersSent) {
                                    res.status(200).json({ message: "Torrent restored (was duplicate)" });
                                }
                                resolve();
                                return;
                            }
                        }
                        
                        console.error("Torrent Error:", torrentErr);
                        torrent.destroy();
                        activeTorrents.delete(hashStr);
                        addingTorrents.delete(hashStr);
                        if (!res.headersSent) {
                            res.status(500).json({ error: "Failed to restore torrent" });
                        }
                        reject(torrentErr);
                    });

                    const videoFile = getVideoFile(torrent);
                    if (!videoFile) {
                        addingTorrents.delete(hashStr);
                        if (!res.headersSent) {
                            res.status(500).json({ error: "Video file not found" });
                        }
                        return;
                    }

                    activeTorrents.set(hashStr, torrent);
                    attachProgressEvents(torrent, slug, hashStr, sid, dir);
                    
                    // Ensure video file is selected for streaming (both in-progress and completed)
                    videoFile.select();
                    
                    // Emit newDownload event
                    if (targetSocket) {
                        targetSocket.emit('newDownload', {
                            hash: hashStr,
                            name: torrent.name,
                            title,
                            slug,
                        });
                        
                        // Emit current progress state immediately (before pausing)
                        targetSocket.emit('downloadProgress', {
                            hash: hashStr,
                            slug,
                            progress: torrent.progress,
                            speed: torrent.downloadSpeed,
                            peers: torrent.numPeers,
                            downloaded: torrent.downloaded,
                            done: torrent.done,
                            fileName: torrent.name,
                            timeRemaining: torrent.timeRemaining,
                            paused: torrent.paused, // Will be true after pause below
                            url: createStreamUrl(slug, hashStr, sid, dir),
                        });
                    }

                    addingTorrents.delete(hashStr);

                    // Pause the torrent if not done (video file is already selected for streaming)
                    if (!torrent.done) {
                        // Add to stoppedTorrents first to prevent any auto-resume
                        stoppedTorrents.add(hashStr);
                        // Then pause the torrent
                        if (!torrent.paused) {
                            torrent.pause();
                        }
                        // Force pause again to ensure it sticks
                        if (!torrent.paused) {
                            torrent.pause();
                            console.warn(`[restoreTorrent] Torrent ${hashStr} required second pause() call`);
                        }
                        
                        // Emit paused state after pausing (with a small delay to ensure pause is applied)
                        if (targetSocket) {
                            setTimeout(() => {
                                // Double-check paused state before emitting
                                const isActuallyPaused = torrent.paused || stoppedTorrents.has(hashStr);
                                targetSocket.emit('downloadProgress', {
                                    hash: hashStr,
                                    slug,
                                    progress: torrent.progress,
                                    speed: torrent.downloadSpeed,
                                    peers: torrent.numPeers,
                                    downloaded: torrent.downloaded,
                                    done: torrent.done,
                                    fileName: torrent.name,
                                    timeRemaining: torrent.timeRemaining,
                                    paused: isActuallyPaused,
                                    url: createStreamUrl(slug, hashStr, sid, dir),
                                });
                            }, 100);
                        }
                    }

                    if (!res.headersSent) {
                        res.status(200).json({ message: "Torrent restored" });
                    }
                    resolve();
                });
            } catch (addError: any) {
                // Handle synchronous duplicate errors
                const errorMsg = addError?.message || addError?.toString() || '';
                if (errorMsg.includes("duplicate") || errorMsg.includes("already exists")) {
                    const duplicateTorrent = client!.torrents.find(tor => tor.infoHash.toLowerCase() === hashStr);
                    if (duplicateTorrent) {
                        activeTorrents.set(hashStr, duplicateTorrent);
                        attachProgressEvents(duplicateTorrent, slug, hashStr, sid, dir);
                        
                        const videoFile = getVideoFile(duplicateTorrent);
                        if (videoFile) {
                            videoFile.select();
                        }
                        
                        if (!duplicateTorrent.done) {
                            duplicateTorrent.pause();
                            stoppedTorrents.add(hashStr);
                        }
                        
                        if (targetSocket) {
                            targetSocket.emit('newDownload', {
                                hash: hashStr,
                                name: duplicateTorrent.name,
                                title,
                                slug,
                                    });
                                    
                                    // Check stoppedTorrents to ensure paused state is accurate
                                    const isPaused = duplicateTorrent.paused || stoppedTorrents.has(hashStr);
                                    targetSocket.emit('downloadProgress', {
                                        hash: hashStr,
                                        slug,
                                        progress: duplicateTorrent.progress,
                                        speed: duplicateTorrent.downloadSpeed,
                                        peers: duplicateTorrent.numPeers,
                                        downloaded: duplicateTorrent.downloaded,
                                        done: duplicateTorrent.done,
                                        fileName: duplicateTorrent.name,
                                        timeRemaining: duplicateTorrent.timeRemaining,
                                        paused: isPaused,
                                        url: createStreamUrl(slug, hashStr, sid, dir),
                                    });
                                }
                                
                                addingTorrents.delete(hashStr);
                        if (!res.headersSent) {
                            res.status(200).json({ message: "Torrent restored (was duplicate)" });
                        }
                        resolve();
                    } else {
                        reject(addError);
                    }
                } else {
                    reject(addError);
                }
            }
        });
    } catch (error) {
        console.error('Error restoring torrent:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: "Internal server error" });
        }
    }
};

export const getDownloadedFiles = async (req: Request, res: Response) => {
    try {
        if (!req.query.dir) {
            return res.status(400).json({ error: "Directory path is required" });
        }

        const dir = path.resolve(req.query.dir.toString());
        
        // Check if directory exists
        if (!fs.existsSync(dir)) {
            return res.status(404).json({ error: "Directory not found" });
        }

        // Check if it's actually a directory
        const stats = fs.statSync(dir);
        if (!stats.isDirectory()) {
            return res.status(400).json({ error: "Path is not a directory" });
        }

        const files: Array<{
            name: string;
            path: string;
            size: number;
            modified: Date;
            extension: string;
        }> = [];

        // Read directory recursively
        const readDirectory = (dirPath: string, relativePath: string = '') => {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                const relPath = path.join(relativePath, entry.name);

                try {
                    const entryStats = fs.statSync(fullPath);

                    if (entry.isDirectory()) {
                        // Recursively read subdirectories
                        readDirectory(fullPath, relPath);
                    } else if (entry.isFile()) {
                        // Check if it's a video file
                        const ext = path.extname(entry.name).toLowerCase();
                        if (ext === VideoExtensions.MP4 || ext === VideoExtensions.MKV || 
                            ext === '.avi' || ext === '.mov' || ext === '.wmv' || 
                            ext === '.flv' || ext === '.webm' || ext === '.m4v') {
                            files.push({
                                name: entry.name,
                                path: relPath,
                                size: entryStats.size,
                                modified: entryStats.mtime,
                                extension: ext,
                            });
                        }
                    }
                } catch (err) {
                    // Skip files/directories we can't access
                    console.error(`Error reading ${fullPath}:`, err);
                }
            }
        };

        readDirectory(dir);

        res.status(200).json({ files });
    } catch (error) {
        console.error('Error while fetching downloaded files: ', error);
        res.status(500).send({ error: "Internal server error. Please restart the app and try again." });
    }
}

const getVideoFile = (torrent: WebTorrent.Torrent) => {
    return  torrent.files.find(
        (file) => file.name.endsWith(VideoExtensions.MP4) || file.name.endsWith(VideoExtensions.MKV)
    );
}

const createStreamUrl = (slug: string, hash: string, sid: string, dir: string) => {
    return `/stream/${slug}?hash=${hash}&sid=${sid}&dir=${dir}`;
}
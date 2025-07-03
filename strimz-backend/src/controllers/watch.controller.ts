import { Request, Response } from "express";
import WebTorrent from "webtorrent";
import { VideoExtensions } from "../utils/constants.js";
import { addTrackersToMagnet, encodeMovieNameToMagnet } from "../utils/magnet.js";
import path from "path";
import fs from "fs";
import { ioServer } from "../index.js";

let client: WebTorrent.Instance | null = null;
const activeTorrents: Map<string, WebTorrent.Torrent> = new Map();
const addingTorrents: Map<string, Promise<WebTorrent.Torrent>> = new Map();

const handleTorrent = (req: Request, res: Response, torrent: WebTorrent.Torrent) => {
    try {
        const file = torrent.files.find(
            (file) =>
                file.name.endsWith(VideoExtensions.MP4) || file.name.endsWith(VideoExtensions.MKV)
        );

        if (!file) {
            console.error("No suitable video file found in torrent. Please try again using a different torrent.");
            return res.status(404).json({ error: "File not found. Please try again using with a different torrent." });
        }

        const hash = torrent.infoHash.toLowerCase();

        const range = req.headers.range;
        const fileSize = file.length;

        req.on('close', () => {
            if (activeTorrents.has(hash)) {
                torrent.pause();
                torrent.files.forEach(file => file.deselect());
            }
        });

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = (end - start) + 1;

            res.writeHead(206, {
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Accept-Ranges": "bytes",
                "Content-Length": chunkSize,
                "Content-Type": "video/mp4",
            });

            const stream = file.createReadStream({ start, end });

            if (!stream) {
                console.error("Failed to create stream");
                return res.status(500).json({ error: "Stream failed. Please try again with a different torrent." });
            }

            const {sid} = req.query;

            if (sid) {
                const targetSocket = ioServer.sockets.sockets.get(sid as string);

                if (torrent.paused) {
                    torrent.resume();
                }

                torrent.on("download", () => {
                    if (targetSocket) {
                        targetSocket.emit('downloadProgress', {
                            hash,
                            progress: torrent.progress,
                            speed: torrent.downloadSpeed,
                            peers: torrent.numPeers,
                            downloaded: torrent.downloaded,
                            done: false,
                        });
                    }
                });

                if (torrent.done) {
                    if (targetSocket) {
                        targetSocket.emit('downloadDone', {
                            hash,
                            progress: torrent.progress,
                            speed: torrent.downloadSpeed,
                            peers: torrent.numPeers,
                            downloaded: torrent.downloaded,
                            done: torrent.done,
                        });
                    }
                }
            }

            stream.pipe(res);

            stream.on("error", (err) => {
                if (stream.readable) {
                    
                    if (torrent.paused) {
                        torrent.resume();
                    }
                    
                    stream.resume();
                    return;
                }
                console.error("Stream error:", err);
            });
        } else {
            res.writeHead(206, {
                "Content-Length": fileSize,
                "Content-Type": "video/mp4",
            });

            const stream = file.createReadStream();

            if (!stream) {
                console.error("Failed to create stream");
                return res.status(500).json({ error: "Stream failed. Please try again with a different torrent." });
            }
            stream.pipe(res);

            stream.on("error", (err) => {
                if (stream.readable) {
                    console.log("Got stream error but stream is still readable, resuming...");
                    stream.resume();
                    return;
                }
                console.error("Stream error:", err);
            });
        }
    } catch (err) {
        console.error("Error in handleTorrent:", err);
        if (!res.headersSent) {
            res.status(500).json({ error: "Stream failed. Please try again with a different torrent." });
        }
    }
}

const pauseOtherTorrents = (currentHash: string) => {
    activeTorrents.forEach((torrent, hash) => {
        if (hash !== currentHash && !torrent.paused) {
            torrent.pause();
            torrent.files.forEach(file => file.deselect());
        }
    });
}

export const pauseMovieStream = async (req: Request, res: Response) => {
    try {
        const { hash } = req.params;
        
        if (!hash) {
            return res.status(400).json({ error: "Could not pause download. Missing torrent hash." });
        }

        const hashStr = String(hash).toLowerCase();

        const torrent = activeTorrents.get(hashStr);

        if (!torrent) {
            return res.status(404).json({ error: "Torrent not found" });
        }

        if (!torrent.paused) {
            torrent.pause();
            torrent.files.forEach(file => file.deselect());
        }

        return res.status(200).json({ message: "Torrent paused" });
    } catch (error) {
        console.error("Error pausing torrent:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export const watchMovieStatus = async (req: Request, res: Response) => {
    try {
        const { hash, title, dir, sid } = req.query;

        if (!dir || !sid || !hash || !title) {
            return res.status(400).json({ error: "Stream failed. Please restart the app and try again." });
        }

        const requestedDir = path.resolve(dir as string);

        if (!fs.existsSync(requestedDir)) {
            fs.mkdirSync(requestedDir, { recursive: true });
        }

        const headers = {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }

        if (!client) {
            client = new WebTorrent();

            client.on("error", (err) => {
                console.error("WebTorrent Client Error:", err);
                if (!res.headersSent) {
                    res.writeHead(500, headers);
                    res.write(`data: ${JSON.stringify({ error: "WebTorrent client error" })}\n\n`);
                    res.end();
                }
                client?.destroy();
                client = null;
            });
        }

        const hashStr: string | null = hash.toString().toLowerCase();
        const magnetLink: string | null = addTrackersToMagnet(encodeMovieNameToMagnet(hashStr, title as string));;

        // If torrent is already active, return early
        if (activeTorrents.has(hashStr)) {
            console.log("Torrent already active, sending ready");
            res.writeHead(200, headers);
            res.write(`data: ${JSON.stringify("Video is ready")}\n\n`);
            return res.end();
        }

        res.writeHead(200, headers);
        res.flushHeaders();

        // Check if this torrent is already being added
        if (addingTorrents.has(hashStr)) {
            const existingPromise = addingTorrents.get(hashStr);
            await existingPromise;
            res.write(`data: ${JSON.stringify("Movie is ready")}\n\n`);
            return res.end();
        }

        const torrentPromise = new Promise<WebTorrent.Torrent>((resolve, reject) => {
            client!.add(magnetLink as string, { path: requestedDir }, (torrent) => {
                torrent.on("error", (torrentErr) => {
                    console.error("Torrent Error:", torrentErr);
                    torrent.destroy();
                    activeTorrents.delete(hashStr);
                    reject(torrentErr);

                    res.status(500).send(torrentErr);
                });

                // Find the main video file
                const videoFile = torrent.files.find((file) =>
                    file.name.endsWith(".mp4") || file.name.endsWith(".mkv")
                );

                if (!videoFile) {
                    res.write(`data: ${JSON.stringify({ error: "No video file found." })}\n\n`);
                    return res.end();
                }

                activeTorrents.set(hashStr, torrent);
                console.table(activeTorrents);

                // Prioritize beginning of video file
                const PRELOAD_BYTES = 5 * 1024 * 1024; // First 5MB
                videoFile.select();

                const checkInterval = setInterval(() => {
                    if (videoFile.downloaded >= PRELOAD_BYTES) {
                        clearInterval(checkInterval);
                        if (!res.writableEnded) {
                            res.write(`data: ${JSON.stringify("Movie is ready")}\n\n`);
                            res.end();
                        }
                    }
                }, 500);

                // Emit download progress
                const targetSocket = ioServer.sockets.sockets.get(sid as string);

                torrent.on("download", () => {
                    if (targetSocket) {
                        targetSocket.emit('downloadProgress', {
                            hash: hashStr,
                            progress: torrent.progress,
                            speed: torrent.downloadSpeed,
                        });
                    }
                });
                torrent.on("done", () => {
                    if (targetSocket) {
                        targetSocket.emit('downloadDone', {
                            hash: hashStr,
                            done: torrent.done,
                        });
                    }
                });

                resolve(torrent);
            });
        });

        req.on("error", () => {
            const torrent = client?.torrents.find(tor => tor.infoHash.toLowerCase() === hashStr);

            if (torrent) {
                torrent?.destroy({ destroyStore: true }, () => {
                    console.log(`Torrent ${hashStr} destroyed due to request error.`);
                    activeTorrents.delete(hashStr);
                    addingTorrents.delete(hashStr);
                });
            }
        });

        addingTorrents.set(hashStr, torrentPromise);

        torrentPromise.finally(() => addingTorrents.delete(hashStr));
    } catch (error) {
        console.error("watchMovieStatus error:", error);
        if (!res.headersSent) {
            res.writeHead(500, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            });
            res.write(`data: ${JSON.stringify({ error: "Internal server error" })}\n\n`);
            res.end();
        }
    }
}


export const watchMovieStream = async (req: Request, res: Response) => {
    try {
        const { hash } = req.query;
        const hashStr = String(hash).toLowerCase();
        const torrentInClient = activeTorrents.get(hashStr);
        if (torrentInClient) {
            pauseOtherTorrents(hashStr);
            return handleTorrent(req, res, torrentInClient);
        } else {
            return res.status(404).send({error: "Stream not ready. Please try again."});
        }
    } catch (error) {
        console.error("General error:", error);
        if (!res.headersSent) {
            res.status(500).send({ error: "Internal server error. Please restart the app and try again." });
        }
    }
}

export const handleTorrentFromPath = async (req: Request, res: Response) => {
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
                    console.error("WebTorrent Client Error:", err);
                    client?.destroy();
                    client = null;
                }
            });
        }

        if (client.torrents.length) {
            if (client.torrents[0].infoHash) {
                return res.status(200).json({
                    hash: client.torrents[0].infoHash.toLowerCase(),
                    title: client.torrents[0].name,
                });
            } else {
                client.destroy();
                client = null;
                client = new WebTorrent();
            }
        }

        client.add(torrentFilePath as string, { path: requestedDir }, (torrent) => {
            torrent.on("error", (torrentErr) => {
                console.error("Torrent Error:", torrentErr);
                torrent.destroy();
                return res.status(500).send(torrentErr);
            });

            const hash = torrent.infoHash.toLowerCase();
            const title = torrent.name;
            
            addingTorrents.set(hash, new Promise((resolve, reject) => resolve(torrent)));

            res.status(200).json({hash, title});

            addingTorrents.delete(hash);
            client?.remove(torrent);
        });
    } catch (error) {
        console.error("General error:", error);
        res.status(500).send({ error: "Internal server error. Please restart the app and try again." });
    }
}
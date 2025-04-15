import { Request, Response } from "express";
import WebTorrent from "webtorrent";
import { BASE_DIR, VideoExtensions } from "../utils/constants.js";
import { addTrackersToMagnet, encodeMovieNameToMagnet } from "../utils/magnet.js";
import path from "path";
import fs from "fs";

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

        const range = req.headers.range;
        const fileSize = file.length;

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

            stream.pipe(res);

            stream.on("error", (err) => {
                if (stream.readable) {
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
            console.log(`Pausing torrent: ${hash}`);
            torrent.pause();
        }
    });
}

export const pauseMovieStream = async (req: Request, res: Response) => {
    try {
        const { hash } = req.params;
        console.log(hash)

        if (!hash) {
            return res.status(400).json({ error: "Could not pause download. Missing torrent hash." });
        }

        const torrent = activeTorrents.get(hash as string);

        if (!torrent) {
            return res.status(404).json({ error: "Torrent not found" });
        }

        if (!torrent.paused) {
            torrent.pause();
            console.log(`Torrent ${hash} paused.`);
        }

        const MIN_TORRENT_PROGRESS: number = 0.15;
        if (torrent.progress <= MIN_TORRENT_PROGRESS) {
            // Optional: destroy the torrent if you want to clean up memory
            torrent.destroy();
            console.log("Destroyed torrent", torrent.progress)
            activeTorrents.delete(hash as string);
        }

        return res.status(200).json({ message: "Torrent paused" });
    } catch (error) {
        console.error("Error pausing torrent:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export const watchMovieStatus = async (req: Request, res: Response) => {
    try {
        const { hash, title, dir } = req.query;

        if (!hash || !title || !dir) {
            return res.status(400).json({ error: "Stream failed. Please restart the app and try again." });
        }

        const magnetLink: string = addTrackersToMagnet(
            encodeMovieNameToMagnet(hash as string, title as string)
        );

        const requestedDir = dir ? path.resolve(dir as string) : BASE_DIR;

        if (!fs.existsSync(requestedDir)) {
            fs.mkdirSync(requestedDir, { recursive: true });
        }

        if (!client) {
            client = new WebTorrent();

            client.on("error", (clientErr) => {
                console.error("WebTorrent Client Error:", clientErr);
                if (!res.headersSent) {
                    res.writeHead(500, {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                    });
                    res.write(`data: ${JSON.stringify({ error: "WebTorrent client error" })}\n\n`);
                    res.end();
                }
                if (client) {
                    client.destroy();
                    client = null;
                }
            });
        }

        const hashStr = hash as string;
        const torrentInClient = activeTorrents.get(hashStr);

        if (torrentInClient) {
            console.log("Already in client, playing...");
            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            });
            res.write(`data: ${JSON.stringify("Video is ready")}\n\n`);
            res.end();
            return;
        }

        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        });
        res.flushHeaders();

        if (addingTorrents.has(hashStr)) {
            const torrent = await addingTorrents.get(hashStr);
            if (torrent) {
                res.write(`data: ${JSON.stringify("Movie is ready")}\n\n`);
                res.end();
                return;
            }
        }

        const addTorrentPromise = new Promise<WebTorrent.Torrent>((resolve, reject) => {
            client!.add(
                magnetLink,
                {
                    path: requestedDir,
                    destroyStoreOnDestroy: false,
                    storeCacheSlots: 0,
                },
                (torrent) => {
                    activeTorrents.set(hashStr, torrent);
                    torrent.on("error", (torrentErr) => {
                        console.error("Torrent Error:", torrentErr);
                        torrent.destroy();
                        activeTorrents.delete(hashStr);
                        reject(torrentErr);
                    });
                    resolve(torrent);
                }
            );
        });

        addingTorrents.set(hashStr, addTorrentPromise);

        addTorrentPromise
            .then((torrent) => {
                let videoReadySent = false;
                torrent.on('download', () => {
                    if ((torrent.progress * 100) >= 1 && !videoReadySent) {
                        addingTorrents.delete(hashStr);
                        res.write(`data: ${JSON.stringify("Movie is ready")}\n\n`);
                        videoReadySent = true;
                        res.end();
                    }
                })

                torrent.on('error', (torrentErr) => {
                    console.error(`Torrent Error (${hashStr}):`, torrentErr);
                    if (!res.writableEnded) {
                        res.write(`data: ${JSON.stringify({ error: "Torrent Error." })}\n\n`);
                        res.end();
                    } else {
                        console.log("Response already ended, torrent error not sent to client.");
                    }
                });
            })
            .catch((err) => {
                addingTorrents.delete(hashStr);
                console.error(`Error adding torrent ${hashStr}:`, err);
                if (!res.headersSent) {
                    res.write(`data: ${JSON.stringify({ error: "Failed to add torrent." })}\n\n`);
                    res.end();
                }
            });
    } catch (error) {
        console.error("General error:", error);
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
        const hashStr = hash as string;
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
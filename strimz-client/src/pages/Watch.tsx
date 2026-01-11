import { WATCH_MOVIE_URL } from '../utils/constants';
import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setSubtitleFilePath } from '../store/movies/movies.slice';
import LoadingScreen from '../components/LoadingScreen';
import { selectSettings } from '../store/settings/settings.selectors';
import { selectSocket } from '@/store/socket/socket.selectors';
import Player from '@/components/player/Player';
import { selectMovie, selectSubtitleLang, selectSelectedSubtitleFileId } from '@/store/movies/movies.selectors';
import { downloadSubtitleFromApi } from '@/services/subtitles';
import { toOpenSubtitlesCode } from '@/utils/detectLanguage';
import { Download, setDownloads } from '@/store/downloads/downloads.slice';
import { selectDownloads } from '@/store/downloads/downloads.selectors';
import { addNewTorrent, playTorrent } from '@/services/movies';

const WatchMoviePage = () => {
    const [searchParams] = useSearchParams();
    const params = useParams();

    const settings = useAppSelector(selectSettings);

    const [videoSrc, setVideoSrc] = useState<string | null>(null);

    const dispatch = useAppDispatch();

    const { slug } = params;
    const title = searchParams.get('title');
    const hash = searchParams.get('hash');

    const socket = useAppSelector(selectSocket);
    const movie = useAppSelector(selectMovie);

    const subtitleLang = useAppSelector(selectSubtitleLang);
    const selectedSubtitleFileId = useAppSelector(selectSelectedSubtitleFileId);

    const downloads = useAppSelector(selectDownloads);

    const addTorrent = useCallback(async () => {
        if (!slug || !hash || !title || !settings.downloadsFolderPath || !socket?.id) return;

        await addNewTorrent({
            slug,
            hash,
            title,
            dir: settings.downloadsFolderPath,
            sid: socket.id,
        });

    }, [slug, hash, title, settings.downloadsFolderPath, socket?.id]);
    
    useEffect(() => {
        if (!socket?.id) return;

        addTorrent();
    }, [addTorrent, socket]);

    useEffect(() => {
        if (
            !subtitleLang ||
            !selectedSubtitleFileId ||
            !movie?.imdb_code ||
            !title ||
            !movie.year ||
            !settings.downloadsFolderPath
        ) return;

        const startSubtitlesDownload = async () => {
            try {
                const openSubtitlesLangCode = toOpenSubtitlesCode(subtitleLang);
                const {data: subtitleFilePath} = await downloadSubtitleFromApi(
                    selectedSubtitleFileId,
                    movie.imdb_code,
                    title,
                    movie.year.toString(),
                    openSubtitlesLangCode,
                    settings.downloadsFolderPath
                );
                dispatch(setSubtitleFilePath(subtitleFilePath));
            } catch (error) {
                console.error('Error downloading subtitle from API:', error);
            }
        }

        startSubtitlesDownload();
    }, [
        subtitleLang,
        selectedSubtitleFileId,
        movie?.imdb_code,
        movie?.year,
        title,
        settings.downloadsFolderPath,
        dispatch
    ]);

    useEffect(() => {
        if (!socket?.id || !hash || !slug || !settings.downloadsFolderPath) {
            return;
        }

        const newDownloadHandler = async (data: Download) => {
            if (data.hash.toLowerCase() === hash?.toLowerCase()) {
                const res = await playTorrent(hash);
                if (res.status === 200) {
                    const streamUrl = `${WATCH_MOVIE_URL}${slug}?hash=${hash}&sid=${socket.id}&dir=${settings.downloadsFolderPath}`;
                    setVideoSrc(streamUrl);
                }
            }
            
            dispatch(setDownloads([
                ...downloads.filter(d => d.hash !== data.hash),
                data
            ]));
        }

        socket.on('newDownload', newDownloadHandler);

        return () => {
            socket.off('newDownload', newDownloadHandler);
        }
    }, [socket, downloads, dispatch, hash, slug, settings.downloadsFolderPath]);

    return videoSrc
        ? <Player src={videoSrc} />
        : <LoadingScreen hash={hash as string} />;
}

export default WatchMoviePage;
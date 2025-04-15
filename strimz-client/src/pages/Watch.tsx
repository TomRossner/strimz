import MoviePlayer from '../components/MoviePlayer';
import { API_URL, WATCH_MOVIE_URL } from '../utils/constants';
import React, { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setError, setIsLoading } from '../store/movies/movies.slice';
import LoadingScreen from '../components/LoadingScreen';
import { selectSettings } from '../store/settings/settings.selectors';

const WatchMoviePage = () => {
    const [searchParams] = useSearchParams();
    const params = useParams();

    const settings = useAppSelector(selectSettings);

    const [videoSrc, setVideoSrc] = useState<string | null>(null);

    const dispatch = useAppDispatch();

    const { slug } = params;
    const title = searchParams.get('title');
    const hash = searchParams.get('hash');

    const statusUrl = `${API_URL}/sse/status/${slug}?hash=${hash}&title=${title}&dir=${settings.path}`;
    const streamUrl = `${WATCH_MOVIE_URL}${slug}?hash=${hash}`;
    
    useEffect(() => {
        const eventSource = new EventSource(statusUrl);
    
        eventSource.addEventListener('message', (event) => {
                try {
                    const data = JSON.parse(event.data);
        
                    if (data) {
                        setVideoSrc(streamUrl);
                        eventSource.close();
                    }
                } catch (parseError) {
                    console.error("Error parsing SSE data:", parseError, "Raw data:", event.data);
                }
            }
        );

        eventSource.onerror = (err) => {
            if (eventSource.readyState !== EventSource.CLOSED) {
                console.error("SSE error on client side", err);
                dispatch(setIsLoading(false));
            } else {
                console.log("SSE error due to client-initiated close, ignored.");
                // dispatch(closeModal('movie'));
            }
            dispatch(setError("Failed starting stream. Please restart the app and try again."));
            eventSource.close();
        };

        return () => {
            eventSource.close();
        }
    }, []);

    return videoSrc
        ? <MoviePlayer movieSrc={videoSrc} />
        : <LoadingScreen />;
}

export default WatchMoviePage;
import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import SplashScreen from './SplashScreen';
import { getPipActive, subscribePip } from '@/services/pip';
import { pauseDownload } from '@/services/movies';

const WatchMoviePage = lazy(() => import('../pages/Watch'));
const WatchFilePage = lazy(() => import('../pages/WatchFile'));

const isWatchPath = (pathname: string) => pathname.startsWith('/stream/') || pathname.startsWith('/watch-file');

const PersistedWatch = () => {
    const location = useLocation();
    const pipActive = useSyncExternalStore(subscribePip, getPipActive);
    const onWatchRoute = isWatchPath(location.pathname);
    const [watchLocation, setWatchLocation] = useState(location);
    const hashRef = useRef<string | null>(null);

    useEffect(() => {
        if (!onWatchRoute) return;
        setWatchLocation(location);
        hashRef.current = new URLSearchParams(location.search).get('hash');
    }, [onWatchRoute, location]);

    useEffect(() => {
        if (onWatchRoute || pipActive) return;
        const hash = hashRef.current;
        if (!hash) return;
        hashRef.current = null;
        pauseDownload(hash).catch((error) => console.error(error));
    }, [onWatchRoute, pipActive]);

    const keepPlaying = pipActive && isWatchPath(watchLocation.pathname);
    if (!onWatchRoute && !keepPlaying) return null;

    return (
        <div
            aria-hidden={!onWatchRoute}
            className={onWatchRoute ? 'contents' : 'pointer-events-none fixed -left-[120vw] top-0 h-[360px] w-[640px] overflow-hidden'}
        >
            <Suspense fallback={onWatchRoute ? <SplashScreen /> : null}>
                <Routes location={onWatchRoute ? location : watchLocation}>
                    <Route path='/stream/:slug' element={<WatchMoviePage />} />
                    <Route path='/watch-file' element={<WatchFilePage />} />
                </Routes>
            </Suspense>
        </div>
    );
};

export default PersistedWatch;

import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import SplashScreen from './SplashScreen';
import { clearReturnToPlayer, getPipActive, getReturnToPlayer, subscribePip } from '@/services/pip';
import { pauseDownload } from '@/services/movies';

const WatchMoviePage = lazy(() => import('../pages/Watch'));
const WatchFilePage = lazy(() => import('../pages/WatchFile'));

const isWatchPath = (pathname: string) => pathname.startsWith('/stream/') || pathname.startsWith('/watch-file');

const PersistedWatch = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const pipActive = useSyncExternalStore(subscribePip, getPipActive);
    const returnToPlayer = useSyncExternalStore(subscribePip, getReturnToPlayer);
    const onWatchRoute = isWatchPath(location.pathname);
    const [watchLocation, setWatchLocation] = useState(location);
    const hashRef = useRef<string | null>(null);

    if (
        onWatchRoute &&
        (watchLocation.pathname !== location.pathname || watchLocation.search !== location.search)
    ) {
        setWatchLocation(location);
    }

    useEffect(() => {
        if (!onWatchRoute) return;
        hashRef.current = new URLSearchParams(location.search).get('hash');
    }, [onWatchRoute, location]);

    useEffect(() => {
        if (!returnToPlayer) return;
        if (onWatchRoute) {
            clearReturnToPlayer();
            return;
        }
        if (!isWatchPath(watchLocation.pathname)) return;
        navigate({
            pathname: watchLocation.pathname,
            search: watchLocation.search,
            hash: watchLocation.hash,
        }, { state: watchLocation.state });
    }, [returnToPlayer, onWatchRoute, watchLocation, navigate]);

    useEffect(() => {
        if (onWatchRoute || pipActive || returnToPlayer) return;
        const hash = hashRef.current;
        if (!hash) return;
        hashRef.current = null;
        pauseDownload(hash).catch((error) => console.error(error));
    }, [onWatchRoute, pipActive, returnToPlayer]);

    const keepPlaying = (pipActive || returnToPlayer) && isWatchPath(watchLocation.pathname);
    if (!onWatchRoute && !keepPlaying) return null;

    return (
        <div
            aria-hidden={!onWatchRoute}
            className={onWatchRoute ? 'contents' : 'pointer-events-none fixed -left-[120vw] top-0 h-[360px] w-[640px] overflow-hidden'}
        >
            <Suspense fallback={onWatchRoute ? <SplashScreen /> : null}>
                <Routes location={watchLocation}>
                    <Route path='/stream/:slug' element={<WatchMoviePage />} />
                    <Route path='/watch-file' element={<WatchFilePage />} />
                </Routes>
            </Suspense>
        </div>
    );
};

export default PersistedWatch;

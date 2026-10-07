import { useEffect, useState } from 'react';
import { BiChevronLeft, BiChevronRight } from 'react-icons/bi';
import { BsArrowCounterclockwise, BsPlayFill } from 'react-icons/bs';
import { RxCross2 } from 'react-icons/rx';
import Button from '../Button';
import QualitySelector from '../dialog/QualitySelector';
import Rating from '../dialog/Rating';
import TorrentSelector from '../dialog/TorrentSelector';
import { Movie } from '../MovieCard';
import { HORIZONTAL_SCROLLER_CLASS, useHorizontalDragScroll } from '../useHorizontalDragScroll';
import { Torrent } from '@/utils/types';

type NextFile = { name: string };

type FinishedMovie = {
    title: string;
    year?: number;
    poster?: string;
};

interface PlayNextOverlayProps {
    finished: FinishedMovie;
    suggestions: Movie[];
    nextFile?: NextFile | null;
    onReplay: () => void;
    onPlayFile: () => void;
    onPlayMovie: (movie: Movie, hash: string) => void;
    onDismiss: () => void;
}

const coverOf = (movie: Movie) => movie.large_cover_image || movie.medium_cover_image || movie.small_cover_image || '';

const bestTorrent = (torrents: Torrent[], quality?: string) => {
    const matching = quality ? torrents.filter((torrent) => torrent.quality === quality) : torrents;
    const order = ['1080p', '720p', '2160p', '1080p.x265', '480p'];
    if (!quality) {
        for (const preferred of order) {
            const match = [...matching].filter((torrent) => torrent.quality === preferred).sort((a, b) => (b.seeds || 0) - (a.seeds || 0))[0];
            if (match) return match;
        }
    }
    return [...matching].sort((a, b) => (b.seeds || 0) - (a.seeds || 0))[0];
};

const Cover = ({ src, title }: { src?: string; title: string }) => (
    src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
    ) : (
        <div className="flex h-full w-full items-end bg-stone-800 p-2 text-sm text-stone-300">{title}</div>
    )
);

const PlayNextOverlay = ({
    finished,
    suggestions,
    nextFile,
    onReplay,
    onPlayFile,
    onPlayMovie,
    onDismiss,
}: PlayNextOverlayProps) => {
    const suggestionKey = suggestions.map((movie) => movie.id).join(',');
    const [selectedId, setSelectedId] = useState<string | null>(suggestions[0] ? String(suggestions[0].id) : null);
    const [quality, setQuality] = useState('');
    const [hash, setHash] = useState('');
    const featured = suggestions.find((movie) => String(movie.id) === selectedId) || suggestions[0] || null;
    const others = suggestions.filter((movie) => featured && String(movie.id) !== String(featured.id));
    const torrents = ((featured?.torrents || []) as Torrent[]).filter((torrent) => torrent?.hash);
    const {
        scrollerRef,
        canScrollLeft,
        canScrollRight,
        scrollByPage,
        onDragPointerDown,
        onDragPointerMove,
        onDragPointerEnd,
        onDragClickCapture,
    } = useHorizontalDragScroll(`${suggestionKey}:${selectedId}`);

    useEffect(() => {
        const first = suggestions[0];
        setSelectedId(first ? String(first.id) : null);
    }, [suggestionKey, suggestions]);

    useEffect(() => {
        const nextTorrents = ((featured?.torrents || []) as Torrent[]).filter((torrent) => torrent?.hash);
        const torrent = bestTorrent(nextTorrents);
        setQuality(torrent?.quality || '');
        setHash(torrent?.hash || '');
    }, [featured]);

    const selectQuality = (nextQuality: string) => {
        setQuality(nextQuality);
        const torrent = bestTorrent(torrents, nextQuality);
        if (torrent) setHash(torrent.hash);
    };

    return (
        <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4">
            <div className="flex max-h-full w-full max-w-5xl flex-col overflow-y-auto rounded-md border border-stone-700 bg-stone-950 text-white shadow-2xl">
                <div className="flex flex-wrap items-center gap-4 border-b border-stone-800 p-4">
                    <div className="h-24 w-16 shrink-0 overflow-hidden bg-stone-900">
                        <Cover src={finished.poster} title={finished.title} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs uppercase tracking-widest text-stone-400">Finished</p>
                        <h2 className="mt-1 text-2xl font-medium leading-tight">{finished.title}</h2>
                        {finished.year ? <p className="mt-1 text-stone-400">{finished.year}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={onReplay} className="gap-1.5 bg-stone-700 px-3 py-2 hover:bg-stone-600">
                            <BsArrowCounterclockwise className="text-base" />
                            Play again
                        </Button>
                        {nextFile && (
                            <Button onClick={onPlayFile} className="bg-stone-800 px-3 py-2 hover:bg-stone-700" title={nextFile.name}>
                                Next file
                            </Button>
                        )}
                        <Button onClick={onDismiss} className="gap-1.5 bg-transparent px-3 py-2 hover:bg-stone-800">
                            <RxCross2 className="text-base" />
                            Close
                        </Button>
                    </div>
                </div>

                {featured && (
                    <div className="grid gap-4 p-4 md:grid-cols-[200px_1fr]">
                        <div className="aspect-[2/3] overflow-hidden bg-stone-900">
                            <Cover src={coverOf(featured)} title={featured.title} />
                        </div>
                        <div className="flex min-w-0 flex-col gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-widest text-stone-400">Up next</p>
                                <h3 className="mt-1 text-xl font-medium">{featured.title}</h3>
                                {featured.year ? <p className="mt-1 text-sm text-stone-400">{featured.year}</p> : null}
                                <div className="mt-2">
                                    <Rating rating={featured.rating} />
                                </div>
                            </div>
                            <QualitySelector
                                idPrefix="play-next-"
                                torrents={torrents}
                                selected={quality}
                                handleSelect={selectQuality}
                            />
                            <TorrentSelector
                                idPrefix="play-next-"
                                title={featured.title}
                                torrents={torrents}
                                quality={quality}
                                hash={hash}
                                handleSelect={setHash}
                            />
                            <Button
                                onClick={() => hash && onPlayMovie(featured, hash)}
                                disabled={!hash}
                                className="gap-1.5 bg-blue-500 px-3 py-2 hover:bg-blue-400"
                            >
                                <BsPlayFill className="text-base" />
                                Play next
                            </Button>
                        </div>
                    </div>
                )}

                {others.length > 0 && (
                    <section className="border-t border-stone-800 py-3" aria-label={`More like ${finished.title}`}>
                        <h3 className="mb-2 px-4 text-lg font-medium">More like {finished.title}</h3>
                        <div className="relative">
                            {canScrollLeft && (
                                <button
                                    type="button"
                                    aria-label="Scroll suggestions left"
                                    onClick={() => scrollByPage(-1)}
                                    className="absolute left-1 top-[4.5rem] z-[1] flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
                                >
                                    <BiChevronLeft className="text-3xl" />
                                </button>
                            )}
                            <div
                                ref={scrollerRef}
                                onPointerDown={onDragPointerDown}
                                onPointerMove={onDragPointerMove}
                                onPointerUp={onDragPointerEnd}
                                onPointerCancel={onDragPointerEnd}
                                onClickCapture={onDragClickCapture}
                                onDragStart={(event) => event.preventDefault()}
                                className={HORIZONTAL_SCROLLER_CLASS}
                            >
                                {others.map((movie) => (
                                    <button
                                        key={movie.id}
                                        type="button"
                                        onClick={() => setSelectedId(String(movie.id))}
                                        className="w-[168px] shrink-0 cursor-pointer text-left"
                                    >
                                        <div className="aspect-[2/3] overflow-hidden bg-stone-800">
                                            <Cover src={coverOf(movie)} title={movie.title} />
                                        </div>
                                        <p className="mt-2 truncate text-sm font-medium">{movie.title}</p>
                                        <div className="mt-1 text-xs">
                                            <Rating rating={movie.rating} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                            {canScrollRight && (
                                <button
                                    type="button"
                                    aria-label="Scroll suggestions right"
                                    onClick={() => scrollByPage(1)}
                                    className="absolute right-1 top-[4.5rem] z-[1] flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
                                >
                                    <BiChevronRight className="text-3xl" />
                                </button>
                            )}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default PlayNextOverlay;

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';

const DRAG_START_DISTANCE = 5;
const MOMENTUM_SAMPLE_MS = 100;
const MOMENTUM_MIN_VELOCITY = 0.08;
const MOMENTUM_MAX_VELOCITY = 1.8;
const MOMENTUM_DECAY_MS = 420;

export const HORIZONTAL_SCROLLER_CLASS = 'flex cursor-grab select-none gap-3 overflow-x-auto scroll-smooth px-2 py-2 active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&_img]:[-webkit-user-drag:none]';

export const useHorizontalDragScroll = (refreshKey: unknown) => {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef({
        pointerId: -1,
        startX: 0,
        startScrollLeft: 0,
        moved: false,
    });
    const velocitySamplesRef = useRef<{ x: number; time: number }[]>([]);
    const momentumRef = useRef<number | null>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollState = useCallback(() => {
        const scroller = scrollerRef.current;
        if (!scroller) return;

        setCanScrollLeft(scroller.scrollLeft > 4);
        setCanScrollRight(scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 4);
    }, []);

    useLayoutEffect(() => {
        updateScrollState();
    }, [refreshKey, updateScrollState]);

    useEffect(() => {
        const scroller = scrollerRef.current;
        if (!scroller) return;

        scroller.addEventListener('scroll', updateScrollState, { passive: true });
        window.addEventListener('resize', updateScrollState);

        return () => {
            scroller.removeEventListener('scroll', updateScrollState);
            window.removeEventListener('resize', updateScrollState);
        };
    }, [refreshKey, updateScrollState]);

    const stopMomentum = useCallback(() => {
        if (momentumRef.current == null) return;
        cancelAnimationFrame(momentumRef.current);
        momentumRef.current = null;
    }, []);

    useEffect(() => stopMomentum, [stopMomentum]);

    const scrollByPage = (direction: -1 | 1) => {
        const scroller = scrollerRef.current;
        if (!scroller) return;

        stopMomentum();
        scroller.scrollBy({
            left: direction * Math.max(scroller.clientWidth * 0.8, 180),
            behavior: 'smooth',
        });
    };

    const recordVelocitySample = (x: number, time: number) => {
        const samples = velocitySamplesRef.current;
        samples.push({ x, time });
        const earliest = time - MOMENTUM_SAMPLE_MS;
        while (samples.length > 2 && samples[0].time < earliest) {
            samples.shift();
        }
    };

    const releaseScroll = (scroller: HTMLDivElement, coast: boolean) => {
        const samples = velocitySamplesRef.current;
        const first = samples[0];
        const last = samples[samples.length - 1];
        velocitySamplesRef.current = [];

        const elapsed = first && last ? last.time - first.time : 0;
        let velocity = coast && elapsed > 0 ? -(last.x - first.x) / elapsed : 0;
        velocity = Math.max(-MOMENTUM_MAX_VELOCITY, Math.min(MOMENTUM_MAX_VELOCITY, velocity));

        if (!coast || Math.abs(velocity) < MOMENTUM_MIN_VELOCITY) {
            scroller.style.scrollBehavior = '';
            return;
        }

        scroller.style.scrollBehavior = 'auto';
        let lastFrame = performance.now();

        const tick = (now: number) => {
            const frameElapsed = now - lastFrame;
            lastFrame = now;
            scroller.scrollLeft += velocity * frameElapsed;
            velocity *= Math.exp(-frameElapsed / MOMENTUM_DECAY_MS);

            const maxScroll = scroller.scrollWidth - scroller.clientWidth;
            const atEdge = scroller.scrollLeft <= 0 || scroller.scrollLeft >= maxScroll - 1;
            if (atEdge || Math.abs(velocity) < 0.02) {
                momentumRef.current = null;
                scroller.style.scrollBehavior = '';
                return;
            }

            momentumRef.current = requestAnimationFrame(tick);
        };

        momentumRef.current = requestAnimationFrame(tick);
    };

    const onDragPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        if (event.pointerType !== 'mouse' || event.button !== 0) return;

        const wasCoasting = momentumRef.current != null;
        stopMomentum();
        velocitySamplesRef.current = [{ x: event.clientX, time: event.timeStamp }];
        dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startScrollLeft: event.currentTarget.scrollLeft,
            moved: wasCoasting,
        };
    };

    const onDragPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        if (dragRef.current.pointerId !== event.pointerId) return;

        const scroller = event.currentTarget;
        const delta = event.clientX - dragRef.current.startX;
        recordVelocitySample(event.clientX, event.timeStamp);
        if (!dragRef.current.moved) {
            if (Math.abs(delta) <= DRAG_START_DISTANCE) return;
            dragRef.current.moved = true;
            scroller.style.scrollBehavior = 'auto';
            scroller.setPointerCapture(event.pointerId);
        }

        scroller.scrollLeft = dragRef.current.startScrollLeft - delta;
    };

    const onDragPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
        if (dragRef.current.pointerId !== event.pointerId) return;

        const scroller = event.currentTarget;
        if (scroller.hasPointerCapture(event.pointerId)) {
            scroller.releasePointerCapture(event.pointerId);
        }
        dragRef.current.pointerId = -1;
        releaseScroll(scroller, dragRef.current.moved && event.type !== 'pointercancel');
    };

    const onDragClickCapture = (event: MouseEvent<HTMLDivElement>) => {
        if (!dragRef.current.moved) return;

        dragRef.current.moved = false;
        event.preventDefault();
        event.stopPropagation();
    };

    return {
        scrollerRef,
        canScrollLeft,
        canScrollRight,
        scrollByPage,
        onDragPointerDown,
        onDragPointerMove,
        onDragPointerEnd,
        onDragClickCapture,
    };
};

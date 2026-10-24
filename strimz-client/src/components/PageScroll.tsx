import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const scrollLocked = () => document.body.style.position === 'fixed';

const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

const PageScroll = () => {
    const { pathname } = useLocation();
    const positions = useRef<Record<string, number>>({});

    useLayoutEffect(() => {
        const key = pathname;
        let wanted = positions.current[key] ?? 0;
        let userScrolled = false;

        const apply = () => {
            if (userScrolled || scrollLocked()) return;
            window.scrollTo(0, Math.min(wanted, maxScroll()));
        };

        apply();

        const onScroll = () => {
            if (scrollLocked()) return;
            const clamped = Math.min(wanted, maxScroll());
            if (Math.abs(window.scrollY - clamped) <= 2) return;
            userScrolled = true;
            wanted = window.scrollY;
            positions.current[key] = window.scrollY;
        };

        const onResize = () => {
            if (!userScrolled) apply();
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onResize);
        const observer = new ResizeObserver(onResize);
        observer.observe(document.documentElement);

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onResize);
            observer.disconnect();
            if (scrollLocked() || userScrolled) return;
            if (wanted > 0 && maxScroll() + 1 < wanted) return;
            positions.current[key] = window.scrollY;
        };
    }, [pathname]);

    return null;
};

export default PageScroll;

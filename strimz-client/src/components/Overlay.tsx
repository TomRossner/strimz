import { twMerge } from 'tailwind-merge';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectMenu } from '../store/modals/modals.selectors';
import { closeModal } from '../store/modals/modals.slice';
import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';

interface Props {
    active: boolean;
    className?: string;
    onClick?: () => void;
}

const Overlay = ({active, className, onClick}: Props) => {
    const dispatch = useAppDispatch();
    const isMenuOpen = useAppSelector(selectMenu);

    const handleClick = () => {
        if (isMenuOpen) {
            dispatch(closeModal('menu'));
        }

        if (onClick) onClick();
    }

  return (
    <AnimatePresence>
        {active && (
            <motion.div
                onClick={handleClick}
                className={twMerge(`
                    fixed
                    z-20
                    top-0
                    left-0
                    right-0
                    bottom-0
                    h-full
                    w-full
                    backdrop-blur-sm
                    transition-all
                    duration-200
                    ${className}
                `)}
            />
        )}
    </AnimatePresence>
  )
}

export default Overlay;
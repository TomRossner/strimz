import { AnimatePresence, motion } from 'framer-motion';
import React, { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface DialogProps {
    isOpen: boolean;
    children: ReactNode | ReactNode[];
    size: "large" | "medium" | "small";
    title?: string;
    className?: string;
}

const Dialog = ({isOpen, children, size, title, className}: DialogProps) => {
  return (
    <AnimatePresence>
        {isOpen && (
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, transition: { duration: 0.1 } }}
                exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.1 } }}
                className={twMerge(`
                    fixed
                    min-h-[100vh]
                    max-w-[900px]
                    w-full
                    md:min-h-[15vh]
                    md:h-fit
                    my-auto
                    top-0
                    md:border
                    border-gray-400
                    rounded-sm
                    bg-stone-950
                    z-20
                    left-0
                    right-0
                    mx-auto
                    md:top-0
                    md:bottom-0
                    shadow-md
                    overflow-y-auto
                    ${size === "large" && "md:w-[97%]"}
                    ${size === "medium" && "md:w-[65%]"}
                    ${size === "small" && "md:w-[40%]"}
                `)}
            >
                {title && <p className='text-2xl text-slate-100 font-bold px-2 py-1'>{title}</p>}

                <div id='dialogContent' className={twMerge(`w-full md:flex ${className}`)}>
                    {children}
                </div>
            </motion.div>
        )}
    </AnimatePresence>
  )
}

export default Dialog;
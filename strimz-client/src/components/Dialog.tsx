import { AnimatePresence, motion } from 'framer-motion';
import React, { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

interface DialogProps {
    isOpen: boolean;
    children: ReactNode | ReactNode[];
    size: "large" | "medium" | "small" | "fit";
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
                    w-full
                    min-h-fit
                    my-auto
                    top-0
                    rounded-sm
                    border
                    border-gray-400
                    bg-stone-900
                    z-20
                    left-0
                    right-0
                    mx-auto
                    md:top-0
                    md:bottom-0
                    shadow-md
                    overflow-y-auto
                    ${size === "large" && "lg:w-[97%] xl:h-[90vh] 2xl:h-[80vh] 2xl:max-w-[1200px] md:flex md:flex-col xl:rounded-sm md:max-w-[900px] lg:max-w-[950px] lg:h-[95vh] xl:max-w-[1080px] lg:max-h-[97vh] md:min-h-[15vh]"}
                    ${size === "medium" && "sm:w-[75%] lg:w-[55%] xl:w-[45%]"}
                    ${size === "small" && "md:w-[40%]"}
                    ${size === "fit" && "md:w-fit"}
                    ${className}
                `)}
            >
                {title && <p className='text-2xl text-slate-100 font-bold px-2 py-1'>{title}</p>}

                <div id='dialogContent' className={twMerge(`w-full md:flex flex-1 min-h-0`, size === "large" && "md:min-h-0", className)}>
                    {children}
                </div>
            </motion.div>
        )}
    </AnimatePresence>
  )
}

export default Dialog;
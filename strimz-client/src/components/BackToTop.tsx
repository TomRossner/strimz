import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';
import { BiArrowToTop } from 'react-icons/bi';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface BackToTopProps {
    isVisible: boolean;
}

const scrollToTop = () => {
    window.scrollTo({top: 0, behavior: 'smooth'});
}

const BackToTop = ({isVisible}: BackToTopProps) => {
  return (
    <AnimatePresence>
        {isVisible && (
            <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                    <motion.button
                        type='button'
                        onClick={scrollToTop}
                        initial={{top: 0, opacity: 0}}
                        animate={{top: '128px', opacity: 1, transition: {duration: 0.12}}}
                        exit={{top: 0, opacity: 0, transition: {duration: 0.15}}}
                        className='cursor-pointer w-12 flex items-center justify-center h-12 fixed text-2xl text-center z-10 left-0 right-0 mx-auto rounded-full shadow-lg shadow-black bg-stone-200 text-stone-800 hover:text-black hover:bg-stone-50 p-2'
                    >
                        <BiArrowToTop />
                    </motion.button>
                </TooltipTrigger>
                <TooltipContent>Back to top</TooltipContent>
            </Tooltip>
        )}
    </AnimatePresence>
  )
}

export default BackToTop;
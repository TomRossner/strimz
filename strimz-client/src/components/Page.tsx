import { AnimatePresence, motion } from 'framer-motion';
import React, { ReactNode } from 'react';

interface PageProps {
    children: ReactNode;
}

const Page = ({children}: PageProps) => {
  return (
    <AnimatePresence>
        <motion.main
            // initial={{scale: 0.9, opacity: 0}}
            // animate={{scale: 1, opacity: 1}}
            // exit={{scale: 0.8, opacity: 0, transition: {duration: 0.1}}}
            className='w-full grow mx-0 my-auto flex'
        >
            {children}
        </motion.main>
    </AnimatePresence>
  )
}

export default Page;
import { AnimatePresence, motion } from 'framer-motion';
import React, { ReactNode } from 'react';

interface PageProps {
    children: ReactNode;
}

const Page = ({children}: PageProps) => {
  return (
    <AnimatePresence>
        <motion.main
            initial={{scale: 0.9, opacity: 0}}
            animate={{scale: 1, opacity: 1}}
            exit={{scale: 0.8, opacity: 0, transition: {duration: 0.1}}}
            className='w-full h-[100vh] mx-auto my-auto fixed top-0 left-0 right-0 bottom-0'
        >
            {children}
        </motion.main>
    </AnimatePresence>
  )
}

export default Page;
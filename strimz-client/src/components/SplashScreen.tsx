import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';
import LoadingIcon from './LoadingIcon';
import Logo from './Logo';

const SplashScreen = () => {
  return (
    <AnimatePresence>
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, transition: { duration: 0.1 } }}
            exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.1 } }}
            className='w-full min-h-[90vh] flex items-center justify-center flex-col gap-5'
        >
            <Logo className={'text-[150px]'} />

            <motion.div className='flex gap-2 items-center w-full justify-center'>
                <LoadingIcon size={22} />
                <p className='text-white font-light text-center'>Loading pure greatness...</p>
            </motion.div>
        </motion.div>
    </AnimatePresence>
  )
}

export default SplashScreen;
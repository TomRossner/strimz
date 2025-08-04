import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';
import CloseButton from './CloseButton';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { closeModal, openModal } from '../store/modals/modals.slice';
import { selectMenu } from '../store/modals/modals.selectors';
import { BsMagnetFill, BsStarFill } from 'react-icons/bs';
import { MdWatchLater } from 'react-icons/md';
import { IoSettingsSharp } from 'react-icons/io5';
import Logo from './Logo';
import Footer from './Footer';
import { Link } from 'react-router-dom';
import { GoHomeFill } from 'react-icons/go';
import Button from './Button';


const Menu = () => {
    const dispatch = useAppDispatch();
    const handleClose = () => dispatch(closeModal('menu'));
    
    const menuItems = [
        // {
        //     text: "Downloads",
        //     icon: <BsDownload />
        // },
        {
            text: "Home",
            icon: <GoHomeFill />
        },
        {
            text: "Favorites",
            icon: <BsStarFill />
        },
        {
            text: "Watch list",
            icon: <MdWatchLater />
        },
        {
            text: "Settings",
            icon: <IoSettingsSharp />
        },
        // {
        //     text: "Report a bug",
        //     icon: <MdBugReport />
        // },
    ]
    
    const isMenuOpen = useAppSelector(selectMenu);

    const features = [
        {
            text: "Play from magnet link",
            icon: <BsMagnetFill />,
        }
    ]

    const setLink = (text: string): string => {
        switch (text.toLowerCase()) {
            case 'home':
                return '';
            case 'report a bug':
                return 'reports';
            case 'watch list':
                return 'watch-list';
            
                default:
                return text.toLowerCase();
        }
    }

  return (
    <AnimatePresence>
        {isMenuOpen && (
            <motion.ul
                initial={{left: '-100%'}}
                animate={{left: 0, transition: {duration: 0.2}}}
                exit={{left: '-100%', transition: {duration: 0.4}}}
                className='w-56 h-[100vh] fixed top-0 flex flex-col gap-1 bg-stone-950 z-50'
            >
                <div className='w-full relative flex gap-1 h-fit py-1 items-center justify-between mb-4'>
                    <Link to={"/"} onClick={() => dispatch(closeModal('menu'))}><Logo className='text-3xl' /></Link>
                    <CloseButton onClose={handleClose} className='z-40 md:block w-fit text-xl p-1 relative mr-1' />
                </div>

                {menuItems.map(item => (
                    <Link to={setLink(item.text)} onClick={() => dispatch(closeModal('menu'))} key={item.text} className='w-full text-lg flex items-center gap-2 cursor-pointer hover:bg-stone-800 transition-all text-white px-2 py-1 text-start'>
                        {item?.icon}
                        {item?.text}
                    </Link>
                ))}

                <hr className='my-5 w-[90%] mx-auto' />

                {features.map(f => (
                    <Button
                        key={f.text}
                        onClick={() => {
                            dispatch(openModal('playFromMagnet'))
                            handleClose();
                        }}
                        className='bg-transparent gap-2 w-full justify-start text-blue-500 hover:text-blue-400'
                    >
                        {f.icon}
                        {f.text}
                    </Button>
                ))}
                <div className='grow' />

                <Footer />
            </motion.ul>
        )}
    </AnimatePresence>
  )
}

export default Menu;
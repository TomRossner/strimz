import { useEffect, useRef, useState } from 'react';
import Button from '../Button';
import { useAppDispatch } from '@/store/hooks';
import { closeModal } from '@/store/modals/modals.slice';
import { IoWarningOutline } from 'react-icons/io5';
import { BiChevronDown } from 'react-icons/bi';
import { BsPlayFill } from 'react-icons/bs';
import { MdOutlineFileDownload } from 'react-icons/md';

interface PlayButtonProps {
    isDisabled: boolean;
    onPlay: () => Promise<void>;
    onDownload: () => Promise<void>;
    diskSpaceInfo?: {
        hasEnoughSpace: boolean | null;
        fileSizeInBytes: number;
        freeBytes: number;
    };
}

const PlayButton = ({isDisabled, onPlay, onDownload, diskSpaceInfo}: PlayButtonProps) => {
  const dispatch = useAppDispatch();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notEnoughSpace = diskSpaceInfo?.hasEnoughSpace === false;
  const disabled = isDisabled || busy;

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const run = async (action: () => Promise<void>, closeDialog: boolean) => {
    if (disabled) return;
    setMenuOpen(false);
    setBusy(true);
    try {
      await action();
      if (closeDialog) dispatch(closeModal('movie'));
    } catch (error) {
      console.error(error);
    } finally {
      setBusy(false);
    }
  };
  
  if (notEnoughSpace) {
    return (
      <Button
        disabled={disabled}
        onClick={() => run(onPlay, true)}
        className='w-full py-2 px-3 text-start font-semibold bg-red-200 text-red-600 hover:bg-red-300 disabled:opacity-80'
      >
        <span className="text-sm text-red-400 flex gap-4 items-center">
          <IoWarningOutline className='text-2xl' />
          Not enough disk space!
        </span>
      </Button>
    );
  }

  return (
    <div ref={menuRef} className='flex w-full flex-col gap-2'>
      {menuOpen && (
        <Button
          disabled={disabled}
          onClick={() => run(onDownload, false)}
          className='w-full gap-1.5 bg-stone-800 py-2 font-semibold hover:bg-stone-700'
        >
          <MdOutlineFileDownload className='text-lg' />
          Download only
        </Button>
      )}
      <div className='flex w-full'>
        <Button
          disabled={disabled}
          onClick={() => run(onPlay, true)}
          className='min-w-0 flex-1 gap-1.5 rounded-r-none bg-blue-500 py-2 px-3 font-semibold text-white hover:bg-blue-400 hover:text-white disabled:opacity-80 disabled:text-slate-200'
        >
          <BsPlayFill className='text-lg' />
          Play
        </Button>
        <Button
          disabled={disabled}
          aria-expanded={menuOpen}
          aria-label='More actions'
          onClick={() => setMenuOpen((open) => !open)}
          className='rounded-l-none border-l border-blue-700 bg-blue-500 px-2 text-white hover:bg-blue-400 hover:text-white disabled:opacity-80'
        >
          <BiChevronDown className={`text-2xl transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </Button>
      </div>
    </div>
  )
}

export default PlayButton;
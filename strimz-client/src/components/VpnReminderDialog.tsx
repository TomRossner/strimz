import React from 'react';
import Dialog from './Dialog';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { closeModal } from '@/store/modals/modals.slice';
import { selectVpnModal } from '@/store/modals/modals.selectors';
import Button from './Button';
import { BsInfoCircle } from 'react-icons/bs';
import { twMerge } from 'tailwind-merge';

interface VpnReminderDialogProps {
    isActive: boolean;    
}

const VpnReminderDialog = ({isActive}: VpnReminderDialogProps) => {
    const isOpen = useAppSelector(selectVpnModal);
    const dispatch = useAppDispatch();

  return (
    <Dialog
        isOpen={isOpen}
        size='medium'
        title='⚠ Turn on your VPN !'
        className='flex-col p-3 gap-3'
    >
        <p className='text-slate-400'>Please make sure your VPN is active before continuing.</p>

        <div className='italic text-stone-500 flex gap-2 items-start'>
            <BsInfoCircle className='text-2xl' />
            <p className='text-sm text-wrap'>A VPN (Virtual Private Network) encrypts your internet connection, hides your IP address, and prevents your Internet Service Provider (ISP) from tracking your online activity—keeping your data private and secure.</p>
        </div>

        <Button
            disabled={!isActive}
            onClick={() => dispatch(closeModal('vpn'))}
            className={twMerge(`self-end ${isActive ? 'bg-green-600 hover:bg-green-500' : ''}`)}
        >
            <span>{isActive ? 'Continue' : 'Turn on your VPN to continue'}</span>
        </Button>
    </Dialog>
  )
}

export default VpnReminderDialog;
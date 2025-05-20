import React, { useCallback, useEffect } from 'react';
import Dialog from './Dialog';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { closeModal } from '@/store/modals/modals.slice';
import { selectVpnModal } from '@/store/modals/modals.selectors';
import Button from './Button';
import { BsInfoCircle } from 'react-icons/bs';
import { twMerge } from 'tailwind-merge';
import { selectIsVpnActive } from '@/store/vpn/vpn.selectors';
import { setIsActive } from '@/store/vpn/vpn.slice';

interface VpnReminderDialogProps {
    isActive: boolean;    
}

const CHECK_VPN_INTERVAL_DELAY: number = 3000;

const VpnReminderDialog = ({ isActive }: VpnReminderDialogProps) => {
    const isOpen = useAppSelector(selectVpnModal);
    const dispatch = useAppDispatch();
    const isVpnActive = useAppSelector(selectIsVpnActive);

    const checkVpn = useCallback(async () => {
        const isActive = await window.electronAPI.checkVpnConnection();
        dispatch(setIsActive(isActive));
    }, [dispatch]);

    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            dispatch(setIsActive(true));
            return;
        }

        let intervalId: NodeJS.Timeout | null = null;

        if (!isVpnActive) {
            checkVpn();

            intervalId = setInterval(() => {
                checkVpn();
            }, CHECK_VPN_INTERVAL_DELAY);
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        }
    }, [isVpnActive, checkVpn, dispatch]);

    return (
        <Dialog
            isOpen={isOpen}
            size='medium'
            title='⚠ Turn on your VPN !'
            className='flex-col p-3 gap-3 z-[999]'
        >
            <p className='text-slate-400'>Please make sure your VPN is active before continuing.</p>

            <p className='italic text-stone-500 flex gap-2 items-start'>
                <BsInfoCircle className='text-2xl' />
                <span className='text-sm text-wrap'>
                    A VPN (Virtual Private Network) encrypts your internet connection, hides your IP address,
                    and prevents your Internet Service Provider (ISP) from tracking your online activity—
                    keeping your data private and secure.
                </span>
            </p>

            <Button
                disabled={!isActive}
                onClick={() => dispatch(closeModal('vpn'))}
                className={twMerge(`self-end ${isActive ? 'bg-green-600 hover:bg-green-500' : ''}`)}
            >
                <span>{isActive ? 'Continue' : 'Turn on your VPN to continue'}</span>
            </Button>
        </Dialog>
    );
};

export default VpnReminderDialog;
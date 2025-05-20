import { useAppSelector } from '@/store/hooks';
import { selectSocket } from '@/store/socket/socket.selectors';
import { formatBytesPerSecond } from '@/utils/bytes';
import { DownloadProgressData } from '@/utils/types';
import React, { useCallback, useEffect, useState } from 'react';

interface DownloadSpeedProps {
    hash: string;
}

const DownloadSpeed = ({hash}: DownloadSpeedProps) => {
    const socket = useAppSelector(selectSocket);
    const [speed, setSpeed] = useState<number>(0);

    const handleProgress = useCallback((data: DownloadProgressData) => {
        if (data.hash.toLowerCase() === hash.toLowerCase()) {
            setSpeed(data.speed);
        }
    }, [hash]);

    useEffect(() => {
        if (!socket?.id) return;

        socket.on('downloadProgress', handleProgress);

        return () => {
            socket.off('downloadProgress', handleProgress);
        }
    }, [socket, handleProgress]);

  return (
    <span className='text-white text-xl'>{formatBytesPerSecond(speed)}</span>
  )
}

export default DownloadSpeed;
import { formatBytesPerSecond } from '@/utils/bytes';
import throttle from 'lodash.throttle';
import React, { useEffect, useRef, useState } from 'react';

interface DownloadSpeedProps {
    speedAsNum: number;
}

const DownloadSpeed = ({speedAsNum}: DownloadSpeedProps) => {
    const [speed, setSpeed] = useState<number>(0);

    const throttledSetSpeed = useRef(
        throttle((speedAsNum: number) => {
            setSpeed(speedAsNum);
        }, 500)
    ).current;

    useEffect(() => {
        if (!speedAsNum) return;

        throttledSetSpeed(speedAsNum);
    }, [speedAsNum, throttledSetSpeed]);

  return (
    <span className='text-white text-xl'>{formatBytesPerSecond(speed)}</span>
  )
}

export default DownloadSpeed;
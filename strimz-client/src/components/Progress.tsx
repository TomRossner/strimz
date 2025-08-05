import { useAppSelector } from "@/store/hooks";
import { selectSocket } from "@/store/socket/socket.selectors";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import DownloadSpeed from "./DownloadSpeed";
import { DownloadProgressData } from "@/utils/types";
import throttle from "lodash.throttle";

interface ProgressProps {
  hash: string;
  progressOnly?: boolean;
  className?: string;
  withDownloadSpeed?: boolean;
}

type Progress = {
  percentage: number;
  downloadSpeed: number;
}

const defaultProgress: Progress = {
  percentage: 0.00,
  downloadSpeed: 0,
}

const Progress = ({hash, progressOnly = false, className, withDownloadSpeed = false}: ProgressProps) => {
  const [progress, setProgress] = useState<Progress>(defaultProgress);
  const socket = useAppSelector(selectSocket);

  const throttledSetProgress = useRef(
    throttle((data: DownloadProgressData) => {
      setProgress({
        ...progress,
        percentage: Number((data.progress * 100).toFixed(2)),
        downloadSpeed: data.speed,
      });
    }, 500)
  ).current;

  useEffect(() => {
    if (!socket?.id) return;

    const handleProgress = (data: DownloadProgressData) => {
      if (data.hash.toLowerCase() === hash.toLowerCase()) {
        throttledSetProgress(data);
      }
    }

    socket.on('downloadProgress', handleProgress);

    return () => {
      socket.off('downloadProgress', handleProgress);
    }
  }, [hash, socket, throttledSetProgress]);

  return progressOnly
    ? (<p className={twMerge(`absolute text-white text-sm ${className}`)}>{progress.percentage}%</p>)
    : (<p className={twMerge(`text-white text-xl mt-6 z-50 ${className} flex items-center gap-2`)}>
        {progress.percentage
          ? `Downloading... ${progress.percentage}%`
          : 'Getting ready...'
        }

        {!!progress.downloadSpeed && !!progress.percentage && withDownloadSpeed && (
          <DownloadSpeed speedAsNum={progress.downloadSpeed} />
        )}
      </p>)
}

export default Progress;
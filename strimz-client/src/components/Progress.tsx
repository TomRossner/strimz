import { useAppSelector } from "@/store/hooks";
import { selectSocket } from "@/store/socket/socket.selectors";
import { useCallback, useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import DownloadSpeed from "./DownloadSpeed";

interface ProgressProps {
  hash: string;
  progressOnly?: boolean;
  className?: string;
  withDownloadSpeed?: boolean;
}

type ProgressData = {
  progress: number;
  hash: string;
}

const Progress = ({hash, progressOnly = false, className, withDownloadSpeed = false}: ProgressProps) => {
  const [progress, setProgress] = useState<number>(0.00);
  const socket = useAppSelector(selectSocket);

  const handleProgress = useCallback((data: ProgressData) => {
    if (data.hash.toLowerCase() === hash.toLowerCase()) {
      setProgress(Number((data.progress * 100).toFixed(2)));
    }
  }, [hash]);

  useEffect(() => {
    if (!socket?.id) return;

    socket.on('downloadProgress', handleProgress);

    return () => {
      socket.off('downloadProgress', handleProgress);
    }
  }, [socket, handleProgress]);

  return progressOnly
    ? (<p className={twMerge(`absolute text-white text-sm ${className}`)}>{progress}%</p>)
    : (<p className={twMerge(`text-white text-xl mt-6 z-50 ${className} flex items-center gap-2`)}>
        {progress
          ? `Downloading... ${progress}%`
          : 'Getting ready...'
        }

        {!!progress && withDownloadSpeed && (
          <DownloadSpeed hash={hash} />
        )}
      </p>)
}

export default Progress;
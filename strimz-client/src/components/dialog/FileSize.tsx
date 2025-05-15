import React, { useEffect, useState } from 'react';
import LoadingIcon from '../LoadingIcon';
import { BsInfoCircle } from 'react-icons/bs';
import { Torrent } from '@/utils/types';
import { PiDownload } from "react-icons/pi";
import { formatBytes, parseSize } from '@/utils/bytes';

interface FileSizeProps {
  size?: string;
  selectedTorrent: Torrent | null;
}

interface DiskSpaceInfo {
  diskPath: string;
  free: number;
  size: number;
}

const FileSize = ({ size = 'N/A', selectedTorrent }: FileSizeProps) => {
  const [diskSpace, setDiskSpace] = useState<DiskSpaceInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fileSizeInBytes = parseSize(size);
  const hasEnoughSpace = diskSpace ? diskSpace.free >= fileSizeInBytes : null;

  useEffect(() => {
    if (size === 'N/A') return;

    const getDiskSpace = async () => {
      setIsLoading(true);

      try {
        const diskInfo = await window.electronAPI.checkDiskSpace();
        setDiskSpace(diskInfo as DiskSpaceInfo);
      } catch (err) {
        console.error('Failed to get disk space', err);
      } finally {
        setIsLoading(false);
      }
    }

    getDiskSpace();
  }, [size]);

  return (
    <div className="w-full text-white min-w-28 flex items-center gap-1 justify-between mb-2">
      <p className="flex items-center justify-end gap-1">
        File size:
        <span className="font-light text-blue-400">{size}</span>
      </p>

      <p className="text-xs text-gray-400 text-right flex gap-1 items-center">
        <PiDownload className='text-lg' />

        {!isLoading ? (
          <span className="text-xs text-gray-400 flex gap-1 items-center">
            {diskSpace ? (
              <span className={`flex items gap-1 ml-1 font-semibold ${hasEnoughSpace ? 'text-gray-300' : 'text-red-500'}`}>
                {`${formatBytes(fileSizeInBytes)} required / `}
                <span title='Shows the available space on the drive where the file will be saved.' className='cursor-pointer underline text-blue-500 flex items-center gap-1'>
                  {formatBytes(diskSpace.free)} available
                  <BsInfoCircle title='Shows the available space on the drive where the file will be saved.' />
                </span>
              </span>
            ) : (
              selectedTorrent ? 'Could not retrieve disk information' : 'No file selected - select a file to verify disk space'
            )}
          </span>
        ) : (
          <span className="text-xs text-gray-400 text-right flex items-center gap-1">
            <LoadingIcon size={13} />
            Loading disk information...
          </span>
        )}
      </p>
    </div>
  );
}

export default FileSize;
import React, { useEffect, useState } from 'react';
import LoadingIcon from '../LoadingIcon';
import { BsInfoCircle } from 'react-icons/bs';
import { DiskSpaceInfo, Torrent } from '@/utils/types';
import { PiDownload } from "react-icons/pi";
import { formatBytes, FREE_GB_REQUIRED, FREE_PERCENTAGE_REQUIRED, ONE_GB, parseSize } from '@/utils/bytes';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { IoWarningOutline } from 'react-icons/io5';
import { MdOutlineInsertDriveFile } from 'react-icons/md';

interface FileSizeProps {
  size?: string;
  selectedTorrent: Torrent | null;
}

const FileSize = ({ size, selectedTorrent }: FileSizeProps) => {
  const [diskSpace, setDiskSpace] = useState<DiskSpaceInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fileSizeInBytes = size ? parseSize(size) : 0;
  const freePercent = diskSpace ? (diskSpace.free / diskSpace.size) * 100 : 0;
  const freeSpaceGB = diskSpace ? diskSpace.free / ONE_GB : 0;

  const shouldShowLowSpaceWarning = diskSpace
    ? ((freePercent < FREE_PERCENTAGE_REQUIRED) && (freeSpaceGB < FREE_GB_REQUIRED))
    : false;

  useEffect(() => {
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
  }, []);

  return (
    <div className='flex flex-col w-full mb-2'>
      <div className="w-full text-white min-w-28 flex flex-col gap-2 justify-between">
        <p className="flex items-center gap-1">
          <MdOutlineInsertDriveFile className='text-xl' />
          File size:
          <span className={(`${size ? 'font-medium text-blue-400' : 'font-light text-stone-500 italic'}`)}>{size || 'N/A - No file selected'}</span>
        </p>

        <p className="text-xs text-gray-400 text-right flex gap-1 items-center">
          <PiDownload className='text-lg' />

          {!isLoading ? (
            <span className="text-xs text-gray-400 flex gap-1 items-center">
              {diskSpace && (
                <span className={`flex items gap-1 ml-1 font-semibold text-gray-300`}>
                  {selectedTorrent ? `${formatBytes(fileSizeInBytes)} required / `: 'Select a torrent to verify disk space -'}
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger>
                      <span className='text-blue-500 flex items-center gap-1'>
                        {formatBytes(diskSpace.free)} free
                        <BsInfoCircle />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Shows the available space on the drive where the file will be saved.</TooltipContent>
                  </Tooltip>
                </span>
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

      {shouldShowLowSpaceWarning && (
          <p className="text-xs bg-amber-200 text-amber-700 flex items-center gap-1 w-full rounded-xs mt-0.5 px-1 py-0.5">
            <IoWarningOutline className='text-lg' />
            Low disk space: Available space may be insufficient for this download.
          </p>
      )}
    </div>
  )
}

export default FileSize;
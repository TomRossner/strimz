import React, { useEffect, useState } from 'react';
import LoadingIcon from '../LoadingIcon';
import { BsInfoCircle } from 'react-icons/bs';
import { DiskSpaceInfo, Torrent } from '@/utils/types';
import { PiDownload } from "react-icons/pi";
import { formatBytes, FREE_GB_REQUIRED, FREE_PERCENTAGE_REQUIRED, ONE_GB, parseSize } from '@/utils/bytes';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { IoWarningOutline } from 'react-icons/io5';
import { MdOutlineInsertDriveFile, MdFileDownloadDone } from 'react-icons/md';
import Button from '../Button';

interface FileSizeProps {
  size?: string;
  selectedTorrent: Torrent | null;
  downloadedQuality?: string;
  onWatchDownloaded?: () => void;
}

const FileSize = ({ size, selectedTorrent, downloadedQuality, onWatchDownloaded }: FileSizeProps) => {
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
          {isLoading ? (
            <LoadingIcon size={18} />
          ) : downloadedQuality ? (
            <MdFileDownloadDone className='text-lg text-green-400' />
          ) : (
            <PiDownload className='text-lg' />
          )}

          {!isLoading ? (
            <span className="text-xs text-gray-400 flex gap-1 items-center">
              {diskSpace && (
                <span className={`flex items gap-1 ml-1 font-semibold text-gray-300`}>
                  {downloadedQuality ? (
                    <span className='flex items-center gap-2'>
                      <span className='text-green-400'>
                        You have downloaded this movie in {downloadedQuality}.
                      </span>
                      {onWatchDownloaded && (
                        <Button
                          onClick={onWatchDownloaded}
                          className='text-blue-500 hover:text-blue-400 bg-transparent hover:bg-transparent border-0 p-0 h-auto'
                        >
                          Watch now
                        </Button>
                      )}
                    </span>
                  ) : selectedTorrent ? (
                    <>
                      {formatBytes(fileSizeInBytes)} required / 
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger>
                          <span className='text-blue-500 flex items-center gap-1'>
                            {formatBytes(diskSpace.free)} free
                            <BsInfoCircle />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>Shows the available space on the drive where the file will be saved.</TooltipContent>
                      </Tooltip>
                    </>
                  ) : (
                    'Select a torrent to verify disk space -'
                  )}
                </span>
              )}
            </span>
          ) : (
            <span className="text-xs text-gray-400 text-right">
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
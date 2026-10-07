import React, { useEffect, useState } from 'react';
import { DiskSpaceInfo, Torrent } from '@/utils/types';
import { FREE_GB_REQUIRED, FREE_PERCENTAGE_REQUIRED, ONE_GB, parseSize } from '@/utils/bytes';
import { IoWarningOutline } from 'react-icons/io5';

interface FileSizeProps {
  size?: string;
  selectedTorrent: Torrent | null;
}

const FileSize = ({ size, selectedTorrent }: FileSizeProps) => {
  const [diskSpace, setDiskSpace] = useState<DiskSpaceInfo | null>(null);

  const fileSizeInBytes = size ? parseSize(size) : 0;
  const freePercent = diskSpace ? (diskSpace.free / diskSpace.size) * 100 : 0;
  const freeSpaceGB = diskSpace ? diskSpace.free / ONE_GB : 0;
  const notEnoughForFile = Boolean(diskSpace && selectedTorrent && diskSpace.free < fileSizeInBytes);

  const shouldShowLowSpaceWarning = diskSpace
    ? ((freePercent < FREE_PERCENTAGE_REQUIRED) && (freeSpaceGB < FREE_GB_REQUIRED))
    : false;

  useEffect(() => {
    const getDiskSpace = async () => {
      try {
        const diskInfo = await window.electronAPI.checkDiskSpace();
        setDiskSpace(diskInfo as DiskSpaceInfo);
      } catch (err) {
        console.error('Failed to get disk space', err);
      }
    }

    getDiskSpace();
  }, []);

  if (!shouldShowLowSpaceWarning && !notEnoughForFile) {
    return null;
  }

  return (
    <div className='flex flex-col w-full gap-1 mb-2'>
      {(shouldShowLowSpaceWarning || notEnoughForFile) && (
          <p className="text-xs bg-amber-200 text-amber-700 flex items-center gap-1 w-full rounded-xs px-1 py-0.5">
            <IoWarningOutline className='text-lg shrink-0' />
            {notEnoughForFile
              ? 'This download needs more free space than the drive has. Free some space before playing.'
              : 'Free space on this drive is low. Clear some room before it blocks a download.'}
          </p>
      )}
    </div>
  )
}

export default FileSize;
import React from 'react';

interface FileSizeProps {
  size: string | undefined;
}

const FileSize = ({size = 'N/A'}: FileSizeProps) => {
  return (
    <p className='w-full text-white min-w-28 flex items-center justify-end gap-1'>
      File size:
      <span className='font-light text-blue-400'>
        {" "}
        {size}
      </span>
    </p>
  )
}

export default FileSize;
export const formatBytes = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
}

export const parseSize = (sizeStr: string): number => {
  if (!sizeStr || sizeStr === 'N/A') return 0;

  const [value, unit] = sizeStr.trim().split(' ');
  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const index = units.findIndex(u => u.toLowerCase() === unit.toLowerCase());
  
  return parseFloat(value) * Math.pow(1024, index);
}

export const formatBytesPerSecond = (bytesPerSecond: number) => {
  if (bytesPerSecond === 0) return '0 B/s';

  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));

  const formatted = parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(0));
  return `${formatted} ${sizes[i]}`;
}

export const ONE_GB = 1024 * 1024 * 1024;
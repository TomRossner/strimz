import path, {dirname} from 'path';
import { fileURLToPath } from 'url';
import { VideoExtensions } from './constants';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const getContentType = (fileName: string): string => {
    const fileExtension = fileName.split(VideoExtensions.MP4 || VideoExtensions.MKV).pop()?.toLowerCase();

    switch (fileExtension) {
        case VideoExtensions.MP4:
            return 'video/mp4';
        case VideoExtensions.MKV:
            return 'video/x-matroska';
            
        default:
            return 'application/octet/stream';
    }
}

export const getFilePath = (moviePath: string): string => {
    const movieFilePath: string = path.join(__dirname, '../downloads/', moviePath);
    return movieFilePath;
}
import fsPromises from 'fs/promises';
import path from 'path';

const deleteDirectory = async (dir: string) => {
    await fsPromises.rm(path.resolve(dir), { recursive: true, force: true });
}

export default deleteDirectory;
import checkDiskSpace from "check-disk-space";

export const checkDisk = async (path) => {
    if (typeof path !== 'string' || !path.length) return;

    return await checkDiskSpace(path);
}
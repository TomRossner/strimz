export const getFileExtension = (filePath: string): string => {
    if (!filePath.length) return '';

    const match = filePath.match(/\.([a-z0-9]+)$/i);
    return match![1].toLowerCase();
}
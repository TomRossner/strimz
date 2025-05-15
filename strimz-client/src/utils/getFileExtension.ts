export const getFileExtension = (filePath: string) => {
    if (!filePath.length) return '';

    const match = filePath.match(/\.([a-z0-9]+)$/i);
    return match ? match[1].toLowerCase() : undefined;
}
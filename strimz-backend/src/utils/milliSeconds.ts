export const msToMinutesAndSeconds = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds: string = ((ms % 60000) / 1000).toFixed(0);

    return minutes + ":" + (Number(seconds) < 10 ? '0' : '') + seconds;
}
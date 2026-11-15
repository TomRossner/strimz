import fs from 'fs';
import path from 'path';
import unzipper from 'unzipper';

export async function extractSrtFiles(
  zipPath: string,
  outputDir: string,
  baseName: string
): Promise<string> {
  const directory = await unzipper.Open.file(zipPath);

  for (const entry of directory.files) {
    if (!entry.path.toLowerCase().endsWith('.srt')) continue;

    const finalSrtPath = path.join(outputDir, `${baseName}.srt`);
    // Extract to a temp file and rename once complete: the final file's existence is used as
    // the download cache, so it must never be observed half-written.
    const tempSrtPath = `${finalSrtPath}.part`;

    await new Promise<void>((resolve, reject) => {
      const writeStream = fs.createWriteStream(tempSrtPath);

      entry.stream()
        .pipe(writeStream)
        .on('error', reject);

      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    fs.renameSync(tempSrtPath, finalSrtPath);

    if (!fs.existsSync(finalSrtPath)) {
      throw new Error('SRT extraction failed');
    }

    return finalSrtPath;
  }

  throw new Error('No .srt file found in zip');
}
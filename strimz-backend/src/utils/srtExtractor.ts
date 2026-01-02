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

    await new Promise<void>((resolve, reject) => {
      const writeStream = fs.createWriteStream(finalSrtPath);

      entry.stream()
        .pipe(writeStream)
        .on('error', reject);

      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    if (!fs.existsSync(finalSrtPath)) {
      throw new Error('SRT extraction failed');
    }

    return finalSrtPath;
  }

  throw new Error('No .srt file found in zip');
}
import puppeteer, { Browser, Page } from 'puppeteer';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { extractSrtFiles } from '../utils/srtExtractor.js';
import { iso3ToOS, normalizeLanguageCode } from '../utils/detectLanguage.js';

const OPEN_SUBTITLES_URL: string = 'https://opensubtitles.org/';

/* ----------------------------- Browser ----------------------------- */

const launchBrowser = async (): Promise<{ browser: Browser; page: Page }> => {
    const browser = await puppeteer.launch( {headless: true});
    const page = await browser.newPage();
    return { browser, page };
}

/* ----------------------------- Navigation --------------------------- */

const navigateToPage = async (page: Page, url: string) => {
    await page.goto(url, { waitUntil: 'networkidle0' });
}

/* ----------------------------- Language ----------------------------- */

const selectLanguage = async (page: Page, language: string) => {
    try {
        await page.evaluate((lang: string) => {
            lang = lang.trim().toLowerCase();

            const button = document.querySelector<HTMLButtonElement>('button .ui-multiselect');
            button?.click();

            const languages = document.querySelector<HTMLUListElement>('.ui-multiselect-checkboxes');
            const inputs = languages?.querySelectorAll<HTMLInputElement>('li label input');

            if (!inputs?.length) return;

            Array.from(inputs).forEach(input => {
                const title = input.title?.trim().toLowerCase();
                const value = input.value?.trim().toLowerCase();
                if (input.type === 'checkbox' && (title === lang || value === lang)) {
                    input.click();
                }
            });
        }, language);
    } catch (e) {
        console.warn('Could not set language:', (e as Error).message);
    }
};

const extractLanguagesList = async (page: Page) => {
    return await page.evaluate(() => {
        const button = document.querySelector<HTMLButtonElement>('button .ui-multiselect');
        button?.click();

        const languages = document.querySelector<HTMLUListElement>('.ui-multiselect-checkboxes');
        const inputs = languages?.querySelectorAll<HTMLInputElement>('li label input[type="checkbox"]');
        
        if (!inputs || !inputs.length) return [];

        return Array.from(inputs).map(input => input.title.trim());
    });
};

const extractLanguagesFromPage = async (page: Page) => {
    const list = await extractLanguagesList(page);

    return await page.evaluate((list: string[]) => {
        const resultsTable = document.querySelector<HTMLTableElement>('table#search_results');
        if (!resultsTable) return [];

        const rows = resultsTable?.querySelectorAll<HTMLTableRowElement>('tr[onclick]');

        return Array.from(rows)
            .map(row => {
                const lang = row.querySelector<HTMLAnchorElement>('td:nth-child(2) a');
                if (lang &&
                    lang.title.length &&
                    list
                        .some(l => l.toLowerCase() === lang.title.trim().toLowerCase())
                ) {
                    const langId = lang?.getAttribute('href')?.split('sublanguageid-')[1];
                    return `${langId?.trim()}-${lang.title.trim()}`;
                }
            })
            .filter(Boolean) as string[];
    }, list);
};

const collectAvailableLanguages = async (page: Page, baseUrl: string) => {
    const allLanguages = new Set<string>();
    let offset = 0;
    const PAGE_SIZE = 40;

    while (true) {
        const url =
            offset === 0
                ? baseUrl
                : `${baseUrl}/offset-${offset}`;
        await page.goto(url, { waitUntil: 'networkidle0' });

        const langs = await extractLanguagesFromPage(page);

        if (langs.length === 0) {
            console.log('🛑 No subtitles found on this page.');
            break;
        }

        const before = allLanguages.size;
        langs.forEach(l => allLanguages.add(l));

        if (allLanguages.size === before) {
            console.log('🛑 No new languages found, stopping.');
            break;
        }

        offset += PAGE_SIZE;
    }

    return [...allLanguages].sort();
};

/* ----------------------------- Download ----------------------------- */

const setupDownload = async (page: Page, downloadPath: string) => {
    const initialFiles = fs.readdirSync(downloadPath);

    const client = await page.createCDPSession();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath,
    });

    let downloadedFile = '';
    client.on('Page.downloadWillBegin', e => {
        downloadedFile = e.suggestedFilename;
        console.log('Download started:', downloadedFile);
    });

    return { downloadPath, initialFiles, getDownloadedFile: () => downloadedFile };
};

const triggerSubsDownload = async (page: Page) => {
    return await page.evaluate(() => {
        const srtSpan = [...document.querySelectorAll('td span')]
            .find(s => s.textContent?.trim().toLowerCase() === 'srt');

        if (!srtSpan) throw new Error('SRT link not found');

        const link = srtSpan.previousSibling?.previousSibling as HTMLAnchorElement;
        link?.removeAttribute('onclick');
        link?.click();
    });
};

const waitForDownload = async (
    dir: string,
    initialFiles: string[],
    getDownloadedFile: () => string,
    timeout = 30000
) => {
    const start = Date.now();

    while (Date.now() - start < timeout) {
        const files = fs.readdirSync(dir).filter(f => !f.endsWith('.crdownload'));
        const newFiles = files.filter(f => !initialFiles.includes(f));

        if (newFiles.length) {
            const preferred = getDownloadedFile();
            return preferred && newFiles.includes(preferred)
                ? preferred
                : newFiles[0];
        }

        await new Promise(r => setTimeout(r, 500));
    }

    throw new Error('Download timed out');
};

async function waitForFile(
  filePath: string,
  timeout = 10_000,
  interval = 200
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (fs.existsSync(filePath)) return;
    await new Promise(res => setTimeout(res, interval));
  }

  throw new Error(`File did not appear: ${filePath}`);
};

const searchFieldId: string = '#search_text';

export const navigateAndDownload = async (imdbCode: string, title: string, year: string, language: string, dir: string) => {
    const downloadDirPath = path.resolve(path.join(dir));

    const canonicalISO3 = normalizeLanguageCode(language);
    const osLang = iso3ToOS[canonicalISO3] ?? canonicalISO3;
    const fileName = `${imdbCode}-${title.replace(/[^A-Za-z]/g, '.')}-${year}-[${osLang}].srt`;
    
    if (fs.existsSync(path.join(downloadDirPath, fileName))) {
        return path.join(downloadDirPath, fileName);
    }

    const { browser, page } = await launchBrowser();

    try {
        await navigateToPage(page, OPEN_SUBTITLES_URL);

        await selectLanguage(page, osLang);

        await page.waitForSelector(searchFieldId);

        const imdbUrl: string = `https://imdb.com/title/${imdbCode}`;

        await page.type(searchFieldId, imdbUrl, { delay: 50 });

        const hasResults = await page
            .waitForSelector('.ui-autocomplete li', { timeout: 5000 })
            .then(() => true)
            .catch(() => false);

        if (!hasResults) {
            title = normalizeTitle(title);

            const shouldAppendYear =
                year &&
                !/\b\d{4}\b/.test(title) &&
                !/\b[a-z]\d\b|\b\d[a-z]\b/i.test(title);

            const query = shouldAppendYear
                ? `${title} ${year}`
                : title;

            await page.click(searchFieldId, { clickCount: 3 });
            await page.keyboard.press('Backspace');
            await page.type(searchFieldId, query, { delay: 50 });

            const hasResults = await page
                .waitForSelector('.ui-autocomplete li', { timeout: 5000 })
                .then(() => true)
                .catch(() => false);

            if (!hasResults) throw new Error(`Failed to download. Could not find movie ${title} (${year}).`);
        }
    
        await page.evaluate((index: number) => {
            document.querySelectorAll<HTMLAnchorElement>('.ui-autocomplete li a')[index]?.click();
        }, 0);
    
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
        const download = await setupDownload(page, dir);
        await triggerSubsDownload(page);
    
        const file = await waitForDownload(
            download.downloadPath,
            download.initialFiles,
            download.getDownloadedFile
        );

        const baseName = `${imdbCode}-${title.replace(/[^A-Za-z]/g, '.')}-${year}-[${osLang}]`;
        const originalZipPath = path.join(download.downloadPath, file);

        await waitForFile(originalZipPath);

        const srtFile = await extractSrtFiles(
            originalZipPath,
            download.downloadPath,
            baseName
        );

        await browser.close();
        return srtFile;

    } catch (error) {
        throw error;
    }
};
export const navigateAndCheckAvailability = async (
  imdbCode: string,
  title: string,
  year: string,
  language: string
) => {
  const canonicalISO3 = normalizeLanguageCode(language);
  const osLang = iso3ToOS[canonicalISO3] ?? canonicalISO3;
  console.log('OpenSubs lang: ', osLang);

  const { browser, page } = await launchBrowser();

  try {
    await navigateToPage(page, OPEN_SUBTITLES_URL);
    await selectLanguage(page, osLang);
    await page.waitForSelector(searchFieldId);

    const imdbUrl = `https://imdb.com/title/${imdbCode}`;
    await page.type(searchFieldId, imdbUrl, { delay: 50 });

    let hasResults = await page
      .waitForSelector('.ui-autocomplete li', { timeout: 5000 })
      .then(() => true)
      .catch(() => false);

    if (!hasResults) {
      title = normalizeTitle(title);

      const shouldAppendYear =
        year &&
        !/\b\d{4}\b/.test(title) &&
        !/\b[a-z]\d\b|\b\d[a-z]\b/i.test(title);

      const query = shouldAppendYear ? `${title} ${year}` : title;

      await page.click(searchFieldId, { clickCount: 3 });
      await page.keyboard.press('Backspace');
      await page.type(searchFieldId, query, { delay: 50 });

      hasResults = await page
        .waitForSelector('.ui-autocomplete li', { timeout: 5000 })
        .then(() => true)
        .catch(() => false);

      if (!hasResults) {
        await browser.close();
        return false; // ✅ No results → return false
      }
    }

    await page.evaluate((index: number) => {
      document.querySelectorAll<HTMLAnchorElement>('.ui-autocomplete li a')[index]?.click();
    }, 0);

    try {
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 });
    } catch {
      // navigation may not happen → ignore
    }

    // Wait for the table to appear, but timeout safely
    await page.waitForSelector('td span', { timeout: 3000 }).catch(() => {});

    const isAvailable = await page.evaluate(() => {
      return [...document.querySelectorAll('td span')].some(
        (s) => s.textContent?.trim().toLowerCase() === 'srt'
      );
    });

    await browser.close();
    return isAvailable;
  } catch (error) {
    console.error('Subtitle check failed:', error);
    try {
      await browser.close();
    } catch {}
    return false; // ✅ Always resolve with false on error
  }
};


/* ----------------------------- Main -------------------------------- */
function normalizeTitle(title: string): string {
  return title
    // remove colons
    .replace(/:/g, ' ')
    // remove standalone numbers (e.g. " 2 ", "(2001)")
    .replace(/\b\d+\b/g, ' ')
    // collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

export const scrapeAvailableLanguages = async (imdbCode: string, title: string, year: string) => {
    const { browser, page } = await launchBrowser();
    
    try {
        await navigateToPage(page, OPEN_SUBTITLES_URL);

        await selectLanguage(page, 'ALL');

        await page.waitForSelector(searchFieldId);
        await page.click(searchFieldId);

        const imdbUrl: string = `https://imdb.com/title/${imdbCode}`;

        await page.type(searchFieldId, imdbUrl, { delay: 50 });

        const hasResults = await page
            .waitForSelector('.ui-autocomplete li', { timeout: 5000 })
            .then(() => true)
            .catch(() => false);

        if (!hasResults) {
            title = normalizeTitle(title);

            const shouldAppendYear =
                year &&
                !/\b\d{4}\b/.test(title) &&
                !/\b[a-z]\d\b|\b\d[a-z]\b/i.test(title);

            const query = shouldAppendYear
                ? `${title} ${year}`
                : title;

            await page.click(searchFieldId, { clickCount: 3 });
            await page.keyboard.press('Backspace');
            await page.type(searchFieldId, query, { delay: 50 });

            const hasResults = await page
                .waitForSelector('.ui-autocomplete li', { timeout: 5000 })
                .then(() => true)
                .catch(() => false);

            if (!hasResults) return [];
        }

        await page.evaluate((index: number) => {
            document.querySelectorAll<HTMLAnchorElement>('.ui-autocomplete li a')[index]?.click();
        }, 0);

        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        const baseUrl = page.url();
        const languages = await collectAvailableLanguages(page, baseUrl);

        return languages;
    } catch (error) {
        throw error;
    } finally {
        await browser.close();
    }
}
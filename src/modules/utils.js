import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { DEFAULT_DOWNLOADS_PATH } from '../constants.js';
import store from '../store.js';
import log from 'electron-log';
import iconv from 'iconv-lite';
import chardet from 'chardet';

export function ensureDefaultDownloadPath() {
  if (!fs.existsSync(DEFAULT_DOWNLOADS_PATH)) {
    fs.mkdirSync(DEFAULT_DOWNLOADS_PATH, { recursive: true });
  }

  if (!store.get('downloadsFolderPath')) {
    store.set('downloadsFolderPath', DEFAULT_DOWNLOADS_PATH);
  }
}

export async function clearDownloadFolderAsync(folderPath) {
  try {
    const files = await fsPromises.readdir(folderPath);

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stat = await fsPromises.lstat(filePath);

      if (stat.isDirectory()) {
        await fsPromises.rm(filePath, { recursive: true, force: true });
      } else {
        await fsPromises.unlink(filePath);
      }
    }
  } catch (err) {
    console.error('Error clearing folder:', err);
    log.error('Error clearing folder:', err);
  }
}

export const RTLLanguages = ['he', 'ar', 'fa', 'ur'];

export const isRTL = (lang) => {
  if (!lang) return false;
  const langCode = lang.split('-')[0].toLowerCase();
  return RTLLanguages.includes(langCode);
}

// Hebrew, Arabic, Syriac, Thaana, NKo... plus presentation forms
const RTL_CHAR = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
const TAG = /<\/?[^>]+>/g;
const LEADING_PUNCT = /^[\s\-\u2013]*[.,!?\u2026:;]/;
const TRAILING_PUNCT = /[.,!?\u2026:;]["'\u201D]?\s*$/;

const convertLegacyStylingToHTML = (text) => {
    // Convert italics
    text = text.replace(/\{\\i1\}/g, '<i>');
    text = text.replace(/\{\\i0\}/g, '</i>');

    // Convert bold
    text = text.replace(/\{\\b1\}/g, '<b>');
    text = text.replace(/\{\\b0\}/g, '</b>');

    // Convert underline
    text = text.replace(/\{\\u1\}/g, '<u>');
    text = text.replace(/\{\\u0\}/g, '</u>');

    // Remove any other unsupported {...} tags
    text = text.replace(/\{[^}]+\}/g, '');

    return text;
}

/**
 * RTL subtitles come in two flavours:
 * - Logical order (correct Unicode): "שלום." - the period is stored at the end and the
 *   renderer (direction: rtl) shows it on the left. Nothing must be moved.
 * - Visual order: ".שלום" - punctuation was moved to the start so that players without
 *   bidi support (rendering everything LTR) show it on the left. Rendered RTL, the
 *   punctuation then appears on the wrong (right) side.
 * The order is a property of the file, not of the OS or its language, so it is detected
 * per file by counting which side the sentence punctuation sits on.
 */
const isVisualOrderRTL = (lines) => {
    let leading = 0;
    let trailing = 0;

    for (const line of lines) {
        const plain = line.replace(TAG, '').trim();
        if (!RTL_CHAR.test(plain)) continue;

        if (TRAILING_PUNCT.test(plain)) trailing += 1;
        else if (LEADING_PUNCT.test(plain)) leading += 1;
    }

    return leading >= 3 && leading > trailing;
}

/** Restores logical order for one line of a visual-order RTL file: ".שלום" -> "שלום." */
const fixVisualOrderLine = (line) => {
    const parts = line.match(/^((?:\s*<[^/>][^>]*>)*)([\s\S]*?)((?:<\/[^>]+>\s*)*)$/);
    if (!parts) return line;

    const [, openTags, body, closeTags] = parts;
    if (!RTL_CHAR.test(body)) return line;

    let core = body.trim();
    let dash = '';

    // Dialogue dash stored at the end ("שלום -") belongs at the logical start
    const trailingDash = core.match(/^([\s\S]*?[^\-\u2013\s])\s*[\-\u2013]$/);
    const leadingDash = core.match(/^([\-\u2013]\s*)([\s\S]*)$/);
    if (trailingDash) {
        dash = '- ';
        core = trailingDash[1];
    } else if (leadingDash) {
        dash = leadingDash[1];
        core = leadingDash[2];
    }

    const leadingPunct = core.match(/^([.,!?\u2026:;]+)\s*([\s\S]+)$/);
    if (leadingPunct) {
        core = `${leadingPunct[2]}${leadingPunct[1]}`;
    }

    return `${openTags}${dash}${core}${closeTags}`;
}

export const parseSRTtoVTT = (data, lang) => {
    const blocks = data.split(/\r?\n\r?\n/);
    const parsed = [];

    for (const block of blocks) {
        const lines = block.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) continue;

        let timeLineIndex = -1;
        if (lines[0]?.includes('-->')) {
            timeLineIndex = 0;
        } else if (lines.length > 1 && lines[1]?.includes('-->')) {
            timeLineIndex = 1;
        }

        if (timeLineIndex === -1) continue;

        const timeMatch = lines[timeLineIndex];
        const [startStr, endStr] = timeMatch.split('-->');

        const parseTime = (timeStr) => {
            const [h, m, sWithMs] = timeStr.trim().replace(',', '.').split(':');
            return parseFloat(h) * 3600 + parseFloat(m) * 60 + parseFloat(sWithMs);
        }

        const start = parseTime(startStr);
        const end = parseTime(endStr);

        if (isNaN(start) || isNaN(end)) continue;

        const textContentLines = lines.slice(timeLineIndex + 1);
        // Convert legacy styling tags to HTML tags
        const text = convertLegacyStylingToHTML(textContentLines.join('\n').trim());

        parsed.push({ start, end, lines: text.split('\n') });
    }

    // Text is kept in logical order: the renderer sets the direction (RTL/LTR) from the
    // text, which places punctuation correctly regardless of the OS language. Only files
    // stored in visual order are converted back to logical order.
    const visualOrder = isVisualOrderRTL(parsed.flatMap((cue) => cue.lines));
    if (visualOrder) {
        log.info(`Subtitle file stored in visual RTL order (lang: ${lang || 'unknown'}), restoring logical order`);
    }

    return parsed.map(({ start, end, lines }) => ({
        start,
        end,
        text: (visualOrder ? lines.map(fixVisualOrderLine) : lines).join('\n'),
    }));
}

export async function convertSRTtoVTT(srtFilePath, languageCode) {
  try {
    const buffer = await fsPromises.readFile(srtFilePath);
    let encoding = chardet.detect(buffer);

    log.info('Language code:', languageCode);
    log.info('Detected encoding:', encoding);

    // Fallback logic for Hebrew if encoding is mis-detected
    if ((languageCode || '').startsWith('he') && (!encoding || encoding === 'ISO-8859-1' || encoding === 'windows-1252')) {
      log.warn('Falling back to windows-1255 for Hebrew subtitle decoding');
      encoding = 'windows-1255';
    }

    const content = iconv.decode(buffer, encoding);

    const cues = parseSRTtoVTT(content, languageCode);

    const vttCues = cues.map((cue, index) => {
      const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = (seconds % 60).toFixed(3);
        return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.padStart(6,'0')}`;
      }

      return `${index + 1}\n${formatTime(cue.start)} --> ${formatTime(cue.end)}\n${cue.text}`;
    }).join('\n\n');

    const vttContent = `WEBVTT\n\nNOTE Language: ${languageCode}\n\n${vttCues}`;

    return vttContent;
  } catch (err) {
    console.error('VTT conversion failed:', err);
    throw err;
  }
}

export async function waitForFile(
  filePath,
  timeout = 5000,
  interval = 100
) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const stat = await fsPromises.stat(filePath);
      if (stat.size > 0) return;
    } catch {
      throw new Error('[Wait for file] - File does not exist.');
    }
    await new Promise(r => setTimeout(r, interval));
  }

  throw new Error(`Subtitle file not ready: ${filePath}`);
}
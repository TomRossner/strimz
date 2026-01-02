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
  const langCode = lang.split('-')[0].toLowerCase();
  return RTLLanguages.includes(langCode);
}

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

function reinsertTags(text, tags) {
    if (!tags.length) return text;

    let offset = 0;
    let clean = text;

    for (const { tag, index } of tags) {
        const safeIndex = Math.min(index + offset, clean.length);
        clean = clean.slice(0, safeIndex) + tag + clean.slice(safeIndex);
        offset += tag.length;
    }

    return clean;
}

export const parseSRTtoVTT = (data, lang) => {
    const isLangRTL = isRTL(lang);
    
    const processRTLText = (line) => {
        const RLE = '\u202B';
        const PDF = '\u202C';

        // Step 1: Extract and remove HTML tags
        const tagRegex = /<\/?(i|b|u)>/gi;
        const tags = [];
        let tagMatch;

        // Capture tags and their positions
        while ((tagMatch = tagRegex.exec(line)) !== null) {
            tags.push({ tag: tagMatch[0], index: tagMatch.index });
        }

        // Remove all tags from the line for punctuation processing
        const plainText = line.replace(tagRegex, '');

        // For LTR languages, return the line as-is (no RTL processing)
        if (!isLangRTL) {
            return line; // Keep original line for LTR languages
        }

        // Step 2: Handle lines that start with hyphen (RTL only)
        if (plainText.startsWith('-')) {
            const restOfLine = plainText.substring(1);
            const trailingPunctMatch = restOfLine.match(/([.…?!`':,]+)$/);
            if (trailingPunctMatch) {
                const trailingPunct = trailingPunctMatch[1];
                const textWithoutTrailing = restOfLine.slice(0, -trailingPunct.length);
                const final = `${RLE}-${textWithoutTrailing}${PDF}${trailingPunct}`;
                return reinsertTags(final, tags);
            }
            const final = `${RLE}-${restOfLine}${PDF}`;
            return reinsertTags(final, tags);
        }

        // Step 3: Match leading/trailing punctuation (RTL only)
        const leadingPunctMatch = plainText.match(/^([.…?!'"`:=,\-\s]+)/);
        const trailingPunctMatch = plainText.match(/([.…?!'"`:=,\-\s]+)$/);

        const leadingPunct = leadingPunctMatch ? leadingPunctMatch[0] : '';
        const trailingPunct = trailingPunctMatch ? trailingPunctMatch[0] : '';

        // Step 4: Strip punctuation
        const cleanedText = plainText
            .replace(/^([.…?!'"`:=,\-\s]+)/, '')
            .replace(/([.…?!'"`:=,\-\s]+)$/, '');

        // Step 5: Reverse punctuation for correct rendering in RTL
        const reversedLeading = leadingPunct.split('').reverse().join('');
        const reversedTrailing = trailingPunct.split('').reverse().join('');

        // Step 6: Wrap in bidi markers
        const finalLine = `${RLE}${reversedTrailing}${cleanedText}${reversedLeading}${PDF}`;

        // Step 7: Restore tags to the final output
        return reinsertTags(finalLine, tags);
    }

    const blocks = data.split(/\r?\n\r?\n/);
    const cues = [];

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
        const seconds = parseFloat(h) * 3600 + parseFloat(m) * 60 + parseFloat(sWithMs);
            return seconds;
        }

        const start = parseTime(startStr);
        const end = parseTime(endStr);

        if (isNaN(start) || isNaN(end)) continue;

        const textContentLines = lines.slice(timeLineIndex + 1);
        let text = textContentLines.join('\n').trim();

        // First, convert legacy styling tags to HTML tags
        text = convertLegacyStylingToHTML(text);

        // Then apply your RTL/LTR processing
        const processedLines = text.split('\n').map(processRTLText);
        text = processedLines.join('\n');

        // Sanitize to remove unsafe HTML but allow <i>, <b>, <u>
        // const sanitizedText = DOMPurify.sanitize(text, { ALLOWED_TAGS: ['i', 'b', 'u'] });

        cues.push({
            start,
            end,
            text,
        });
    }

    return cues;
}

export async function convertSRTtoVTT(srtFilePath, languageCode) {
  try {
    const buffer = await fsPromises.readFile(srtFilePath);
    let encoding = chardet.detect(buffer);

    log.info('Language code:', languageCode);
    log.info('Detected encoding:', encoding);

    // Fallback logic for Hebrew if encoding is mis-detected
    if (languageCode.startsWith('he') && (!encoding || encoding === 'ISO-8859-1' || encoding === 'windows-1252')) {
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
import { RTLLanguages } from "./detectLanguage";
import { Cue } from "./types";

export const isRTL = (lang: string): boolean => {
  if (!lang) return false;
  const langCode = lang.split('-')[0].toLowerCase();
  return RTLLanguages.includes(langCode);
}

// Hebrew, Arabic, Syriac, Thaana, NKo... plus presentation forms
const RTL_CHARS = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/g;
// Latin, Greek, Cyrillic, Armenian
const LTR_CHARS = /[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF\u0531-\u058F]/g;

/**
 * Direction of a subtitle file, decided from its text rather than from the language code:
 * the selected/detected language can be missing or wrong (e.g. a manually chosen file),
 * and the OS language plays no part in it.
 */
export const detectTextDirection = (cues: Cue[], fallbackLang?: string | null): 'rtl' | 'ltr' => {
  let rtl = 0;
  let ltr = 0;

  for (const cue of cues) {
    const text = cue.text.replace(/<[^>]+>/g, '');
    rtl += text.match(RTL_CHARS)?.length ?? 0;
    ltr += text.match(LTR_CHARS)?.length ?? 0;
  }

  if (rtl === 0 && ltr === 0) return isRTL(fallbackLang || '') ? 'rtl' : 'ltr';
  return rtl > ltr ? 'rtl' : 'ltr';
}

const ALLOWED_TAG = /<(\/?)(i|b|u)>/gi;

const escapeHTML = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Turns a cue's text into safe HTML: one isolated block per line, in the given direction.
 * Each line being its own block keeps the bidi algorithm from mixing lines (e.g. two dialogue
 * lines) and keeps punctuation at the line's end in both RTL and LTR. Only <i>, <b> and <u>
 * are kept; any other markup from the subtitle file is dropped and the rest is escaped.
 */
export const subtitleTextToHTML = (text: string, dir: 'rtl' | 'ltr'): string => {
  if (!text) return '';

  const openTags: string[] = [];

  return text.split('\n').map((rawLine) => {
    // Drop unsupported tags such as <font color="...">
    const line = rawLine.replace(/<(?!\/?(?:i|b|u)>)[^>]*>/gi, '');
    // Tags still open from the previous line are reopened so styling spans lines
    let html = openTags.map((tag) => `<${tag}>`).join('');
    let lastIndex = 0;

    for (const match of line.matchAll(ALLOWED_TAG)) {
      html += escapeHTML(line.slice(lastIndex, match.index));
      const [, closing, name] = match;
      const tag = name.toLowerCase();
      if (closing) {
        const openIndex = openTags.lastIndexOf(tag);
        if (openIndex !== -1) {
          openTags.splice(openIndex, 1);
          html += `</${tag}>`;
        }
      } else {
        openTags.push(tag);
        html += `<${tag}>`;
      }
      lastIndex = (match.index ?? 0) + match[0].length;
    }

    html += escapeHTML(line.slice(lastIndex));
    html += [...openTags].reverse().map((tag) => `</${tag}>`).join('');

    // The span carries the background box (see styles/subtitles.css); empty lines get none
    return `<div dir="${dir}">${html ? `<span class="subtitle-line">${html}</span>` : '&nbsp;'}</div>`;
  }).join('');
}

export function parseVTTToCues(vttContent: string): Cue[] {
  const lines = vttContent
    .replace(/\r\n/g, '\n') // normalize line endings
    .split('\n')
    .map(line => line.trim());

  const cues: Cue[] = [];
  let i = 0;

  while (i < lines.length) {
    // Skip empty lines or cue numbers
    if (!lines[i] || /^\d+$/.test(lines[i])) {
      i++;
      continue;
    }

    // Parse time range
    const timeMatch = lines[i].match(/^(\d{2}:\d{2}:\d{2}\.\d{3})\s-->\s(\d{2}:\d{2}:\d{2}\.\d{3})/);
    if (!timeMatch) {
      i++;
      continue;
    }

    const start = vttTimeToSeconds(timeMatch[1]);
    const end = vttTimeToSeconds(timeMatch[2]);
    i++;

    let text = '';
    while (i < lines.length && lines[i]) {
      text += lines[i] + '\n';
      i++;
    }

    cues.push({
      start,
      end,
      text: text.trim()
    });

    // Skip the blank line between cues
    while (i < lines.length && !lines[i]) {
      i++;
    }
  }

  return cues;
}

function vttTimeToSeconds(timeString: string): number {
  const [hours, minutes, seconds] = timeString.split(':');
  const [sec, millis] = seconds.split('.');
  return (
    parseInt(hours) * 3600 +
    parseInt(minutes) * 60 +
    parseInt(sec) +
    parseInt(millis) / 1000
  );
}

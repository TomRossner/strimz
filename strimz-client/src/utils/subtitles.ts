import { RTLLanguages } from "./detectLanguage";
import { Cue } from "./types";

export const isRTL = (lang: string): boolean => {
  const langCode = lang.split('-')[0].toLowerCase();
  return RTLLanguages.includes(langCode);
}

const convertLegacyStylingToHTML = (text: string): string => {
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


// export const parseSRTtoVTT = (data: string, lang: string): Cue[] => {
//     const isLangRTL = isRTL(lang);
//     const RLE = '\u202B'; // Right-to-Left Embedding
//     const PDF = '\u202C'; // Pop Directional Formatting

//     const processRTLText = (line: string): string => {
//         const punctuationRegexWithHyphen = /[.…?!,-]/; // Include hyphen in punctuation regex

//         if (!isLangRTL) {
//             // For LTR, process to keep ending punctuation at the end
//             if (line.startsWith('-')) {
//                 return line;
//             }
//             const firstChar = line.charAt(0);
//             const lastChar = line.charAt(line.length - 1);
//             let processedLine = line;

//             if (punctuationRegexWithHyphen.test(firstChar) && punctuationRegexWithHyphen.test(lastChar)) {
//                 processedLine = `${lastChar}${line.substring(1, line.length - 1)}${firstChar}`;
//             } else if (punctuationRegexWithHyphen.test(firstChar)) {
//             // Keep leading punctuation at the start for LTR
//                 return processedLine;
//             } else if (punctuationRegexWithHyphen.test(lastChar)) {
//             // Keep trailing punctuation at the end for LTR
//                 return processedLine;
//             }
//             return processedLine;

//         } else {
//             // For RTL, handle hyphen as punctuation, but prioritize it at the start
//             if (line.startsWith('-')) {
//                 const restOfLine = line.substring(1);
//                 const trailingPunctMatch = restOfLine.match(/([.…?"'!,-]+)$/);
//                 if (trailingPunctMatch) {
//                     const trailingPunct = trailingPunctMatch[1];
//                     const textWithoutTrailing = restOfLine.slice(0, -trailingPunct.length);
//                     return `${RLE}-${textWithoutTrailing}${PDF}${trailingPunct}`;
//                 }
//                 return `${RLE}-${restOfLine}${PDF}`;
//             }

//             const leadingPunctMatch = line.match(/^([.…?!,-]+)/);
//             const trailingPunctMatch = line.match(/([.…?!,-]+)$/);
//             const leadingPunct = leadingPunctMatch ? leadingPunctMatch[1] : '';
//             const trailingPunct = trailingPunctMatch ? trailingPunctMatch[1] : '';
//             const mainText = line.substring(leadingPunct.length, line.length - trailingPunct.length);

//             return `${RLE}${trailingPunct}${mainText}${leadingPunct}${PDF}`;
//         }
//     }

//     const blocks = data.split(/\r?\n\r?\n/);
//     const cues: Cue[] = [];

//     for (const block of blocks) {
//         const lines = block.split(/\r?\n/).filter(Boolean);
//         if (lines.length < 2) continue;

//         let timeLineIndex = -1;
//         if (lines[0]?.includes('-->')) {
//             timeLineIndex = 0;
//         } else if (lines.length > 1 && lines[1]?.includes('-->')) {
//             timeLineIndex = 1;
//         }

//         if (timeLineIndex === -1) continue;

//         const timeMatch = lines[timeLineIndex];
//         const [startStr, endStr] = timeMatch.split('-->');

//         const parseTime = (timeStr: string) => {
//         const [h, m, sWithMs] = timeStr.trim().replace(',', '.').split(':');
//         const seconds = parseFloat(h) * 3600 + parseFloat(m) * 60 + parseFloat(sWithMs);
//             return seconds;
//         };

//         const start = parseTime(startStr);
//         const end = parseTime(endStr);

//         if (isNaN(start) || isNaN(end)) continue;

//         const textContentLines = lines.slice(timeLineIndex + 1);
//         let text = textContentLines.join('\n').trim();

//         // First, convert legacy styling tags to HTML tags
//         text = convertLegacyStylingToHTML(text);

//         // Then apply your RTL/LTR processing
//         const processedLines = text.split('\n').map(processRTLText);
//         text = processedLines.join('\n');

//         // Sanitize to remove unsafe HTML but allow <i>, <b>, <u>
//         const sanitizedText = DOMPurify.sanitize(text, { ALLOWED_TAGS: ['i', 'b', 'u'] });

//         cues.push({
//             start,
//             end,
//             text: sanitizedText,
//         });
//     }

//     return cues;
// }

type TagEntry = {
  tag: string;
  index: number;
}

function reinsertTags(text: string, tags: TagEntry[]): string {
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


export const parseSRTtoVTT = (data: string) => {
    const processRTLText = (line: string) => {
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

        // Step 2: Handle lines that start with hyphen
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

        // Step 3: Match leading/trailing punctuation
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

        const parseTime = (timeStr: string) => {
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
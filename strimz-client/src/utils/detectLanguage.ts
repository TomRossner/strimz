import { franc } from 'franc';

export const extractTextFromSubtitle = (content: string): string => {
  // Remove SRT/VTT timestamps and cue identifiers
  return content
    .replace(/\d{2}:\d{2}:\d{2}[\\.,]\d{3} --> \d{2}:\d{2}:\d{2}[\\.,]\d{3}/g, '')
    .replace(/^\d+$/gm, '')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const detectLanguageFromSubtitle = (text: string): string => {
  const langCode = franc(text); // returns ISO 639-3 code
  return langCode !== 'und' ? langCode : '';
}

// Minimal ISO 639-3 → ISO 639-1 mapping
const iso3to1: Record<string, string> = {
  eng: 'en',
  heb: 'he',
  fra: 'fr',
  deu: 'de',
  spa: 'es',
  rus: 'ru',
  jpn: 'ja',
  zho: 'zh',
  ara: 'ar',
  ita: 'it',
  por: 'pt',
}

// ISO 639-1 → Country Code (2-letter ISO 3166-1)
const langToCountry: Record<string, string> = {
  en: 'us',
  he: 'il',
  fr: 'fr',
  de: 'de',
  es: 'es',
  ru: 'ru',
  ja: 'jp',
  zh: 'cn',
  ar: 'sa',
  it: 'it',
  pt: 'pt',
}

export function getCountryCodeFromIso3(iso3: string): string | undefined {
  const iso1 = iso3to1[iso3];
  return iso1 ? langToCountry[iso1] : undefined;
}

export function getFlagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
}

const iso3toBCP47: Record<string, string> = {
  eng: 'en-US',
  heb: 'he-IL',
  fra: 'fr-FR',
  deu: 'de-DE',
  spa: 'es-ES',
  rus: 'ru-RU',
  jpn: 'ja-JP',
  zho: 'zh-CN',
  ara: 'ar-SA',
  ita: 'it-IT',
  por: 'pt-PT',
}

export function getBCP47FromISO3(iso3: string): string | undefined {
  return iso3toBCP47[iso3];
}

export const iso639_3ToLabelAndLang: Record<string, { label: string; lang: string }> = {
  eng: { label: 'English', lang: 'en-US' },
  heb: { label: 'Hebrew', lang: 'he-IL' },
  fra: { label: 'French', lang: 'fr-FR' },
  deu: { label: 'German', lang: 'de-DE' },
  spa: { label: 'Spanish', lang: 'es-ES' },
  rus: { label: 'Russian', lang: 'ru-RU' },
  jpn: { label: 'Japanese', lang: 'ja-JP' },
  zho: { label: 'Chinese', lang: 'zh-CN' },
  ara: { label: 'Arabic', lang: 'ar-SA' },
  ita: { label: 'Italian', lang: 'it-IT' },
  por: { label: 'Portuguese', lang: 'pt-PT' },
}

export function getSubtitleMetadata(iso3: string) {
  return iso639_3ToLabelAndLang[iso3] ?? { label: 'Subtitles', lang: '' };
}

export const RTLLanguages = ['he', 'ar', 'fa', 'ur']

export const iso3ToOS: Record<string, string> = {
  // English
  eng: 'eng',

  // French
  fra: 'fre', // canonical ISO3 → OpenSubtitles
  fre: 'fre', // legacy mapping

  // German
  deu: 'ger',
  ger: 'ger',

  // Spanish
  spa: 'spa',

  // Italian
  ita: 'ita',

  // Russian
  rus: 'rus',

  // Japanese
  jpn: 'jpn',

  // Arabic
  ara: 'ara',

  // Hebrew
  heb: 'heb',

  // Hindi
  hin: 'hin',

  // Portuguese
  por: 'por',
  pob: 'pob', // Brazilian Portuguese in OpenSubtitles

  // Chinese
  zho: 'chi',
  chi: 'chi', // legacy

  // Turkish
  tur: 'tur',

  // Korean
  kor: 'kor',

  // Dutch
  nld: 'dut',
  dut: 'dut',

  // Swedish
  swe: 'swe',

  // Norwegian
  nor: 'nor',

  // Danish
  dan: 'dan',

  // Finnish
  fin: 'fin',

  // Polish
  pol: 'pol',

  // Romanian
  ron: 'rum',
  rum: 'rum',

  // Bulgarian
  bul: 'bul',

  // Greek
  ell: 'gre',

  // Hungarian
  hun: 'hun',

  // Czech
  ces: 'cze',
  cze: 'cze',

  // Slovak
  slk: 'slo',
  slo: 'slo',

  // Catalan
  cat: 'cat',

  // Basque
  eus: 'baq',
  baq: 'baq',

  // Serbian
  srp: 'scc',
  scc: 'scc',

  // Croatian
  hrv: 'hrv',

  // Malay
  msa: 'may',
  may: 'may',

  // Thai
  tha: 'tha',

  // Vietnamese
  vie: 'vie',

  // Indonesian
  ind: 'ind',

  // Bengali
  ben: 'ben',

  // Tamil
  tam: 'tam',

  // Ukrainian
  ukr: 'ukr',

  // Persian
  fas: 'per',
  per: 'per',

  // Icelandic
  isl: 'ice',
  ice: 'ice',

  // Mongolian
  mon: 'mon',

  // Albanian
  sqi: 'sqi',
  alb: 'sqi',

  // Burmese
  mya: 'bur',
  bur: 'bur',
};

/* ============================================================================
 * 1. CANONICAL ISO 639-3 NORMALIZATION
 *    Collapse legacy / provider / alias codes → canonical ISO-639-3
 * ========================================================================== */

export const normalizeISO3: Record<string, string> = {
  // French
  fre: 'fra',
  fra: 'fra',

  // German
  ger: 'deu',
  deu: 'deu',

  // Chinese
  chi: 'zho',
  zhe: 'zho',
  zht: 'zho',
  zho: 'zho',

  // Czech
  cze: 'ces',
  ces: 'ces',

  // Dutch
  dut: 'nld',
  nld: 'nld',

  // Icelandic
  ice: 'isl',
  isl: 'isl',

  // Macedonian
  mac: 'mkd',
  mkd: 'mkd',

  // Malay
  may: 'msa',
  msa: 'msa',

  // Persian
  per: 'fas',
  fas: 'fas',

  // Romanian
  rum: 'ron',
  ron: 'ron',

  // Serbian
  scc: 'srp',
  srp: 'srp',

  // Portuguese
  pob: 'por',
  por: 'por',

  // Others
  alb: 'sqi',
  bur: 'mya',
  lit: 'lit',
  mal: 'mal',
  afr: 'afr',
  baq: 'eus',
  chv: 'chv',
  slo: 'slk',
  tat: 'tat',
};

export function normalizeLanguageCode(code: string): string {
  return normalizeISO3[code] ?? code;
}

/* ============================================================================
 * 2. CANONICAL ISO-639-3 → ISO-639-1
 * ========================================================================== */

export const iso3to1: Record<string, string> = {
  eng: 'en',
  ara: 'ar',
  heb: 'he',
  fra: 'fr',
  spa: 'es',
  rus: 'ru',
  jpn: 'ja',
  ita: 'it',
  sqi: 'sq',
  ben: 'bn',
  bos: 'bs',
  bul: 'bg',
  mal: 'ml',
  mya: 'my',
  cat: 'ca',
  ces: 'cs',
  nld: 'nl',
  isl: 'is',
  kur: 'ku',
  msa: 'ms',
  fas: 'fa',
  por: 'pt',
  ron: 'ro',
  srp: 'sr',
  zho: 'zh',
  dan: 'da',
  ell: 'el',
  est: 'et',
  fin: 'fi',
  deu: 'de',
  glg: 'gl',
  hin: 'hi',
  hrv: 'hr',
  hun: 'hu',
  ind: 'id',
  kan: 'kn',
  khm: 'km',
  kor: 'ko',
  lav: 'lv',
  lit: 'lt',
  mkd: 'mk',
  mon: 'mn',
  nor: 'no',
  pol: 'pl',
  sin: 'si',
  slv: 'sl',
  som: 'so',
  swe: 'sv',
  tam: 'ta',
  tgl: 'tl',
  tha: 'th',
  tur: 'tr',
  ukr: 'uk',
  urd: 'ur',
  vie: 'vi',
  afr: 'af',
  eus: 'eu',
  chv: 'cv',
  slk: 'sk',
  tat: 'tt',
};

/* ============================================================================
 * 3. ISO-639-1 → COUNTRY (FLAGS)
 * ========================================================================== */

export const langToCountry: Record<string, string> = {
  en: 'us',
  ar: 'sa',
  he: 'il',
  fr: 'fr',
  es: 'es',
  ru: 'ru',
  ja: 'jp',
  it: 'it',
  hi: 'in',
  sq: 'al',
  bn: 'bd',
  bs: 'ba',
  bg: 'bg',
  my: 'mm',
  ca: 'es',
  cs: 'cz',
  nl: 'nl',
  is: 'is',
  ms: 'my',
  fa: 'ir',
  pt: 'pt',
  ro: 'ro',
  sr: 'rs',
  zh: 'cn',
  da: 'dk',
  el: 'gr',
  et: 'ee',
  fi: 'fi',
  de: 'de',
  gl: 'es',
  hr: 'hr',
  hu: 'hu',
  id: 'id',
  kn: 'in',
  km: 'kh',
  ko: 'kr',
  lt: 'lt',
  lv: 'lv',
  mk: 'mk',
  ml: 'in',
  mn: 'mn',
  no: 'no',
  pl: 'pl',
  si: 'lk',
  sl: 'si',
  so: 'so',
  sv: 'se',
  ta: 'in',
  tl: 'ph',
  th: 'th',
  tr: 'tr',
  uk: 'ua',
  ur: 'pk',
  vi: 'vn',
  af: 'za',
  eu: 'es',
  cv: 'ru',
  sk: 'sk',
  tt: 'ru',
};

/* ============================================================================
 * 4. PROVIDER-SPECIFIC MAPPING (OpenSubtitles)
 *    ⚠️ Use ONLY when calling the provider API
 * ========================================================================== */

export const iso3ToOpenSubtitles: Record<string, string> = {
  fra: 'fre',
  deu: 'ger',
  zho: 'chi',
  por: 'pob',
};

export function toOpenSubtitlesCode(iso3: string): string {
  const canonical = normalizeLanguageCode(iso3);
  return iso3ToOpenSubtitles[canonical] ?? canonical;
}

/* ============================================================================
 * 5. FLAGS / HELPERS (unchanged behavior)
 * ========================================================================== */

export const NO_FLAG_LANGS = new Set(['ku']);

export function resolveCountryCode(rawIso3: string): string | null {
  const iso3 = normalizeLanguageCode(rawIso3);

  if (rawIso3 === 'pob') return 'br';
  if (rawIso3 === 'zht') return 'tw';
  if (rawIso3 === 'zhe') return 'cn';

  const iso1 = iso3to1[iso3];
  if (!iso1 || NO_FLAG_LANGS.has(iso1)) return null;

  return langToCountry[iso1] ?? null;
}

export function getFlagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .split('')
    .map(c => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join('');
}

/* ============================================================================
 * 6. SUBTITLE TEXT + LANGUAGE DETECTION
 * ========================================================================== */

export const extractTextFromSubtitle = (content: string): string =>
  content
    .replace(/\d{2}:\d{2}:\d{2}[\\.,]\d{3} --> \d{2}:\d{2}:\d{2}[\\.,]\d{3}/g, '')
    .replace(/^\d+$/gm, '')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/* ============================================================================
 * 7. BCP-47 / LABELS / MISC (unchanged)
 * ========================================================================== */

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
};

export function getBCP47FromISO3(iso3: string): string | undefined {
  return iso3toBCP47[normalizeLanguageCode(iso3)];
}

export const iso639_3ToLabelAndLang: Record<
  string,
  { label: string; lang: string }
> = {
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
};

export function getSubtitleMetadata(iso3: string) {
  return (
    iso639_3ToLabelAndLang[normalizeLanguageCode(iso3)] ?? {
      label: 'Subtitles',
      lang: null,
    }
  );
}

export const RTLLanguages = ['he', 'ar', 'fa', 'ur'];

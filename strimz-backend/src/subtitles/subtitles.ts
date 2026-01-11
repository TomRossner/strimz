import {config} from "dotenv";
config();
import axios from "axios";
import { normalizeLanguageCode } from "../utils/detectLanguage.js";
import { extractSrtFiles } from "../utils/srtExtractor.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
const USER_AGENT = `Strimz v${packageJson.version}`;

export const searchSubtitles = async (id: string, lang: string) => {
    const options = {
        method: 'GET',
        url: process.env.SUBTITLES_API_URL,
        params: {
            imdb_id: id,
            languages: lang
        },
        headers: {
          'x-rapidapi-key': process.env.SUBTITLES_API_KEY,
          'x-rapidapi-host': process.env.SUBTITLES_API_HOST,
        }
    }

    return await axios.request(options);
}

/**
 * Search for subtitles using OpenSubtitles REST API
 * @param imdbId - IMDb ID (e.g., "tt1234567")
 * @param trustedSources - Filter by trusted sources only (default: "only")
 * @param type - Content type (default: "movie")
 * @returns Object with languages array and language to fileId mapping
 */
export const searchSubtitlesByImdbId = async (
    imdbId: string,
    trustedSources: string = "include", // Changed from "only" to "include" to get all subtitles
    type: string = "movie"
): Promise<{ languages: string[], languageFiles: Record<string, Array<{ fileId: string, fileName: string, uploadDate: string }>> }> => {
    try {
        const apiKey = process.env.OPENSUBTITLES_KEY;
        if (!apiKey) {
            throw new Error('OPENSUBTITLES_KEY is not set in environment variables');
        }

        // OpenSubtitles REST API endpoint - fetch all pages to get all unique languages
        const languages = new Set<string>();
        const languageFiles: Record<string, Array<{ fileId: string, fileName: string, uploadDate: string }>> = {};
        
        // Fetch first page to get pagination info
        // Note: Remove trusted_sources filter to get ALL subtitles (not just trusted ones)
        // The website shows all subtitles, so we should fetch all to match that behavior
        const params: any = {
            imdb_id: imdbId,
            type: type,
            page: 1
        };
        
        // Only add trusted_sources if explicitly set to "only", otherwise fetch all
        if (trustedSources === 'only') {
            params.trusted_sources = trustedSources;
        }
        
        const firstPageResponse = await axios.get('https://api.opensubtitles.com/api/v1/subtitles', {
            params: params,
            headers: {
                'Api-Key': apiKey,
                'Accept': 'application/json',
                'User-Agent': USER_AGENT
            }
        });

        const totalPages = firstPageResponse.data?.total_pages || 1;
        const totalCount = firstPageResponse.data?.total_count || 0;
        
        console.log(`[OpenSubtitles API] Found ${totalCount} total subtitles across ${totalPages} pages for IMDb ${imdbId}`);
        
        // Process first page
        const firstPageSubtitles = firstPageResponse.data?.data || [];
        
        // Fetch all remaining pages in batches to avoid rate limiting
        const additionalPages: any[] = [];
        const BATCH_SIZE = 5; // Fetch 5 pages at a time
        const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay between batches
        
        if (totalPages > 1) {
            console.log(`[OpenSubtitles API] Fetching ${totalPages - 1} additional pages in batches of ${BATCH_SIZE}...`);
            
            // Process pages in batches
            for (let startPage = 2; startPage <= totalPages; startPage += BATCH_SIZE) {
                const endPage = Math.min(startPage + BATCH_SIZE - 1, totalPages);
                const batchPromises = [];
                
                // Create batch of page requests
                for (let page = startPage; page <= endPage; page++) {
                    const pageParams: any = {
                        imdb_id: imdbId,
                        type: type,
                        page: page
                    };
                    
                    // Only add trusted_sources if explicitly set to "only"
                    if (trustedSources === 'only') {
                        pageParams.trusted_sources = trustedSources;
                    }
                    
                    batchPromises.push(
                        axios.get('https://api.opensubtitles.com/api/v1/subtitles', {
                            params: pageParams,
                            headers: {
                                'Api-Key': apiKey,
                                'Accept': 'application/json',
                                'User-Agent': USER_AGENT
                            }
                        }).catch(error => {
                            // Handle rate limiting specifically
                            if (error.response?.status === 429) {
                                console.warn(`[OpenSubtitles API] Rate limit hit on page ${page}, will retry after delay`);
                                // Return null to skip this page for now
                                return null;
                            }
                            console.error(`Error fetching page ${page}:`, error.response?.status || error.message);
                            return null; // Continue with other pages even if one fails
                        })
                    );
                }
                
                // Wait for current batch to complete
                const batchResponses = await Promise.all(batchPromises);
                batchResponses.forEach((response, index) => {
                    if (response?.data?.data) {
                        additionalPages.push(...response.data.data);
                    }
                });
                
                // Add delay between batches (except after the last batch)
                if (endPage < totalPages) {
                    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
                }
            }
            
            console.log(`[OpenSubtitles API] Completed fetching all pages. Got ${additionalPages.length} additional subtitles from remaining pages.`);
        }
        
        // Combine all subtitles from all pages
        const allSubtitles = [...firstPageSubtitles, ...additionalPages];

        // Map OpenSubtitles 2-letter language codes to ISO3
        const osToIso3: Record<string, string> = {
            'en': 'eng',
            'fr': 'fra',
            'de': 'deu',
            'es': 'spa',
            'it': 'ita',
            'ru': 'rus',
            'ja': 'jpn',
            'ar': 'ara',
            'he': 'heb',
            'hi': 'hin',
            'pt': 'por',
            'zh': 'zho',
            'zh-TW': 'zho',
            'zh-CN': 'zho',
            'tr': 'tur',
            'ko': 'kor',
            'nl': 'nld',
            'sv': 'swe',
            'no': 'nor',
            'da': 'dan',
            'fi': 'fin',
            'pl': 'pol',
            'ro': 'ron',
            'bg': 'bul',
            'el': 'ell',
            'hu': 'hun',
            'cs': 'ces',
            'sk': 'slk',
            'ca': 'cat',
            'eu': 'eus',
            'sr': 'srp',
            'hr': 'hrv',
            'ms': 'msa',
            'th': 'tha',
            'vi': 'vie',
            'id': 'ind',
            'bn': 'ben',
            'ta': 'tam',
            'uk': 'ukr',
            'fa': 'fas',
            'is': 'isl',
            'mn': 'mon',
            'sq': 'sqi',
            'my': 'mya',
        };

        allSubtitles.forEach((subtitle: any) => {
            const langCode = subtitle.attributes?.language;
            // File ID is in attributes.files[0].file_id, not attributes.file_id
            const files = subtitle.attributes?.files || [];
            
            if (langCode && files.length > 0) {
                // Handle language codes that might have variants (e.g., "zh-TW" -> "zh")
                const baseLangCode = langCode.split('-')[0].toLowerCase();
                
                // Convert OpenSubtitles 2-letter language code to ISO3
                // Try exact match first, then base code, then use base code as fallback
                let iso3 = osToIso3[langCode.toLowerCase()] || osToIso3[baseLangCode];
                
                // If not found in mapping, try to use the base code directly
                // Some language codes might already be ISO3 or close to it
                if (!iso3) {
                    // If it's a 3-letter code, it might already be ISO3
                    if (baseLangCode.length === 3) {
                        iso3 = baseLangCode;
                    } else {
                        // For 2-letter codes not in mapping, use base code
                        iso3 = baseLangCode;
                    }
                }
                
                // Normalize to canonical ISO3
                const normalized = normalizeLanguageCode(iso3);
                languages.add(normalized);
                
                // Store all files for this language
                if (!languageFiles[normalized]) {
                    languageFiles[normalized] = [];
                }
                
                // Add each file for this language (avoid duplicates)
                // Get upload date from subtitle attributes
                const uploadDate = subtitle.attributes?.upload_date || '';
                files.forEach((file: any) => {
                    const fileId = file.file_id?.toString();
                    const fileName = file.file_name || '';
                    if (fileId && !languageFiles[normalized].some(f => f.fileId === fileId)) {
                        languageFiles[normalized].push({ fileId, fileName, uploadDate });
                    }
                });
            }
        });
        
        console.log(`[OpenSubtitles API] Found ${languages.size} unique languages from ${allSubtitles.length} subtitles across ${totalPages} pages`);

        // Prioritize common languages
        const commonLanguages = ['eng', 'fra', 'spa', 'deu', 'ita', 'rus', 'jpn', 'ara', 'heb', 'hin'];
        const languagesArray = Array.from(languages);
        
        // Separate common and other languages
        const common: string[] = [];
        const others: string[] = [];
        
        languagesArray.forEach(lang => {
            const normalized = normalizeLanguageCode(lang);
            if (commonLanguages.includes(normalized)) {
                common.push(lang);
            } else {
                others.push(lang);
            }
        });
        
        // Sort common languages by priority order, then sort others alphabetically
        const sortedCommon = common.sort((a, b) => {
            const aNorm = normalizeLanguageCode(a);
            const bNorm = normalizeLanguageCode(b);
            const aIndex = commonLanguages.indexOf(aNorm);
            const bIndex = commonLanguages.indexOf(bNorm);
            return aIndex - bIndex;
        });
        
        const sortedOthers = others.sort();
        
        return {
            languages: [...sortedCommon, ...sortedOthers],
            languageFiles
        };
    } catch (error) {
        console.error('Error searching subtitles by IMDb ID:', error);
        throw error;
    }
}

/**
 * Download subtitle file from OpenSubtitles REST API
 * @param fileId - OpenSubtitles file ID
 * @param downloadPath - Path where to save the subtitle file
 * @param imdbCode - IMDb code for filename
 * @param title - Movie title for filename
 * @param year - Movie year for filename
 * @param language - Language code for filename
 * @returns Path to downloaded subtitle file
 */
export const downloadSubtitleFromApi = async (
    fileId: string,
    downloadPath: string,
    imdbCode: string,
    title: string,
    year: string,
    language: string
): Promise<string> => {
    try {
        const apiKey = process.env.OPENSUBTITLES_KEY;
        if (!apiKey) {
            throw new Error('OPENSUBTITLES_KEY is not set in environment variables');
        }

        // Get download link from OpenSubtitles API
        // The API expects a POST request with file_id in the body
        const downloadResponse = await axios.post(
            `https://api.opensubtitles.com/api/v1/download`,
            {
                file_id: parseInt(fileId)
            },
            {
                headers: {
                    'Api-Key': apiKey,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': USER_AGENT
                }
            }
        );

        // The API returns a link in the response
        const downloadLink = downloadResponse.data?.link || downloadResponse.data?.data?.link;
        if (!downloadLink) {
            throw new Error('No download link returned from OpenSubtitles API');
        }

        // Download the subtitle file (usually a ZIP file)
        const fileResponse = await axios.get(downloadLink, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': USER_AGENT
            }
        });

        // Generate filename
        const fs = await import('fs');
        const path = await import('path');
        const sanitizedTitle = title.replace(/[^A-Za-z]/g, '.');
        const fileName = `${imdbCode}-${sanitizedTitle}-${year}-[${language}].srt`;
        const filePath = path.join(downloadPath, fileName);

        // Ensure directory exists
        if (!fs.existsSync(downloadPath)) {
            fs.mkdirSync(downloadPath, { recursive: true });
        }

        // Check if the downloaded file is a ZIP (OpenSubtitles often returns ZIP files)
        const isZip = fileResponse.headers['content-type']?.includes('zip') || 
                     downloadLink.includes('.zip');

        if (isZip) {
            // Save ZIP file temporarily
            const tempZipPath = path.join(downloadPath, `${fileName}.zip`);
            fs.writeFileSync(tempZipPath, fileResponse.data);
            
            // Extract SRT from ZIP using existing utility
            const sanitizedTitle = title.replace(/[^A-Za-z]/g, '.');
            const baseName = `${imdbCode}-${sanitizedTitle}-${year}-[${language}]`;
            const extractedPath = await extractSrtFiles(tempZipPath, downloadPath, baseName);
            
            // Clean up temp ZIP file
            try {
                fs.unlinkSync(tempZipPath);
            } catch (err) {
                console.warn('Failed to delete temp ZIP file:', err);
            }
            
            return extractedPath;
        } else {
            // Write file directly (assuming it's already an SRT)
            fs.writeFileSync(filePath, fileResponse.data);
            return filePath;
        }
    } catch (error) {
        console.error('Error downloading subtitle from API:', error);
        throw error;
    }
}
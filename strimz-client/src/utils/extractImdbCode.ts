/**
 * Extracts IMDb movie code from various URL formats or returns the input if it's already a code
 * 
 * Note: Only movie codes (tt...) are supported. Actor codes (nm...) are not supported by YTS API.
 * 
 * Supports:
 * - Movie URLs: https://www.imdb.com/title/tt0499549/
 * - Movie URLs with query params: https://www.imdb.com/title/tt0499549/?ref_=tt_mlt_i_1
 * - Short URLs: imdb.com/title/tt0499549
 * - IMDb movie codes: tt0499549
 * 
 * @param input - The input string (URL or IMDb code)
 * @returns The extracted IMDb movie code if found, otherwise the original input
 */
export const extractImdbCode = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return input;
  }

  const trimmedInput = input.trim();

  // IMDb movie code pattern: tt followed by 7-8 digits
  const movieCodePattern = /^tt\d{7,8}$/;
  const imdbCodePattern = /tt\d{7,8}/;

  // Check if input is already just an IMDb movie code
  if (movieCodePattern.test(trimmedInput)) {
    return trimmedInput;
  }

  // Try to extract movie IMDb code from URL
  // Matches patterns like: /title/tt0499549/ or /title/tt0499549
  const movieUrlPattern = /\/title\/(tt\d{7,8})/i;
  const match = trimmedInput.match(movieUrlPattern);

  if (match && match[1]) {
    return match[1];
  }

  // If no URL pattern matched, try to find any IMDb movie code in the string
  const codeMatch = trimmedInput.match(imdbCodePattern);
  if (codeMatch) {
    return codeMatch[0];
  }

  // Return original input if no IMDb code found
  return trimmedInput;
};


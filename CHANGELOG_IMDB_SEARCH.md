# IMDb Code Search Feature

## Summary

Added support for extracting IMDb movie codes from URLs in the search functionality. Users can now paste IMDb movie URLs directly into the search field, and the system will automatically extract the IMDb code and use it for searching.

## Changes Made

### 1. New Utility Function: `extractImdbCode.ts`

**File:** `strimz-client/src/utils/extractImdbCode.ts`

Created a new utility function that extracts IMDb movie codes from various URL formats:

- **Supported Formats:**
  - Full movie URLs: `https://www.imdb.com/title/tt0499549/`
  - URLs with query parameters: `https://www.imdb.com/title/tt0499549/?ref_=tt_mlt_i_1`
  - Short URLs: `imdb.com/title/tt0499549`
  - Direct IMDb codes: `tt0499549`

- **Functionality:**
  - Extracts IMDb movie codes (format: `tt` followed by 7-8 digits)
  - Returns the extracted code if found
  - Returns the original input if no IMDb code is detected (allows normal text searches to work)
  - Only supports movie codes (`tt...`), not actor codes (`nm...`)

### 2. Updated Search Component

**File:** `strimz-client/src/components/Search.tsx`

**Changes:**
- Added import for `extractImdbCode` utility function
- Updated the `params` useMemo to extract IMDb codes from user input before setting `query_term`
- Updated the useEffect hook to also extract IMDb codes when restoring from stored `currentQuery`
- Updated placeholder text from "Search movies..." to "Search movies or IMDb codes..."

**How it works:**
1. User enters a search query (movie title, IMDb URL, or IMDb code)
2. The `extractImdbCode` function processes the input
3. If an IMDb code is detected, it's extracted and used for the search
4. If no code is found, the original input is used (normal text search)

## Limitations

- **Actor searches not supported:** The YTS API does not support searching by actor names or actor IMDb codes (`nm...` codes), so only movie searches are supported
- **Only movie IMDb codes:** Only movie IMDb codes (`tt...`) are extracted; actor/person codes (`nm...`) are ignored

## Usage Examples

Users can now search using:

1. **IMDb Movie URLs:**
   ```
   https://www.imdb.com/title/tt0499549/
   ```
   → Extracts: `tt0499549`

2. **Direct IMDb Codes:**
   ```
   tt0499549
   ```
   → Used directly: `tt0499549`

3. **Movie Titles (unchanged):**
   ```
   Avatar
   ```
   → Searches for: `Avatar`

## Technical Details

- The extraction uses regex patterns to identify IMDb codes in URLs
- The function is idempotent - passing an already extracted code will return it unchanged
- The implementation is non-breaking - existing search functionality continues to work as before
- No backend changes were required - the YTS API already supports IMDb codes via the `query_term` parameter



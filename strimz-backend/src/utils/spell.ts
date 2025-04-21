import nspell from "nspell";
import en from "dictionary-en";

const spell = nspell(en.aff as Buffer, en.dic as Buffer);

export const getCorrected = (str: string): string => {
    let corrected: string = str.trim().toLowerCase();

    const parts = corrected.split(" ");

    if (parts.length) {
        corrected = parts.map(part => {
            if (spell.correct(part)) return part;
        
            const suggestions = spell.suggest(part);
            console.log("Suggestions: ", suggestions);
            if (!suggestions.length) return '';
        
            const originalLength = part.length;
            const originalChars = [...part];
        
            for (const suggestion of suggestions) {
                const hasAllLetters = originalChars.every(char => suggestion.includes(char));
                const isSimilarLength = suggestion.length === originalLength;
        
                if (hasAllLetters && isSimilarLength) {
                    return suggestion;
                }
            }
        
            const fallback = suggestions.find(s => s.length === originalLength);
            if (fallback) return fallback;
        
            return suggestions[0];
        }).join(" ");
    }
    console.log("Corrected: ", corrected);
    return corrected;
}
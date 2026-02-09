import { PREP_PHRASES, PREP_WORDS, KNOWN_UNITS, NUMBERS_BASE } from './removeable.js'
const stopWords = sw.load('english');
import sw from 'nltk-stopwords';

export const normalizeIngredientInput = (rawText) => {

    // 1. Convert to lowercase
    let normalized = rawText.toLowerCase();
    
    // 2. Replace all non alpha characters with spaces, then replace all instances of 1+ spaces with a single space and trim
    normalized = normalized.replace(/[^a-z]/g, ' ').replace(/[ ]+/g, ' ').trim();
    
    // 3. Remove all instances of prep phrases and normalize spaces again
    PREP_PHRASES.forEach((val) => normalized = normalized.replace(`${val}`, '').replace(/[ ]+/g, ' ').trim());

    // 4. Split on spaces to filter out individual prep words, unit descriptors, and quantitive values in written form
    const tokens = sw.remove(normalized.split(' ').filter((token) => {
        return !PREP_WORDS.has(token) && !KNOWN_UNITS.has(token) && !NUMBERS_BASE.has(token)
    }), stopWords);

    // 5. Return both the token list and normalized text
    return {"tokens": tokens, "normalized": tokens.join(' ')};
}

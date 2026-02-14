
import { normalizeIngredientInput } from './normalize.js';
import { findCanonicalMatch } from './compute_similarity.js';

export const rawIngredientToCanonicalPipeline = (rawInputText, canonicalCandidates) => {
  
  console.log(`In ingredient pipeline for input text: ${rawInputText}`)
  // 1. Normalize the input text according to standard set of rules -> see ./normalize.js
  const { tokens, normalized } = normalizeIngredientInput(rawInputText);
  
  console.log(normalized)
  // 2. Search candidate list for a match, applying a few hierarchical similarity checks
  const matchObject = findCanonicalMatch(tokens, normalized, canonicalCandidates);

  // 3. If no match is found, the matchId in this matchObject will be null
  return matchObject;
  
}

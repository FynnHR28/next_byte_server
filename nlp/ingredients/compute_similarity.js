import natural from 'natural';


const ngrams = (str) => {
  const grams = new Set();
  for (let i = 0; i <= str.length - 3; i++) {
    grams.add(str.slice(i, i + 3));
  }
  return grams;
};

const jaccardSimilarity = (a, b, n) => {
  const A = ngrams(a, n);
  const B = ngrams(b, n);

  let intersection = 0;
  for (const g of A) {
    if (B.has(g)) intersection++;
  }


  const union = A.size + B.size - intersection;
  return union === 0 ? 0 : intersection / union;
};



export const findCanonicalMatch = (tokens, normalizedText, matchCandidates) => {

    // 0. an exact match exists, return it
    if(matchCandidates[normalizedText]) return { "matchId": matchCandidates[normalizedText], "matchedText": normalizedText, "matchType": "exact"};

    const matchCandidatesList = Object.keys(matchCandidates);
    
    // 1. iterate through all candidates and keep track of the highest jaccardSimilarity score. If >= 0.45 (strong match), return 
    let bestNGramScore = {
        "key": null,
        "score": 0,
        "text": null
    }
    matchCandidatesList.forEach((candidate) => {
        const nscore = jaccardSimilarity(normalizedText, candidate, 3);
        if(nscore > bestNGramScore.score) bestNGramScore = {"key": matchCandidates[candidate], "score": nscore, "text": candidate};
    });
    
    if(bestNGramScore.score >= 0.45) return {"matchId": bestNGramScore.key, "matchText": bestNGramScore.text, "type": "ngramsimilarity"};

    // 2. Iterate through all candidates and keep track of the best edit distance, compensating for candidate length

    let bestEdit = {
        "key": null,
        "distance": Infinity,
        "text": null
    };

    matchCandidatesList.forEach((candidate) => {
        const dist = natural.LevenshteinDistance(normalizedText, candidate)
        const maxAllowed = Math.min(1, Math.floor(candidate.length * 0.25));
        if (dist <= maxAllowed && dist < bestEdit.distance) bestEdit = { "key": matchCandidates[candidate], "distance": dist, "text": candidate}
    });
  
    if(bestEdit.key) return { "matchId": bestEdit.key, "matchedText": bestEdit.text, "matchType": "levenshtein"};
        
    

    // 3. TODO: Lighweight LLM fall back only used with a high confidence score ( >= 0.9 )? 

    // 4. No match, do not assign a canonical ingredient id (not the end of the world, could be reviewed by admin by quering recipe_ingredient where master_ingredient_id is null)
    return { "matchId": null, "matchedText": null, "matchType": "None"}


}
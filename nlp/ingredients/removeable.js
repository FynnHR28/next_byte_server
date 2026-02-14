// Hardcoded ruleset of known strings that can be removed without concern of altering the underlying base ingredient
const KNOWN_UNITS_BASE = new Set([
  'lbs',
  'gram',
  'lb',
  'pound',
  'teaspoon',
  'tsp',
  'tblsp',
  'tablespoon',
  'cup',
  'liter',
  'pint',
  'gallon',
  'oz',
  'ounce',
  'kg',
  'kilogram',
  'ton',
  'box',
  'boxes',
  'glass',
  'glasses',
  'handful',
  'pinch',
  'pinches',
  'package',
  'bag',
  'pkg',
])


export const KNOWN_UNITS = new Set(
  Array.from(KNOWN_UNITS_BASE).map((unit) => {
    return [unit, unit + 's']
  }).flat()
);

export const NUMBERS_BASE = new Set([
  // 0–19
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',

  // tens
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',

  // large bases
  'hundred',
  'thousand',
  'million',
  'billion',
  'trillion',

  // fractions (singular)
  'half',
  'third',
  'quarter',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',

  // fractions (plural)
  'halves',
  'thirds',
  'quarters',
  'fourths',
  'fifths',
  'sixths',
  'sevenths',
  'eighths',
  'ninths',
  'tenths',
])

export const PREP_PHRASES = new Set([
  'to taste',
  'as needed',
  'for garnish',
  'for serving',
  'patted dry',
  'room temperature',
  'extra virgin'
]);

export const PREP_WORDS = new Set([
  // Cutting / shape
  'chopped',
  'prepared',
  'quartered',
  'blended',
  'mashed',
  'zested',
  'diced',
  'minced',
  'sliced',
  'julienned',
  'shredded',
  'grated',
  'crushed',
  'cubed',
  'halved',
  'quartered',

  // State / condition
  'fresh',
  'frozen',
  'thawed',
  'raw',
  'cooked',
  'uncooked',
  'ripe',
  'unripe',
  'dried',
  'grilled',

  // Processing
  'peeled',
  'seeded',
  'deveined',
  'trimmed',
  'washed',
  'rinsed',
  'drained',

  // Size / count
  'small',
  'medium',
  'large',
  'whole',

  // Packaging / form
  'canned',
  'jarred',
  'bottled',
  'packaged',

  // Noise
  'optional'
]);
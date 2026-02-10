// Content filter to block inappropriate search queries and results
// This helps protect kids from accessing or requesting inappropriate content

// Whitelist of allowed terms that might contain blocked keywords
const ALLOWED_TERMS = [
  'harry potter',
  'potter',
  'potterhead',
  'assassin',
  'assassination',
  'classic',
  'classical',
  'bass',
  'bassist',
  'brass',
  'grass',
  'glass',
  'class',
  'mass',
  'pass',
  'password',
  'compass',
  'fantastic',
  'bombastic',
  'cocomelon', // Kids channel
  'bluey',
  'paw patrol',
];

const INAPPROPRIATE_KEYWORDS = [
  // Explicit sexual terms
  'sex', 'sexy', 'porn', 'xxx', 'nude', 'naked', 'erotic', 'nsfw',
  'dildo', 'vibrator', 'orgasm', 'masturbat', 'horny', 'boner',
  'stripper', 'strip', 'prostitut', 'hooker', 'pimp',

  // Sexual body parts and variations
  'boob', 'breast', 'tit', 'nipple', 'areola',
  'penis', 'dick', 'cock', 'phallus', 'shaft', 'balls', 'testicle', 'scrotum',
  'vagina', 'pussy', 'cunt', 'vulva', 'labia', 'clitoris',
  'anus', 'butthole', 'rectum',
  'butt', 'ass', 'booty', 'rear', 'bottom', 'bum',
  'genitalia', 'genital', 'privates',

  // Profanity and vulgar terms
  'fuck', 'shit', 'bitch', 'damn', 'hell', 'crap', 'piss',
  'whore', 'slut', 'bastard', 'fag',

  // Drug references
  'cocaine', 'heroin', 'meth', 'crack', 'weed', 'marijuana', 'drugs',
  'molly', 'ecstasy', 'lsd', 'acid', 'shrooms', 'cannabis', 'pot',
  'drunk', 'beer', 'vodka', 'whiskey', 'alcohol',

  // Violence
  'kill', 'murder', 'death', 'blood', 'gore', 'violent', 'suicide',
  'shoot', 'gun', 'weapon', 'knife', 'stab',

  // Sexual orientation terms that might be used inappropriately
  'lesbian', 'gay', 'queer', 'bisexual',

  // Other inappropriate
  'demon', 'satanic', 'devil', '666', 'witch', 'occult'
];

/**
 * Check if text contains inappropriate content
 * @param {string} text - Text to check
 * @returns {Object|null} - { matched: true, keyword: string } if inappropriate content detected, null otherwise
 */
export function containsInappropriateContent(text) {
  if (!text) return null;

  const lowerText = text.toLowerCase();

  // Check whitelist first - if text contains an allowed term, don't block it
  for (const allowedTerm of ALLOWED_TERMS) {
    if (lowerText.includes(allowedTerm)) {
      return null;
    }
  }

  // Check for exact word matches (with word boundaries)
  for (const keyword of INAPPROPRIATE_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\w*\\b`, 'i');
    if (regex.test(lowerText)) {
      console.log(`[ContentFilter] Blocked due to keyword: "${keyword}" in "${text}"`);
      return { matched: true, keyword };
    }
  }

  return null;
}

/**
 * Filter video search results to remove inappropriate content
 * @param {Array} results - Array of video search results
 * @returns {Array} - Filtered results
 */
export function filterVideoResults(results) {
  if (!results || !Array.isArray(results)) return results;

  return results.filter(item => {
    // Check video title
    if (containsInappropriateContent(item.title)) {
      return false;
    }

    // Check channel name
    if (containsInappropriateContent(item.channelTitle)) {
      return false;
    }

    // Check description if available
    if (containsInappropriateContent(item.description)) {
      return false;
    }

    // Block age-restricted content
    if (item.ageRestricted) {
      console.log(`[ContentFilter] Blocked age-restricted: "${item.title}"`);
      return false;
    }

    return true;
  });
}

/**
 * Filter channel search results to remove inappropriate content
 * @param {Array} results - Array of channel search results
 * @returns {Array} - Filtered results
 */
export function filterChannelResults(results) {
  if (!results || !Array.isArray(results)) return results;

  return results.filter(item => {
    // Check channel name
    if (containsInappropriateContent(item.channelTitle)) {
      return false;
    }

    // Check description if available
    if (containsInappropriateContent(item.description)) {
      return false;
    }

    return true;
  });
}

/**
 * Validate a search query before sending to YouTube
 * @param {string} query - Search query to validate
 * @returns {Object} - {isValid: boolean, message: string, blockedKeyword?: string}
 */
export function validateSearchQuery(query) {
  if (!query || query.trim().length === 0) {
    return { isValid: false, message: 'Please enter a search term' };
  }

  const result = containsInappropriateContent(query);
  if (result) {
    return {
      isValid: false,
      message: 'This search contains inappropriate content. Please search for something else.',
      blockedKeyword: result.keyword
    };
  }

  return { isValid: true, message: '' };
}

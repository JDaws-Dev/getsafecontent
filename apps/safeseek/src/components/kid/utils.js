// Curiosity prompts shown on the empty search box.
// Apr 2026: split by age tier — the empty state is the most important
// "default action" surface in the app. Make curiosity the default, not
// aesthetic browsing.

const SUGGESTIONS_YOUNG = [
  // ages 4-7: simple, sensory, animal/nature
  'Why do cats purr?',
  'How do bees make honey?',
  'What makes rainbows appear?',
  'Why is the sky blue?',
  'How do plants grow?',
  'What do penguins eat?',
  'How does the moon glow?',
  'Why do leaves change color?',
  'What is the biggest animal?',
  'How do birds fly?',
  'Why do we sneeze?',
  'How do fireflies light up?',
];

const SUGGESTIONS_MID = [
  // ages 8-11: mechanism, "how things work"
  'How do volcanoes erupt?',
  'How do airplanes fly?',
  'What are black holes?',
  'How do computers work?',
  'Why do we have seasons?',
  'How do fish breathe underwater?',
  'How do magnets work?',
  'What are dinosaurs?',
  'What is electricity?',
  'What causes earthquakes?',
  'How do submarines float?',
  'What is the solar system?',
  'How does GPS know where you are?',
  'Why do oceans have tides?',
  'How do bridges hold so much weight?',
];

const SUGGESTIONS_OLDER = [
  // ages 12+: bigger questions, history/science depth
  'How does the immune system work?',
  'What started World War 1?',
  'How does the stock market work?',
  'What is the theory of relativity?',
  'How do vaccines actually work?',
  'Why do empires fall?',
  'How does encryption keep messages secret?',
  'What is dark matter?',
  'How does CRISPR gene editing work?',
  'What caused the Great Depression?',
  'How does the brain form memories?',
  'How do nuclear reactors work?',
  'Why do some volcanoes have lava and others have ash?',
  'How does climate change affect ocean currents?',
  'What is consciousness?',
];

// Generic export — used when age is unknown. Older list at the front so
// the dominant flavor is "real questions" not "kindergarten."
export const SUGGESTIONS = [
  ...SUGGESTIONS_OLDER,
  ...SUGGESTIONS_MID,
  ...SUGGESTIONS_YOUNG,
];

/**
 * Pick N curiosity prompts appropriate to the kid's age range.
 * Always returns shuffled. Falls back to the full pool if age unknown.
 */
export function pickCuriosityPrompts(ageRange, count = 8) {
  const min = ageRange?.min ?? 8;
  let pool;
  if (min <= 7) pool = SUGGESTIONS_YOUNG;
  else if (min <= 11) pool = [...SUGGESTIONS_MID, ...SUGGESTIONS_YOUNG.slice(0, 3)];
  else pool = [...SUGGESTIONS_OLDER, ...SUGGESTIONS_MID.slice(0, 4)];
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}

export const SEARCH_COOLDOWN_MS = 2000;

// Check if browser supports speech recognition
export const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

// Get Tailwind color class
export function getColorClass(color) {
  const colors = {
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    blue: 'bg-accent-500',
    purple: 'bg-accent-500',
    pink: 'bg-accent-500',
    gray: 'bg-gray-500',
    cyan: 'bg-accent-500',
    teal: 'bg-teal-500',
  };
  return colors[color] || 'bg-accent-500';
}

// Personality emoji per profile color — matches SafeReads so a kid's avatar feels
// consistent across Safe Family apps.
export const AVATAR_ICONS = {
  red: '\uD83D\uDC32',     // dragon
  orange: '\uD83E\uDD81',  // lion
  yellow: '\u26A1',         // lightning
  green: '\uD83E\uDD89',   // owl
  blue: '\uD83D\uDE80',    // rocket
  purple: '\u2B50',         // star
  pink: '\uD83E\uDD84',    // unicorn
  gray: '\uD83D\uDC3E',    // paw prints
  cyan: '\uD83D\uDC2C',    // dolphin
  teal: '\uD83C\uDF3F',    // herb
};

export function getAvatarIcon(color) {
  return AVATAR_ICONS[color] || AVATAR_ICONS.blue;
}

// Left-border color mapping for section cards
export function getBorderColorClass(index) {
  const borders = [
    'border-l-violet-500',
    'border-l-accent-500',
    'border-l-teal-500',
    'border-l-orange-500',
    'border-l-accent-500',
  ];
  return borders[index % borders.length];
}

// Age range label helper
export function getAgeLabel(profile) {
  if (profile.ageRange) {
    return profile.ageRange.min === profile.ageRange.max
      ? `Age ${profile.ageRange.min}`
      : `Ages ${profile.ageRange.min}-${profile.ageRange.max}`;
  }
  if (profile.age) return `Age ${profile.age}`;
  return null;
}

// Strip markdown from AI responses
export function stripMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/#{1,6}\s/g, '')        // headings
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1')     // italic
    .replace(/__([^_]+)__/g, '$1')     // bold alt
    .replace(/_([^_]+)_/g, '$1')       // italic alt
    .replace(/`([^`]+)`/g, '$1')       // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/^[-*]\s/gm, '')          // list items
    .trim();
}

// Site Color Mapping for Research Cards
export const SITE_COLORS = {
  'nasa.gov': { bg: '#1B3A7A', text: 'white', accent: '#3B6FD4' },
  'nationalgeographic.com': { bg: '#FFCC00', text: '#1a1a1a', accent: '#E6B800' },
  'britannica.com': { bg: '#0A2240', text: 'white', accent: '#1A4270' },
  'smithsonianmag.com': { bg: '#B91C1C', text: 'white', accent: '#DC2626' },
  'sciencekids.co.nz': { bg: '#059669', text: 'white', accent: '#10B981' },
  'natgeokids.com': { bg: '#F59E0B', text: '#1a1a1a', accent: '#D97706' },
  'dkfindout.com': { bg: '#7C3AED', text: 'white', accent: '#8B5CF6' },
  'khanacademy.org': { bg: '#14BF96', text: 'white', accent: '#10D4A6' },
  'pbs.org': { bg: '#1B5299', text: 'white', accent: '#2563EB' },
};

export function getResearchSiteColors(domain) {
  return SITE_COLORS[domain] || { bg: '#4B5563', text: 'white', accent: '#6B7280' };
}

export function formatHour(hour) {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

export function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return '';
}

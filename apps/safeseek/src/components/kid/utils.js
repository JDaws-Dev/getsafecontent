// Fun placeholder suggestions for kids
export const SUGGESTIONS = [
  'How do volcanoes erupt?',
  'What is the biggest animal?',
  'How do airplanes fly?',
  'Why is the sky blue?',
  'How do plants grow?',
  'What are black holes?',
  'How do computers work?',
  'Why do we have seasons?',
  'What is the solar system?',
  'How do fish breathe underwater?',
  'What makes rainbows appear?',
  'How do magnets work?',
  'What are dinosaurs?',
  'How does the moon glow?',
  'Why do cats purr?',
  'What is electricity?',
  'How do birds fly?',
  'What causes earthquakes?',
];

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
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    gray: 'bg-gray-500',
    cyan: 'bg-cyan-500',
    teal: 'bg-teal-500',
  };
  return colors[color] || 'bg-blue-500';
}

// Left-border color mapping for section cards
export function getBorderColorClass(index) {
  const borders = [
    'border-l-violet-500',
    'border-l-blue-500',
    'border-l-teal-500',
    'border-l-orange-500',
    'border-l-pink-500',
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

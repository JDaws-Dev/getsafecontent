// Small pieces every parent-dashboard screen uses: kid colors and avatars,
// the kid picker, date labels, subject labels. Kept here so the dashboard page
// and the screens under components/admin agree on what a kid looks like.

// Color utility - maps profile color names to Tailwind classes
export const COLOR_MAP = {
  red: { bg: 'bg-red-500', light: 'bg-red-50', text: 'text-red-600' },
  orange: { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-600' },
  yellow: { bg: 'bg-yellow-500', light: 'bg-yellow-50', text: 'text-yellow-600' },
  green: { bg: 'bg-green-500', light: 'bg-green-50', text: 'text-green-600' },
  blue: { bg: 'bg-accent-500', light: 'bg-accent-50', text: 'text-accent-600' },
  cyan: { bg: 'bg-cyan-500', light: 'bg-cyan-50', text: 'text-cyan-600' },
  purple: { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-600' },
  pink: { bg: 'bg-pink-500', light: 'bg-pink-50', text: 'text-pink-600' },
  teal: { bg: 'bg-teal-500', light: 'bg-teal-50', text: 'text-teal-600' },
  gray: { bg: 'bg-gray-400', light: 'bg-gray-50', text: 'text-gray-600' },
};

export function getColor(colorName) {
  return COLOR_MAP[colorName] || COLOR_MAP.blue;
}

export function KidAvatar({ name, color, size = 'md' }) {
  const initial = (name || '?')[0].toUpperCase();
  const c = getColor(color);
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-xl',
    xl: 'w-14 h-14 text-2xl',
  };

  return (
    <div
      className={`${sizeClasses[size]} ${c.bg} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

/**
 * A row of kid buttons. The same picker sits at the top of the Family, Week
 * and Tutor screens so a parent who picks Bella on one screen still has Bella
 * on the next.
 */
export function KidPicker({ kidProfiles, selectedKidId, onSelect, label = 'Choose a kid' }) {
  if (!kidProfiles || kidProfiles.length === 0) return null;
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {kidProfiles.map((kid) => {
        const active = kid._id === selectedKidId;
        return (
          <button
            key={kid._id}
            type="button"
            onClick={() => onSelect(kid._id)}
            aria-pressed={active}
            className={`inline-flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full border text-sm font-medium transition ${
              active
                ? 'bg-accent-500 border-accent-500 text-white shadow-sm'
                : 'bg-white border-gray-200 text-gray-700 hover:border-accent-300 hover:bg-accent-50'
            }`}
          >
            <KidAvatar name={kid.name} color={kid.color} size="sm" />
            {kid.name}
          </button>
        );
      })}
    </div>
  );
}

export const SUBJECTS = [
  { id: 'math', label: 'Math' },
  { id: 'science', label: 'Science' },
  { id: 'history', label: 'History' },
  { id: 'reading', label: 'Reading' },
  { id: 'writing', label: 'Writing' },
  { id: 'bible', label: 'Bible' },
  { id: 'custom', label: 'Something else' },
];

export function subjectLabel(id) {
  const found = SUBJECTS.find((s) => s.id === id);
  if (found) return found.label;
  if (!id) return 'Lesson';
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export const WEEKDAYS = [
  { value: 0, short: 'Sun', long: 'Sunday' },
  { value: 1, short: 'Mon', long: 'Monday' },
  { value: 2, short: 'Tue', long: 'Tuesday' },
  { value: 3, short: 'Wed', long: 'Wednesday' },
  { value: 4, short: 'Thu', long: 'Thursday' },
  { value: 5, short: 'Fri', long: 'Friday' },
  { value: 6, short: 'Sat', long: 'Saturday' },
];

/** "YYYY-MM-DD" (a family-timezone day key) to a local Date at noon. */
export function dayKeyToDate(dayKey) {
  if (!dayKey) return null;
  const [y, m, d] = dayKey.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0);
}

/** "Mon, Sep 8" */
export function formatDayKey(dayKey, opts = {}) {
  const date = dayKeyToDate(dayKey);
  if (!date) return dayKey || '';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...opts,
  });
}

/** "September 2 to September 8, 2026" */
export function formatDayRange(from, to) {
  const a = dayKeyToDate(from);
  const b = dayKeyToDate(to);
  if (!a || !b) return '';
  const sameYear = a.getFullYear() === b.getFullYear();
  const start = a.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const end = b.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  return `${start} to ${end}`;
}

export function formatTimestamp(ts) {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDateTime(ts) {
  return new Date(ts).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatTime(ts) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** "1 lesson" / "4 lessons" */
export function plural(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="text-center py-14 px-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
      {Icon && <Icon className="w-12 h-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {children && <div className="text-gray-500 max-w-md mx-auto text-sm leading-relaxed">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export const primaryButton =
  'inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 disabled:bg-accent-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm';
export const secondaryButton =
  'inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 px-4 py-2 rounded-xl text-sm font-medium transition';
export const inputClass =
  'w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-400';

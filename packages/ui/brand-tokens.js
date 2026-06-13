// ─────────────────────────────────────────────────────────────────────────
// CANONICAL Safe Family brand tokens — single source of truth.
//
// Decided 2026-06-12: each app has ONE canonical gradient, used everywhere
// (marketing hub chip, the app's own icon, kid login, cross-app switcher).
// The hub was reconciled to match the real app icons; SafeReads moved from
// an undecided green/purple/orange to a warm amber→sepia "bookish" identity.
//
// These are plain hex so they drop into inline styles, Tailwind arbitrary
// values, or CSS vars identically across Vite (Tailwind v3) and Next
// (Tailwind v4). When you change a value here, update:
//   • packages/ui/SafeFamilySwitcher.jsx  (then run the sync script)
//   • sites/marketing/src/components/landing/AppCards.tsx  (hub chips)
//   • the app's own login icon / accent
// ─────────────────────────────────────────────────────────────────────────

export const BRAND = {
  safetunes: { name: 'SafeTunes', tagline: 'Music', from: '#9333ea', to: '#ec4899' }, // purple → pink
  safetube: { name: 'SafeTube', tagline: 'Video', from: '#ef4444', to: '#f97316' }, // red → orange
  safereads: { name: 'SafeReads', tagline: 'Books', from: '#f59e0b', to: '#b45309' }, // amber → sepia
  safestudy: { name: 'SafeStudy', tagline: 'Search', from: '#3b82f6', to: '#06b6d4' }, // blue → cyan
  safespark: { name: 'SafeSpark', tagline: 'Build', from: '#7c3aed', to: '#d946ef' }, // violet → fuchsia
};

export const BRAND_ORDER = ['safetunes', 'safetube', 'safereads', 'safestudy', 'safespark'];

// ─────────────────────────────────────────────────────────────────────────
// CANONICAL SOURCE — Safe Family cross-app switcher.
//
// One shared "jump to our other apps" strip for every kid-facing surface
// across all 5 Safe Family apps (SafeTunes / SafeTube / SafeReads /
// SafeStudy / SafeSpark). Replaces the five divergent emoji strips that
// each app grew on its own.
//
// Design intent (matches the marketing hub, getsafefamily.com):
//   • real brand-icon chips (gradient rounded squares + white glyph),
//     NOT emoji — so a kid recognizes the same mark they see everywhere
//   • app NAMES + one-word taglines, consistent order, every app
//   • carries the family code via ?fc=XXXXXX so the destination app
//     skips the code screen — one-tap switching, no re-typing
//
// Portability: plain React, inline styles (hex, not Tailwind classes, so
// it renders identically under Tailwind v3 AND v4), and plain cross-domain
// <a> tags (no next/link or react-router dependency). Drop the SAME file
// into any app — Vite or Next — at src/components/SafeFamilySwitcher.jsx.
//
// To change the catalog (colors, names, order), edit THIS file in
// packages/ui/ and re-run scripts/sync-safe-family-switcher.mjs.
// ─────────────────────────────────────────────────────────────────────────

// Canonical app catalog. Gradients mirror the marketing hub's AppCards.
const APPS = [
  {
    id: 'safetunes',
    name: 'SafeTunes',
    tagline: 'Music',
    host: 'https://getsafetunes.com',
    path: '/play',
    from: '#6366f1', // indigo-500
    to: '#a855f7', // purple-500
    glyph: 'music',
  },
  {
    id: 'safetube',
    name: 'SafeTube',
    tagline: 'Video',
    host: 'https://getsafetube.com',
    path: '/play',
    from: '#ef4444', // red-500
    to: '#f97316', // orange-500
    glyph: 'play',
  },
  {
    id: 'safereads',
    name: 'SafeReads',
    tagline: 'Books',
    host: 'https://getsafereads.com',
    path: '/read',
    from: '#10b981', // emerald-500
    to: '#14b8a6', // teal-500
    glyph: 'book',
  },
  {
    id: 'safestudy',
    name: 'SafeStudy',
    tagline: 'Search',
    host: 'https://getsafestudy.com',
    path: '/play',
    from: '#3b82f6', // blue-500
    to: '#06b6d4', // cyan-500
    glyph: 'search',
  },
  {
    id: 'safespark',
    name: 'SafeSpark',
    tagline: 'Build',
    host: 'https://getsafespark.com',
    path: '/make',
    from: '#f59e0b', // amber-500
    to: '#8b5cf6', // violet-500
    glyph: 'spark',
  },
];

// White brand glyphs, 24x24, currentColor-free (always white on the chip).
const GLYPHS = {
  music: 'M9 17V5l10-2v12M9 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm10-2a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
  play: null, // play uses a filled triangle, rendered separately
  book: 'M4 5a2 2 0 0 1 2-2h9a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2V5Zm0 0a2 2 0 0 0 2 2h10',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35',
  spark: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z',
};

function Glyph({ name }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'white',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  if (name === 'play') {
    return (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="white" aria-hidden="true">
        <path d="M7 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 7 5.5Z" />
      </svg>
    );
  }
  if (name === 'spark') {
    return (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="white" aria-hidden="true">
        <path d={GLYPHS.spark} />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden="true">
      <path d={GLYPHS[name]} />
    </svg>
  );
}

export function normalizeFamilyCode(input) {
  return (input || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export function appHref(app, familyCode) {
  const fc = normalizeFamilyCode(familyCode);
  const suffix = fc.length === 6 ? `?fc=${fc}` : '';
  return `${app.host}${app.path}${suffix}`;
}

/**
 * @param {object}  props
 * @param {string}  props.current      app id to exclude (e.g. "safetunes")
 * @param {string=} props.familyCode   6-char code; if present, passed via ?fc=
 */
export default function SafeFamilySwitcher({ current, familyCode }) {
  const others = APPS.filter((a) => a.id !== current);
  return (
    <div style={{ width: '100%', maxWidth: 440, margin: '0 auto' }}>
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#94a3b8',
          textAlign: 'center',
          margin: '0 0 14px',
        }}
      >
        Other Safe Family apps
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${others.length}, minmax(0, 1fr))`,
          gap: 4,
        }}
      >
        {others.map((a) => (
          <a
            key={a.id}
            href={appHref(a, familyCode)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: '10px 4px',
              borderRadius: 14,
              textDecoration: 'none',
              transition: 'transform 0.12s ease, background 0.12s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <span
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${a.from}, ${a.to})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(15,23,42,0.18)',
              }}
            >
              <Glyph name={a.glyph} />
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#334155', lineHeight: 1 }}>
              {a.name}
            </span>
            <span style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1 }}>{a.tagline}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

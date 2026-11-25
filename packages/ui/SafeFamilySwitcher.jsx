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
// Every app now lives under getsafefamily.com (kid pages at /play/<app>,
// parent pages at /dashboard/<app>); the old per-app domains are retired.
// Links use target="_top" because the hub's /play page shows each app inside
// an iframe — without it, switching apps would nest the hub inside itself.
//
// Portability: plain React, inline styles (hex, not Tailwind classes, so
// it renders identically under Tailwind v3 AND v4), and plain cross-domain
// <a> tags (no next/link or react-router dependency). Drop the SAME file
// into any app — Vite or Next — at src/components/SafeFamilySwitcher.jsx.
//
// To change the catalog (colors, names, order), edit THIS file in
// packages/ui/ and re-run scripts/sync-safe-family-switcher.mjs.
// ─────────────────────────────────────────────────────────────────────────

// Retired apps (2026-11-25): never shown in any switcher. This is the switch
// for the kept apps' switchers; remove an id here (and from RETIRED_APPS in
// sites/marketing/src/lib/retiredApps.ts), re-run the sync script and
// redeploy to bring an app back.
const RETIRED_APPS = ['safereads', 'safespark'];

// Canonical app catalog. Colors are the locked brand palette — keep in
// sync with packages/ui/brand-tokens.js and the hub's AppCards.tsx.
const ALL_APPS = [
  {
    id: 'safetunes',
    name: 'SafeTunes',
    tagline: 'Music',
    host: 'https://getsafefamily.com',
    path: '/play/tunes',
    from: '#9333ea', // purple
    to: '#ec4899', // pink
    accent: '#7C4DE0', // glow-up: grape
    glyph: 'music',
  },
  {
    id: 'safetube',
    name: 'SafeTube',
    tagline: 'Video',
    host: 'https://getsafefamily.com',
    path: '/play/tube',
    from: '#ef4444', // red
    to: '#f97316', // orange
    accent: '#F0603A', // glow-up: coral
    glyph: 'play',
  },
  {
    id: 'safereads',
    name: 'SafeReads',
    tagline: 'Books',
    host: 'https://getsafefamily.com',
    path: '/play/reads',
    from: '#f59e0b', // amber
    to: '#b45309', // sepia
    accent: '#3AA06B', // glow-up: leaf green
    glyph: 'book',
  },
  {
    id: 'safestudy',
    name: 'SafeStudy',
    tagline: 'Search',
    host: 'https://getsafefamily.com',
    path: '/play/study',
    from: '#3b82f6', // blue
    to: '#06b6d4', // cyan
    accent: '#2F6BF0', // glow-up: cobalt
    glyph: 'search',
  },
  {
    id: 'safespark',
    name: 'SafeSpark',
    tagline: 'Build',
    host: 'https://getsafefamily.com',
    path: '/play/spark',
    from: '#7c3aed', // violet
    to: '#d946ef', // fuchsia
    accent: '#F2A413', // glow-up: amber
    glyph: 'spark',
  },
];
const APPS = ALL_APPS.filter((a) => !RETIRED_APPS.includes(a.id));

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

export function appHref(app, familyCode, kidToken) {
  const fc = normalizeFamilyCode(familyCode);
  const params = [];
  if (fc.length === 6) params.push(`fc=${fc}`);
  // Short-lived "kid pass" — lets the destination drop the kid straight onto
  // their dashboard without re-entering the PIN (see signKidPass in safeAuth).
  if (kidToken) params.push(`kt=${encodeURIComponent(kidToken)}`);
  return `${app.host}${app.path}${params.length ? `?${params.join('&')}` : ''}`;
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
            target="_top"
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

/**
 * Compact header switcher — a tight row of solid glow-up-accent tiles for the
 * OTHER apps, meant to live in an always-visible app header (kid or parent).
 * Pure inline styles → portable to any app; the CALLER controls responsive
 * show/hide (wrap in `hidden lg:flex` for desktop, `lg:hidden` for a mobile row).
 *
 * @param {object}  props
 * @param {string}  props.current      app id to exclude (e.g. "safetunes")
 * @param {string=} props.familyCode   6-char code; if present, passed via ?fc=
 * @param {string=} props.kidToken     short-lived kid pass; if present, passed via ?kt=
 *                                      so the destination skips profile-pick + PIN
 * @param {boolean=} props.showLabel   show the "Safe Family" label (default true)
 * @param {number=}  props.tile        tile size in px (default 36)
 */
export function SafeFamilyHeaderSwitcher({ current, familyCode, kidToken, showLabel = true, tile = 36 }) {
  const others = APPS.filter((a) => a.id !== current);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {showLabel && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#94a3b8',
            marginRight: 2,
            whiteSpace: 'nowrap',
          }}
        >
          Safe Family
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {others.map((a) => (
          <a
            key={a.id}
            href={appHref(a, familyCode, kidToken)}
            target="_top"
            title={`Go to ${a.name}`}
            aria-label={`Go to ${a.name}`}
            style={{
              width: tile,
              height: tile,
              borderRadius: 12,
              background: a.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(15,23,42,0.18)',
              textDecoration: 'none',
              flex: 'none',
              transition: 'transform 0.12s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
            }}
          >
            <Glyph name={a.glyph} />
          </a>
        ))}
      </div>
    </div>
  );
}

// ─────────────────── Parent: cross-app switcher (parent dashboards) ───────────
// Same tiles as the kid header switcher, but links point at each app's PARENT
// dashboard (not the kid player). Carries the family code via ?fc= today; the
// short-lived auto-login token rides as ?pt= once supplied (parentToken prop) —
// the destination stores it as its <app>_jwt so the parent lands signed in.
const PARENT_PATHS = {
  safetunes: '/dashboard/tunes',
  safetube: '/dashboard/tube',
  safereads: '/dashboard/reads',
  safestudy: '/dashboard/study',
  safespark: '/dashboard/spark',
};

export function appHrefParent(app, familyCode, parentToken) {
  const fc = normalizeFamilyCode(familyCode);
  const params = [];
  if (fc.length === 6) params.push(`fc=${fc}`);
  // parentToken is no longer put in the URL: every parent dashboard is now on
  // getsafefamily.com (same sign-in), and nothing reads ?pt=, so it would only
  // leak a live login token into browser history.
  void parentToken;
  const path = PARENT_PATHS[app.id] || '/dashboard';
  return `${app.host}${path}${params.length ? `?${params.join('&')}` : ''}`;
}

/**
 * Parent-dashboard cross-app switcher — renders the OTHER apps' tiles linking to
 * their parent dashboards. Caller controls responsive show/hide.
 *
 * @param {object}   props
 * @param {string}   props.current      app id to exclude
 * @param {string=}  props.familyCode   6-char code; passed via ?fc=
 * @param {string=}  props.parentToken  short-lived parent SSO token; passed via ?pt=
 * @param {boolean=} props.showLabel    show the "Safe Family" label (default true)
 * @param {number=}  props.tile         tile size px (default 36)
 */
export function SafeFamilyParentSwitcher({ current, familyCode, parentToken, showLabel = true, tile = 36 }) {
  const others = APPS.filter((a) => a.id !== current);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {showLabel && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#94a3b8',
            marginRight: 2,
            whiteSpace: 'nowrap',
          }}
        >
          Safe Family
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {others.map((a) => (
          <a
            key={a.id}
            href={appHrefParent(a, familyCode, parentToken)}
            target="_top"
            title={`Go to ${a.name}`}
            aria-label={`Go to ${a.name}`}
            style={{
              width: tile,
              height: tile,
              borderRadius: 12,
              background: a.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(15,23,42,0.18)',
              textDecoration: 'none',
              flex: 'none',
              transition: 'transform 0.12s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
            }}
          >
            <Glyph name={a.glyph} />
          </a>
        ))}
      </div>
    </div>
  );
}

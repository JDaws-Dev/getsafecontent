import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SafeSpark — a safe way for kids to build with AI';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Safe Family glow-up: cream ground, brand-navy type, ONE amber accent.
// No gradient washes, no gradient-clipped text, no emoji.
const CREAM = '#FBF6EF';
const NAVY = '#221D2E';
const INK_SOFT = '#6A6275';
const ACCENT = '#F2A413';
const ACCENT_50 = '#FEF6E7';
const ACCENT_200 = '#F9D68A';
const ACCENT_700 = '#B06E0C';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: CREAM,
          padding: '72px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '24px',
              background: ACCENT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 20px 40px rgba(242, 164, 19, 0.3)',
            }}
          >
            <svg
              width="46"
              height="46"
              viewBox="0 0 24 24"
              fill="none"
              stroke={NAVY}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
              <path d="M20 3v4" />
              <path d="M22 5h-4" />
              <path d="M4 17v2" />
              <path d="M5 18H3" />
            </svg>
          </div>
          <span style={{ fontSize: '52px', fontWeight: 800, color: NAVY }}>SafeSpark</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h1
            style={{
              fontSize: '92px',
              fontWeight: 800,
              lineHeight: 1,
              margin: 0,
              letterSpacing: '-0.03em',
              color: NAVY,
            }}
          >
            Build anything.
            <br />
            Safely. With AI.
          </h1>
          <p
            style={{
              fontSize: '32px',
              fontWeight: 600,
              color: INK_SOFT,
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            Games, flashcards, posters, tools — kids ages 10-13 talk to Spark and build instantly.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {['Games', 'Flashcards', 'Posters', 'Quizzes', 'AI restyle', 'Safe by default'].map(
            (label) => (
              <div
                key={label}
                style={{
                  padding: '12px 24px',
                  borderRadius: '999px',
                  background: ACCENT_50,
                  border: `2px solid ${ACCENT_200}`,
                  color: ACCENT_700,
                  fontSize: '24px',
                  fontWeight: 700,
                }}
              >
                {label}
              </div>
            ),
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}

import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'SafeSpark — a safe way for kids to build with AI';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

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
          background: 'linear-gradient(135deg, #f5f3ff 0%, #fdf2f8 50%, #fffbeb 100%)',
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
              background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 50%, #f59e0b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
              color: 'white',
              fontWeight: 900,
              boxShadow: '0 20px 40px rgba(124, 58, 237, 0.3)',
            }}
          >
            ⚡
          </div>
          <span
            style={{
              fontSize: '52px',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            SafeSpark
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h1
            style={{
              fontSize: '92px',
              fontWeight: 900,
              lineHeight: 1,
              margin: 0,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 50%, #f59e0b 100%)',
              backgroundClip: 'text',
              color: 'transparent',
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
              color: '#475569',
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            Games, flashcards, posters, tools — kids ages 10-13 talk to Spark and build instantly.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {['🎮 Games', '📇 Flashcards', '🎨 Posters', '🧠 Quizzes', '🎭 AI restyle', '🛡️ Safe by default'].map((label) => (
            <div
              key={label}
              style={{
                padding: '12px 24px',
                borderRadius: '999px',
                background: 'white',
                border: '2px solid #ddd6fe',
                color: '#6d28d9',
                fontSize: '24px',
                fontWeight: 700,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}

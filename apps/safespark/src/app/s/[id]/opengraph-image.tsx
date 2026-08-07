import { ImageResponse } from 'next/og';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

// Per-share OG image — replaces the generic site-wide SafeSpark OG
// when a /s/<shortId> link is unfurled in iMessage, Slack, Discord,
// Twitter, etc. Shows the actual project's title prominently instead
// of "Build anything. Safely. With AI."
//
// Why a styled card instead of an actual game screenshot? Server-side
// rendering Three.js scenes / WebGL canvases would require running a
// headless browser per OG request (heavy, slow, easy to time out).
// Satori (what next/og uses) can only render HTML/CSS — no canvas.
// The styled card with the project title + SafeSpark brand is the
// honest cheap win. If we want real game screenshots later, store them
// on the share row when the share is created (headless-browser the
// project, save the PNG to Convex storage, point this route at it).

export const runtime = 'edge';
export const alt = 'A kid-built project on SafeSpark';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Safe Family glow-up tokens — ONE amber accent on brand navy. No gradients,
// no emoji.
const NAVY = '#221D2E';
const ACCENT = '#F2A413';
const ACCENT_700 = '#B06E0C';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? '';

type Props = { params: Promise<{ id: string }> };

// Featured shares get a REAL game screenshot embedded in the OG card
// (way more compelling than a text card). Map of shortId → static
// screenshot path in /public/landing/. For unfeatured shares we fall
// through to the dynamic Satori card with the project title. Future:
// extend opsCreateShareForProject to capture a screenshot at share
// creation time and store the URL on the share row, then look it up
// here automatically.
const FEATURED_SCREENSHOTS: Record<string, string> = {
  'neighborhood-drive-p3pf': '/landing/build-neighborhood.png',
  'pok-mon-region-adventure-4k8k': '/landing/build-region-adventure.png',
  'blockcraft-builder-cw2w': '/landing/build-blockcraft.png',
};

export default async function Image({ params }: Props) {
  const { id } = await params;
  const featuredScreenshot = FEATURED_SCREENSHOTS[id];
  let title = 'A kid-built project';
  if (convexUrl) {
    try {
      const client = new ConvexHttpClient(convexUrl);
      const share = await client.query(api.safespark.getShare, { shortId: id });
      if (share?.title) title = share.title;
    } catch {
      /* fall back to default title */
    }
  }

  // Featured shares: render the actual game screenshot edge-to-edge
  // with a small "SafeSpark · <title>" overlay strip in the corner so
  // the share still has SafeSpark branding for context.
  if (featuredScreenshot) {
    const origin =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.VERCEL_URL ?
        `https://${process.env.VERCEL_URL}` :
        'https://getsafespark.com';
    const screenshotUrl = `${origin}${featuredScreenshot}`;
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            position: 'relative',
            background: NAVY,
          }}
        >
          <img
            src={screenshotUrl}
            alt={title}
            width={1200}
            height={630}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          {/* Branding strip — bottom-left pill with SafeSpark + title */}
          <div
            style={{
              position: 'absolute',
              bottom: 32,
              left: 32,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 22px',
              borderRadius: 999,
              background: 'rgba(34,29,46,0.85)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: ACCENT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
            <svg
              width="20"
              height="20"
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
            <span
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: 'white',
                letterSpacing: '-0.01em',
              }}
            >
              SafeSpark · {title}
            </span>
          </div>
        </div>
      ),
      { ...size },
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: NAVY,
          padding: '72px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: 'white',
        }}
      >
        {/* Top — SafeSpark brand chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: ACCENT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
            width="30"
            height="30"
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
          <span
            style={{
              fontSize: '32px',
              fontWeight: 900,
              color: 'rgba(255,255,255,0.92)',
              letterSpacing: '-0.01em',
            }}
          >
            SafeSpark
          </span>
        </div>

        {/* Middle — the project title, dominant */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <span
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}
          >
            Tap to play
          </span>
          <h1
            style={{
              fontSize: title.length > 30 ? '88px' : '120px',
              fontWeight: 900,
              lineHeight: 0.95,
              margin: 0,
              letterSpacing: '-0.04em',
              color: 'white',
              textShadow: '0 4px 30px rgba(0,0,0,0.3)',
            }}
          >
            {title}
          </h1>
        </div>

        {/* Bottom — kid attribution */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p
            style={{
              fontSize: '26px',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.88)',
              margin: 0,
            }}
          >
            Built by a kid talking to Spark.
          </p>
          <div
            style={{
              padding: '14px 28px',
              borderRadius: '999px',
              background: 'white',
              color: ACCENT_700,
              fontSize: '22px',
              fontWeight: 900,
              letterSpacing: '-0.01em',
            }}
          >
            getsafespark.com →
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}

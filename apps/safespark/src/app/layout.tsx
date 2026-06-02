import type { Metadata, Viewport } from 'next';
import { Quicksand } from 'next/font/google';
import './globals.css';
import { ConvexClientProvider } from '@/components/ConvexClientProvider';

// Viewport meta — was MISSING before 2026-05-29, which is THE actual
// cause of "still scrolls sideways on iPhone." Without this, iOS Safari
// renders the page at a 980px virtual viewport and scales down to fit
// the screen — so every "fix" for horizontal scroll (overflow-x:hidden
// on main, then on html/body, then iOS-specific overscroll tricks) was
// chasing a symptom while the root cause was that mobile Safari didn't
// know it was a mobile page at all. With width=device-width the viewport
// matches the screen and the existing overflow rules actually take effect.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#a855f7',
};

const quicksand = Quicksand({
  variable: '--font-quicksand',
  subsets: ['latin'],
});

const SITE_URL = 'https://getsafespark.com';
const SITE_NAME = 'SafeSpark';
const SITE_DESCRIPTION =
  'Kids ages 10-13 build games, flashcards, quizzes, posters, and tools with AI. Safe by default. Talk to Spark, watch the code, share what you made.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — a safe way for kids to build with AI`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'safe AI for kids',
    'AI maker for kids',
    'kids build with AI',
    'safe AI app for kids',
    'kid-friendly AI',
    'AI for ages 10-13',
    'family AI app',
    'SafeFamily',
    'SafeSpark',
    'no-code for kids',
  ],
  authors: [{ name: 'Safe Family', url: 'https://getsafefamily.com' }],
  creator: 'Safe Family',
  publisher: 'Safe Family',
  category: 'Education',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — a safe way for kids to build with AI`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'SafeSpark — a safe way for kids to build with AI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — a safe way for kids to build with AI`,
    description: SITE_DESCRIPTION,
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${quicksand.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--safefamily-cream)] text-[var(--safefamily-navy)] font-[family-name:var(--font-quicksand)]">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}

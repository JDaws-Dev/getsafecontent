import type { Metadata, Viewport } from 'next';
import { DemoWorkbench } from '../demo/DemoWorkbench';

// useSearchParams in DemoWorkbench requires dynamic rendering.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'SafeSpark — a safe way for kids to learn AI by building',
  description: 'Kids ages 10-13 build real games, flashcards, quizzes, tools, and posters with AI. Safe by default. Talk to Spark, watch the code, share what you made.',
};

// Disable pinch-zoom + pull-to-refresh on /make so iOS doesn't fight
// games running in the preview iframe (same fix shipped on /s/). The
// chat composer is short, accessibility cost is small, gain on mobile
// game play is large.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function SparkPage() {
  return <DemoWorkbench initialDemoCode="BELLA-BUILD" />;
}

import type { Metadata } from 'next';
import { DemoWorkbench } from '../demo/DemoWorkbench';

// DemoWorkbench uses useSearchParams() (for ?project=<id> and ?new=true
// from the dashboard). Next.js requires that to be wrapped in Suspense
// OR rendered dynamically. force-dynamic is simpler — kid-session state
// makes this page unprerenderable in practice anyway.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'SafeSpark — a safe way for kids to learn AI by building',
  description: 'Kids ages 10-13 build real games, flashcards, quizzes, tools, and posters with AI. Safe by default. Talk to Spark, watch the code, share what you made.',
};

export default function LumiPage() {
  return <DemoWorkbench initialDemoCode="BELLA-BUILD" />;
}

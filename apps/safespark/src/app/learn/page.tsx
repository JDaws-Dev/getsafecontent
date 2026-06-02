import type { Metadata } from 'next';
import { LearnLanding } from './LearnLanding';

export const metadata: Metadata = {
  title: 'SafeSpark — Learn',
  description: 'Short lessons that make every build you ship better.',
};

export default function LearnPage() {
  return <LearnLanding />;
}

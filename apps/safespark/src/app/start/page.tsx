import type { Metadata } from 'next';
import { KidLoginGate } from '@/components/kid/KidLoginGate';

export const metadata: Metadata = {
  title: 'SafeSpark — sign in',
};

/**
 * Legacy /start route — kept as a thin wrapper around <KidLoginGate>
 * so existing bookmarks and the "Pick my profile →" CTA on the marketing
 * banner keep working. The canonical kid entry route is now /make,
 * which embeds the same gate inline when there's no session.
 *
 * Mirrors the SafeTunes/SafeTube/SafeReads pattern: one URL handles
 * both "logged out → enter code" and "logged in → use the app."
 *
 * When the kid completes the gate from here, the gate's default
 * behavior pushes them to /make.
 */
export default function StartPage() {
  return <KidLoginGate />;
}

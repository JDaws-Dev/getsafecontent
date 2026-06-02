import type { Metadata } from 'next';
import { KidDashboard } from './KidDashboard';

export const metadata: Metadata = {
  title: 'SafeSpark — Home',
  description: 'Your projects, what you built today, and where to start something new.',
};

export default function DashboardPage() {
  return <KidDashboard />;
}

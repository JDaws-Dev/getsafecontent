'use client';

// Parent-area shell. One dashboard: opened directly (not inside the hub's
// dashboard iframe) every /parent page hands off to the hub's /dashboard/spark.
// Kid surfaces (/make, /start, /s/…) never pass through here.
import { useEffect } from 'react';
import { HUB_DASHBOARD, shouldRedirectToHubDashboard } from '@/lib/embed';

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (shouldRedirectToHubDashboard()) window.location.replace(HUB_DASHBOARD);
  }, []);
  return <>{children}</>;
}

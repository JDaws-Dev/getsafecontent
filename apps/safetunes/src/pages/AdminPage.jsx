import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { useConvexAuth } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../convex/_generated/api';
import AdminDashboard from '../components/admin/AdminDashboard';

function AdminPage() {
  const { isAuthenticated, isLoading: isPending } = useConvexAuth();
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const logAccessDenied = useMutation(api.subscriptionEvents.logAccessDenied);
  // Track if we should redirect - gives session time to settle after login
  const [sessionChecked, setSessionChecked] = useState(false);
  const sessionCheckTimerRef = useRef(null);

  // Get current user from Convex Auth
  const currentUser = useQuery(api.userSync.getCurrentUser);

  // Wait for session to settle before allowing redirects
  // This prevents race conditions after login where session might not be immediately available
  useEffect(() => {
    if (isPending) {
      // Still loading, don't do anything yet
      return;
    }

    // If we're authenticated, mark as checked immediately
    if (isAuthenticated && currentUser) {
      setSessionChecked(true);
      if (sessionCheckTimerRef.current) {
        clearTimeout(sessionCheckTimerRef.current);
        sessionCheckTimerRef.current = null;
      }
      return;
    }

    // No session yet - wait a moment before redirecting (session might still be settling)
    if (!sessionChecked && !sessionCheckTimerRef.current) {
      console.log('[AdminPage] Session not found, waiting 1.5s before redirect...');
      sessionCheckTimerRef.current = setTimeout(() => {
        console.log('[AdminPage] Session still not found after wait, redirecting to login');
        setSessionChecked(true);
      }, 1500);
    }

    return () => {
      if (sessionCheckTimerRef.current) {
        clearTimeout(sessionCheckTimerRef.current);
      }
    };
  }, [isAuthenticated, currentUser, isPending, sessionChecked]);

  useEffect(() => {
    // Don't redirect while session is loading or hasn't been checked
    if (isPending || !sessionChecked) {
      return;
    }

    // If not logged in, redirect to login page
    if (!isAuthenticated || !currentUser) {
      navigate('/login');
      return;
    }

    // If logged in but haven't completed onboarding, redirect to onboarding
    if (currentUser && !currentUser.onboardingCompleted) {
      navigate('/onboarding');
      return;
    }

    // Check subscription status - only allow active, trial, and lifetime users
    if (currentUser && currentUser.email) {
      const validStatuses = ['active', 'trial', 'lifetime'];

      // For trial users, check if trial has expired
      if (currentUser.subscriptionStatus === 'trial') {
        const trialEndDate = (currentUser.createdAt || Date.now()) + (7 * 24 * 60 * 60 * 1000);
        if (Date.now() > trialEndDate) {
          logAccessDenied({
            email: currentUser.email,
            reason: 'Trial expired',
            subscriptionStatus: 'trial',
          });
          navigate('/upgrade?trial_expired=true');
          return;
        }
      }

      // Block users with invalid subscription status
      if (!validStatuses.includes(currentUser.subscriptionStatus)) {
        logAccessDenied({
          email: currentUser.email,
          reason: `Invalid subscription status: ${currentUser.subscriptionStatus}`,
          subscriptionStatus: currentUser.subscriptionStatus,
        });
        navigate('/upgrade?subscription_required=true');
        return;
      }
    }
  }, [isAuthenticated, currentUser, isPending, sessionChecked, navigate, logAccessDenied]);

  // Show loading while checking auth (either still pending or waiting for session to settle)
  if (isPending || !sessionChecked || !isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut();
    // In native app, go to app landing page; on web, go to login
    const isNativeApp = /SafeTunesApp/.test(navigator.userAgent) || window.isInSafeTunesApp;
    navigate(isNativeApp ? '/app' : '/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <AdminDashboard user={currentUser} onLogout={handleLogout} />
    </div>
  );
}

export default AdminPage;

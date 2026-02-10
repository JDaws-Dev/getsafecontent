import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useConvexAuth } from 'convex/react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { SplashScreen } from '../components/SplashScreen';

export default function AppLandingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading: sessionLoading } = useConvexAuth();
  const currentUser = useQuery(api.userSync.getCurrentUser);
  const [hasRedirected, setHasRedirected] = useState(false);

  // Skip splash if:
  // 1. URL has skip=1 param (navigating back from another page)
  // 2. sessionStorage flag is set (already shown this session)
  // 3. There's navigation history (user came from another page in the app)
  const skipSplash = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const hasSkipParam = searchParams.get('skip') === '1';
    const hasSessionFlag = sessionStorage.getItem('safetunes_splash_shown') === 'true';
    // Check if there's referrer from same origin (internal navigation)
    const isInternalNavigation = document.referrer && document.referrer.includes(window.location.host);
    return hasSkipParam || hasSessionFlag || isInternalNavigation;
  }, [searchParams]);

  const [splashMinTimeElapsed, setSplashMinTimeElapsed] = useState(skipSplash);

  // Check for existing kid session in localStorage
  const getKidSession = () => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem('safetunes_kid_session');
      if (stored) {
        const kidData = JSON.parse(stored);
        if (kidData?.odProfileId || kidData?.kidName) {
          return kidData;
        }
      }
    } catch (e) {
      localStorage.removeItem('safetunes_kid_session');
    }
    return null;
  };

  // Set minimum splash display time (skip if already shown this session)
  useEffect(() => {
    if (skipSplash) {
      setSplashMinTimeElapsed(true);
      return;
    }
    const timer = setTimeout(() => {
      setSplashMinTimeElapsed(true);
      // Mark splash as shown so we skip it on subsequent visits
      sessionStorage.setItem('safetunes_splash_shown', 'true');
    }, 2500);
    return () => clearTimeout(timer);
  }, [skipSplash]);

  // Auto-redirect if already logged in (once session check completes)
  useEffect(() => {
    // Wait for session check to complete AND minimum splash time
    if (sessionLoading || !splashMinTimeElapsed || hasRedirected) {
      console.log('[AppLanding] Waiting...', { sessionLoading, splashMinTimeElapsed, hasRedirected });
      return;
    }

    const kidSession = getKidSession();
    console.log('[AppLanding] Auth check complete:', {
      isAuthenticated,
      currentUserEmail: currentUser?.email,
      kidSession: !!kidSession,
      kidName: kidSession?.kidName
    });

    // Parent takes priority - if parent is logged in, go to admin
    if (isAuthenticated && currentUser) {
      console.log('[AppLanding] Redirecting to admin (parent logged in)');
      setHasRedirected(true);
      navigate('/admin', { replace: true });
      return;
    }

    // If kid is logged in (but not parent), go to player
    if (kidSession) {
      console.log('[AppLanding] Redirecting to player (kid logged in)');
      setHasRedirected(true);
      navigate('/player', { replace: true });
      return;
    }

    console.log('[AppLanding] No session found, showing login options');
    // Not logged in - splash will dismiss naturally
  }, [isAuthenticated, currentUser, sessionLoading, splashMinTimeElapsed, hasRedirected, navigate]);

  // Determine if we should show splash
  // Show splash until: min time elapsed AND session check done AND no redirect happening
  const showSplash = !splashMinTimeElapsed || sessionLoading || hasRedirected;

  if (showSplash) {
    return <SplashScreen minDuration={2500} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 88.994 96.651">
            <path d="M44.516,0v47.835c-.628.592-1.894-.232-2.774-.408-10.205-2.043-21.424,7.753-16.888,18.082,5.228,11.906,24.562,7.626,26.602-4.966.158-12.344.543-24.817.231-37.18-.01-.404-.181-.761-.194-1.16.138-.314.351-.336.66-.321.458.023,2.31.729,2.842.955,4.05,1.723,9.412,6.762,9.412,11.473v4.972c0,.135-.441.687-.1.894,1.809-2.076,3.087-4.729,3.459-7.48,1.916-14.144-14.809-18.642-16.24-30.063-.068-.546-.203-1.066.494-.894,11.509,2.848,22.868,6.412,34.333,9.432,1.504.879,2.371,2.06,2.527,3.837-.747,15.337,2.184,31.696-3.436,46.306-5.899,15.337-19.374,26.415-34.03,33-1.43.642-4.278,1.969-5.692,2.264-2.548.531-7.594-1.962-10.028-3.123C16.659,84.376,1.212,67.91.153,45.855c-.49-10.206.391-20.798,0-31.045.116-1.814,1.557-3.391,3.234-3.926L43.071.047l1.445-.047Z"/>
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white">SafeTunes</h1>
        <p className="text-gray-400 mt-2">Safe music for your family</p>
      </div>

      {/* Login Options */}
      <div className="w-full max-w-sm space-y-4">
        {/* Parent Login */}
        <Link
          to="/login"
          className="block w-full bg-purple-600 hover:bg-purple-700 text-white py-4 px-6 rounded-xl font-semibold text-center text-lg transition shadow-lg"
        >
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl">👤</span>
            <span>Parent Login</span>
          </div>
        </Link>

        {/* Kid Login */}
        <Link
          to="/child-login"
          className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-xl font-semibold text-center text-lg transition shadow-lg"
        >
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl">🎧</span>
            <span>Kid Login</span>
          </div>
        </Link>
      </div>

      {/* Sign Up Link */}
      <div className="mt-8 text-center">
        <p className="text-gray-400">
          Don't have an account?{' '}
          <Link to="/signup" className="text-purple-400 hover:text-purple-300 font-semibold">
            Sign Up
          </Link>
        </p>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center">
        <p className="text-gray-500 text-sm">
          <Link to="/privacy" className="hover:text-gray-400">Privacy</Link>
          {' · '}
          <Link to="/terms" className="hover:text-gray-400">Terms</Link>
          {' · '}
          <Link to="/support" className="hover:text-gray-400">Support</Link>
        </p>
      </div>
    </div>
  );
}

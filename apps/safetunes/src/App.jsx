import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConvexReactClient } from 'convex/react';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { ErrorBoundary } from '@sentry/react';
import { ToastProvider } from './contexts/ToastContext';
import { FacebookPixel } from './components/analytics/FacebookPixel';
import { GoogleAds } from './components/analytics/GoogleAds';
import { CookieConsent } from './components/legal/CookieConsent';

// Critical pages - load immediately for fast initial render
import LandingPageSimple from './pages/LandingPageSimple';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';

// Lazy-loaded pages - loaded on demand to reduce initial bundle
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AppLandingPage = lazy(() => import('./pages/AppLandingPage'));
const ChildLoginPage = lazy(() => import('./pages/ChildLoginPage'));
const PlayerPage = lazy(() => import('./pages/PlayerPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const ComponentPreview = lazy(() => import('./pages/ComponentPreview'));
const UpgradePage = lazy(() => import('./pages/UpgradePage'));
const FoundBadMusicPage = lazy(() => import('./pages/FoundBadMusicPage'));
const KidPlayerPreview = lazy(() => import('./pages/KidPlayerPreview'));
const KidTabsPreview = lazy(() => import('./pages/KidTabsPreview'));
const SplashPreview = lazy(() => import('./pages/SplashPreview'));
const DeleteAccountPage = lazy(() => import('./pages/DeleteAccountPage'));

// Loading spinner for lazy-loaded routes
function PageLoader() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

// Error Fallback Component
// Check if running in native iOS app or Android TWA
function checkIsNativeApp() {
  if (typeof window === 'undefined') return false;
  // iOS app detection
  if (window.isSafeTunesApp === true ||
      window.isInSafeTunesApp === true ||
      /SafeTunesApp/.test(navigator.userAgent)) {
    return true;
  }
  // Android TWA detection - runs in standalone mode without browser UI
  if (window.matchMedia('(display-mode: standalone)').matches && /Android/.test(navigator.userAgent)) {
    return true;
  }
  return false;
}

function ErrorFallback({ error, resetError }) {
  const isNativeApp = checkIsNativeApp();

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-gray-600 mb-6">
          We're sorry, but something unexpected happened. Our team has been notified and we're working to fix it.
        </p>
        <button
          onClick={() => window.location.href = isNativeApp ? '/app' : '/'}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition mb-3"
        >
          {isNativeApp ? 'Go Back' : 'Go to Homepage'}
        </button>
        <button
          onClick={resetError}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold transition"
        >
          Try Again
        </button>
        {import.meta.env.DEV && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-500">Technical Details</summary>
            <pre className="mt-2 text-xs bg-gray-50 p-3 rounded overflow-auto">
              {error.toString()}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary
      fallback={ErrorFallback}
      showDialog={false}
    >
      <ConvexAuthProvider client={convex}>
        <ToastProvider>
          <Router>
            <FacebookPixel />
            <GoogleAds />
            <CookieConsent />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Critical paths - not lazy loaded */}
                <Route path="/" element={checkIsNativeApp() ? <Navigate to="/app" replace /> : <LandingPageSimple />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/login" element={<LoginPage />} />
                {/* Lazy-loaded routes */}
                <Route path="/app" element={<AppLandingPage />} />
                <Route path="/landing-old" element={<LandingPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/child-login" element={<ChildLoginPage />} />
                <Route path="/play" element={<ChildLoginPage />} />
                <Route path="/kids" element={<ChildLoginPage />} />
                <Route path="/player" element={<PlayerPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/support" element={<SupportPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/preview" element={<ComponentPreview />} />
                <Route path="/preview/kid-player" element={<KidPlayerPreview />} />
                <Route path="/preview/kid-tabs" element={<KidTabsPreview />} />
                <Route path="/preview/splash" element={<SplashPreview />} />
                <Route path="/upgrade" element={<UpgradePage />} />
                <Route path="/found-bad-music" element={<FoundBadMusicPage />} />
                <Route path="/delete-account" element={<DeleteAccountPage />} />
              </Routes>
            </Suspense>
          </Router>
        </ToastProvider>
      </ConvexAuthProvider>
    </ErrorBoundary>
  );
}

export default App;

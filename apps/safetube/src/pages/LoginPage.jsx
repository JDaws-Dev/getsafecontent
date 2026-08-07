import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';
import { useHaptic } from '../hooks/useHaptic';
import UpgradePrompt from '../components/UpgradePrompt';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user: centralUser, isAuthenticated, isLoading: isPending, login, loginWithGoogle, requestPasswordReset } = useAuth();
  const haptic = useHaptic();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // Upgrade prompt state
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeUser, setUpgradeUser] = useState(null);

  // Password reset for migrated users
  const [showPasswordResetPrompt, setShowPasswordResetPrompt] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);

  // Get local SafeTube user data by email
  const localUser = useQuery(
    api.userSync.getSafeTubeUserByEmail,
    centralUser?.email ? { email: centralUser.email } : "skip"
  );
  const currentUser = localUser;

  // Redirect to admin or onboarding if already logged in
  useEffect(() => {
    if (isAuthenticated && currentUser && !isPending) {
      // If onboarding not completed, go to onboarding
      if (currentUser.onboardingCompleted === false) {
        navigate('/onboarding');
      } else {
        navigate('/admin');
      }
    }
  }, [isAuthenticated, currentUser, isPending, navigate]);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Refs for accessibility - focus management on errors
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const errorRef = useRef(null);

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('safetube_remembered_email');
    if (rememberedEmail) {
      setFormData(prev => ({
        ...prev,
        email: rememberedEmail,
      }));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    haptic.light(); // Light tap on submit
    setError('');
    setLoading(true);

    try {
      // Use central JWT auth
      const result = await login(formData.email, formData.password);

      console.log('[LoginPage] Login result:', result);

      if (!result.success) {
        haptic.error();

        // Handle specific error codes
        if (result.code === 'NOT_ENTITLED') {
          // User exists but doesn't have SafeTube - show upgrade prompt
          console.log('[LoginPage] User not entitled to SafeTube, showing upgrade prompt');
          haptic.light();
          setUpgradeUser(result.user);
          setShowUpgradePrompt(true);
          setLoading(false);
          return;
        }

        // Generic error
        setError(result.error || 'Invalid email or password. Please try again.');
        emailInputRef.current?.focus();
        setLoading(false);
        return;
      }

      // Always save email for convenience
      localStorage.setItem('safetube_remembered_email', formData.email);

      haptic.success(); // Success feedback
      // Login succeeded - navigate to admin (or onboarding will redirect if needed)
      navigate('/admin');
    } catch (err) {
      console.error('[LoginPage] Login error:', err);
      haptic.error(); // Error feedback
      setError('Login failed. Please try again.');
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setLoading(false);
    }
  };

  // Handle Google sign-in - redirects to Marketing OAuth
  const handleGoogleSignIn = () => {
    haptic.light();
    setGoogleLoading(true);
    setError('');
    loginWithGoogle();
  };

  // Handle sending password reset email (uses central auth)
  const handleSendResetEmail = async () => {
    setSendingResetEmail(true);
    try {
      const result = await requestPasswordReset(formData.email);
      if (result.success) {
        setResetEmailSent(true);
        localStorage.setItem('safetube_reset_email', formData.email);
        haptic.success();
      } else {
        // Still show success for security (don't reveal if email exists)
        setResetEmailSent(true);
        localStorage.setItem('safetube_reset_email', formData.email);
      }
    } catch (err) {
      console.error('[LoginPage] Password reset error:', err);
      // Still show success for security (don't reveal if email exists)
      setResetEmailSent(true);
      localStorage.setItem('safetube_reset_email', formData.email);
    } finally {
      setSendingResetEmail(false);
    }
  };

  // Show password reset prompt for migrated users
  if (showPasswordResetPrompt) {
    return (
      <div className="min-h-screen bg-brand-cream flex flex-col">
        <header className="px-6 py-4">
          <Link to="/" className="flex items-center gap-2 w-fit">
            <div className="w-10 h-10 bg-accent-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">SafeTube</span>
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            {!resetEmailSent ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    We've Upgraded Our Login System
                  </h1>
                  <p className="text-gray-600">
                    For security, please set a new password to continue using SafeTube.
                    This is a one-time process.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-6">
                  <p className="text-sm">
                    <strong>Your email:</strong> {formData.email}
                  </p>
                </div>

                <button
                  onClick={handleSendResetEmail}
                  disabled={sendingResetEmail}
                  className="w-full min-h-[48px] bg-accent-500 hover:bg-accent-600 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed mb-3"
                >
                  {sendingResetEmail ? 'Sending...' : 'Send Password Reset Email'}
                </button>

                <button
                  onClick={() => {
                    setShowPasswordResetPrompt(false);
                    setFormData(prev => ({ ...prev, password: '' }));
                  }}
                  className="w-full text-gray-600 hover:text-gray-900 text-sm"
                >
                  ← Back to login
                </button>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Check Your Email
                  </h1>
                  <p className="text-gray-600 mb-4">
                    We've sent a 6-digit reset code to <strong>{formData.email}</strong>.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-6 text-sm">
                  <p>
                    <strong>Next Steps:</strong> Check your inbox for an email from SafeTube.
                    The code expires in 1 hour.
                  </p>
                </div>

                <Link
                  to="/reset-password"
                  className="block w-full min-h-[48px] bg-accent-500 hover:bg-accent-600 text-white py-3 rounded-lg font-semibold text-center transition mb-3"
                >
                  Enter Reset Code
                </Link>

                <button
                  onClick={() => setResetEmailSent(false)}
                  className="w-full text-accent-600 hover:text-accent-700 text-sm"
                >
                  Didn't receive it? Try again
                </button>
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Show upgrade prompt if user is verified but not entitled to SafeTube
  if (showUpgradePrompt && upgradeUser) {
    return (
      <UpgradePrompt
        user={upgradeUser}
        onLogout={() => {
          setUpgradeUser(null);
          setShowUpgradePrompt(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col">
      {/* Header */}
      <header className="px-6 py-4">
        <Link to="/" className="flex items-center gap-2 w-fit">
          <div className="w-10 h-10 bg-accent-500 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900">SafeTube</span>
        </Link>
      </header>

      {/* Login Form */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md min-w-0 bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">Welcome back</h1>
          <p className="text-gray-500 text-center mb-8">Sign in to continue to SafeTube</p>

          {error && (
            <div
              ref={errorRef}
              role="alert"
              aria-live="assertive"
              id="form-error"
              className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6"
            >
              {error}
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full min-h-[48px] flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {googleLoading ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            {googleLoading ? 'Signing in...' : 'Continue with Google'}
          </button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" aria-busy={loading}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                ref={emailInputRef}
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? 'form-error' : undefined}
                className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link
                to="/forgot-password"
                className="text-sm text-accent-600 hover:text-accent-700"
              >
                Forgot password?
              </Link>
              </div>
              <input
                ref={passwordInputRef}
                id="password"
                type="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? 'form-error' : undefined}
                className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="btn-brand w-full min-h-[48px] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-accent-600 hover:text-accent-700 font-medium">
              Start free trial
            </Link>
          </p>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-center text-gray-500 text-sm">
              Are you a kid?{' '}
              <Link to="/play" className="text-accent-600 hover:text-accent-700">
                Go to player →
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

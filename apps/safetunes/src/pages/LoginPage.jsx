import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useAction } from 'convex/react';
import { useConvexAuth } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../convex/_generated/api';
import { useIsNativeApp } from '../hooks/useIsNativeApp';
import { useHaptic } from '../hooks/useHaptic';
import UpgradePrompt from '../components/UpgradePrompt';

function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isPending } = useConvexAuth();
  const { signIn } = useAuthActions();
  const isNativeApp = useIsNativeApp();
  const haptic = useHaptic();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // Central auth integration
  const verifyCentralAuth = useAction(api.centralAuth.verifyCentralCredentialsAndProvision);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [centralUser, setCentralUser] = useState(null);

  // Password reset for migrated users
  const [showPasswordResetPrompt, setShowPasswordResetPrompt] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);

  // Get current user from Convex Auth
  const currentUser = useQuery(api.userSync.getCurrentUser);

  // Redirect to admin or onboarding if already logged in
  useEffect(() => {
    if (isAuthenticated && currentUser && !isPending) {
      // If onboarding not completed, go to onboarding
      if (!currentUser.onboardingCompleted) {
        navigate('/onboarding');
      } else {
        navigate('/admin');
      }
    }
  }, [isAuthenticated, currentUser, isPending, navigate]);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  // Refs for accessibility - focus management on errors
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const errorRef = useRef(null);

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('safetunes_remembered_email');
    if (rememberedEmail) {
      setFormData(prev => ({
        ...prev,
        email: rememberedEmail,
        rememberMe: true
      }));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    haptic.light(); // Light tap on submit
    setLoading(true);
    setError('');

    try {
      // Step 1: Verify against central auth first
      // This checks credentials, entitlement, and provisions user locally if needed
      const centralResult = await verifyCentralAuth({
        email: formData.email,
        password: formData.password,
      });

      console.log('[LoginPage] Central auth result:', centralResult);

      if (!centralResult.success) {
        // Central auth returned an error
        haptic.error();
        if (centralResult.errorCode === 'RATE_LIMITED') {
          setError(centralResult.error);
        } else if (centralResult.errorCode === 'PASSWORD_RESET_REQUIRED') {
          // User was migrated from old auth system - show password reset prompt
          setShowPasswordResetPrompt(true);
          setLoading(false);
          return;
        } else {
          setError('Invalid email or password. Please try again.');
        }
        emailInputRef.current?.focus();
        setLoading(false);
        return;
      }

      // Step 2: Check entitlement
      if (!centralResult.entitled) {
        // User exists but doesn't have SafeTunes - show upgrade prompt
        console.log('[LoginPage] User not entitled to SafeTunes, showing upgrade prompt');
        haptic.light();
        setCentralUser(centralResult.user);
        setShowUpgradePrompt(true);
        setLoading(false);
        return;
      }

      // Step 3: User is verified and entitled - complete Convex Auth login
      // The central auth action already provisioned the user (created authAccounts entry)
      // Now we just need to create the session via Convex Auth
      await signIn('password', {
        email: formData.email,
        password: formData.password,
        flow: 'signIn',
      });

      // Always save email for convenience
      localStorage.setItem('safetunes_remembered_email', formData.email);

      haptic.success(); // Success feedback
      // Login succeeded - navigate to admin (or onboarding will redirect if needed)
      navigate('/admin');
    } catch (err) {
      console.error('[LoginPage] Login error:', err);
      haptic.error(); // Error feedback
      // Provide user-friendly error messages
      const errorMessage = err?.message || '';
      if (errorMessage.includes('Invalid') || errorMessage.includes('credentials') || errorMessage.includes('password') || errorMessage.includes('Could not verify')) {
        setError('Invalid email or password. Please try again.');
        emailInputRef.current?.focus();
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else if (errorMessage.includes('timeout')) {
        setError('Request timed out. Please try again.');
      } else {
        setError('Login failed. Please try again.');
      }
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    haptic.light(); // Light tap on Google button
    setGoogleLoading(true);
    setError('');

    try {
      await signIn('google', { redirectTo: '/admin' });
    } catch (err) {
      console.error('[LoginPage] Google login error:', err);
      haptic.error();
      setError('Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  // Handle sending password reset email
  const handleSendResetEmail = async () => {
    setSendingResetEmail(true);
    try {
      // Trigger password reset flow via Convex Auth
      await signIn('password', {
        email: formData.email,
        flow: 'reset',
      });
      setResetEmailSent(true);
      localStorage.setItem('safetunes_reset_email', formData.email);
      haptic.success();
    } catch (err) {
      console.error('[LoginPage] Password reset error:', err);
      // Still show success for security (don't reveal if email exists)
      setResetEmailSent(true);
      localStorage.setItem('safetunes_reset_email', formData.email);
    } finally {
      setSendingResetEmail(false);
    }
  };

  // Show password reset prompt for migrated users
  if (showPasswordResetPrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
        <header className="container mx-auto px-6 py-6">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 88.994 96.651">
                <path d="M44.516,0v47.835c-.628.592-1.894-.232-2.774-.408-10.205-2.043-21.424,7.753-16.888,18.082,5.228,11.906,24.562,7.626,26.602-4.966.158-12.344.543-24.817.231-37.18-.01-.404-.181-.761-.194-1.16.138-.314.351-.336.66-.321.458.023,2.31.729,2.842.955,4.05,1.723,9.412,6.762,9.412,11.473v4.972c0,.135-.441.687-.1.894,1.809-2.076,3.087-4.729,3.459-7.48,1.916-14.144-14.809-18.642-16.24-30.063-.068-.546-.203-1.066.494-.894,11.509,2.848,22.868,6.412,34.333,9.432,1.504.879,2.371,2.06,2.527,3.837-.747,15.337,2.184,31.696-3.436,46.306-5.899,15.337-19.374,26.415-34.03,33-1.43.642-4.278,1.969-5.692,2.264-2.548.531-7.594-1.962-10.028-3.123C16.659,84.376,1.212,67.91.153,45.855c-.49-10.206.391-20.798,0-31.045.116-1.814,1.557-3.391,3.234-3.926L43.071.047l1.445-.047Z"/>
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900">SafeTunes</span>
          </Link>
        </header>

        <div className="container mx-auto px-6 py-12">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8">
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
                      For security, please set a new password to continue using SafeTunes.
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
                    className="w-full min-h-[48px] bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed mb-3"
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
                      <strong>Next Steps:</strong> Check your inbox for an email from SafeTunes.
                      The code expires in 1 hour.
                    </p>
                  </div>

                  <Link
                    to="/reset-password"
                    className="block w-full min-h-[48px] bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold text-center transition mb-3"
                  >
                    Enter Reset Code
                  </Link>

                  <button
                    onClick={() => setResetEmailSent(false)}
                    className="w-full text-purple-600 hover:text-purple-700 text-sm"
                  >
                    Didn't receive it? Try again
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show upgrade prompt if user is verified but not entitled to SafeTunes
  if (showUpgradePrompt && centralUser) {
    return (
      <UpgradePrompt
        user={centralUser}
        onLogout={() => {
          setCentralUser(null);
          setShowUpgradePrompt(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-6 py-6">
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 88.994 96.651">
              <path d="M44.516,0v47.835c-.628.592-1.894-.232-2.774-.408-10.205-2.043-21.424,7.753-16.888,18.082,5.228,11.906,24.562,7.626,26.602-4.966.158-12.344.543-24.817.231-37.18-.01-.404-.181-.761-.194-1.16.138-.314.351-.336.66-.321.458.023,2.31.729,2.842.955,4.05,1.723,9.412,6.762,9.412,11.473v4.972c0,.135-.441.687-.1.894,1.809-2.076,3.087-4.729,3.459-7.48,1.916-14.144-14.809-18.642-16.24-30.063-.068-.546-.203-1.066.494-.894,11.509,2.848,22.868,6.412,34.333,9.432,1.504.879,2.371,2.06,2.527,3.837-.747,15.337,2.184,31.696-3.436,46.306-5.899,15.337-19.374,26.415-34.03,33-1.43.642-4.278,1.969-5.692,2.264-2.548.531-7.594-1.962-10.028-3.123C16.659,84.376,1.212,67.91.153,45.855c-.49-10.206.391-20.798,0-31.045.116-1.814,1.557-3.391,3.234-3.926L43.071.047l1.445-.047Z"/>
            </svg>
          </div>
          <span className="text-2xl font-bold text-gray-900">SafeTunes</span>
        </Link>
      </header>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-md min-w-0 mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back
              </h1>
              <p className="text-gray-600">
                Sign in to continue to SafeTunes
              </p>
            </div>

            {error && (
              <div
                ref={errorRef}
                role="alert"
                aria-live="assertive"
                id="form-error"
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6"
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
                  Email Address
                </label>
                <input
                  ref={emailInputRef}
                  type="email"
                  id="email"
                  name="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  aria-invalid={error ? 'true' : undefined}
                  aria-describedby={error ? 'form-error' : undefined}
                  className="w-full min-h-[44px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-sm text-purple-600 hover:text-purple-700">
                    Forgot password?
                  </Link>
                </div>
                <input
                  ref={passwordInputRef}
                  type="password"
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  aria-invalid={error ? 'true' : undefined}
                  aria-describedby={error ? 'form-error' : undefined}
                  className="w-full min-h-[44px] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="Enter your password"
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

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don&apos;t have an account?{' '}
                <Link to="/signup" className="text-purple-600 hover:text-purple-700 font-medium">
                  Start free trial
                </Link>
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <Link
                to="/child-login"
                className="flex items-center justify-center text-gray-600 hover:text-gray-900 transition"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Kid? Click here to log in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

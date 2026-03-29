import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Search } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isPending, login, loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && !isPending) {
      navigate('/admin');
    }
  }, [isAuthenticated, isPending, navigate]);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const emailInputRef = useRef(null);
  const errorRef = useRef(null);

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('safeseek_remembered_email');
    if (rememberedEmail) {
      setFormData(prev => ({ ...prev, email: rememberedEmail }));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);

      if (!result.success) {
        if (result.code === 'NOT_ENTITLED') {
          setError('Your account does not include SafeSeek. Visit getsafefamily.com to upgrade your plan.');
          setLoading(false);
          return;
        }

        setError(result.error || 'Invalid email or password. Please try again.');
        emailInputRef.current?.focus();
        setLoading(false);
        return;
      }

      localStorage.setItem('safeseek_remembered_email', formData.email);
      navigate('/admin');
    } catch (err) {
      console.error('[LoginPage] Login error:', err);
      setError('Login failed. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setGoogleLoading(true);
    setError('');
    loginWithGoogle();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4">
        <Link to="/" className="flex items-center gap-2 w-fit">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <Search className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900">SafeSeek</span>
        </Link>
      </header>

      {/* Login Form */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md min-w-0 bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">Welcome back</h1>
          <p className="text-gray-500 text-center mb-8">Sign in to manage SafeSeek</p>

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

          {/* Google Sign In */}
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
                className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? 'form-error' : undefined}
                className="w-full min-h-[44px] bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
              Start free trial
            </Link>
          </p>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-center text-gray-500 text-sm">
              Are you a kid?{' '}
              <Link to="/search" className="text-blue-600 hover:text-blue-700">
                Go to search &rarr;
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
